"""Build installed PC character progression data and execute its original lookup path."""

from __future__ import annotations

import ctypes as C
import argparse
import hashlib
import json
import math
from pathlib import Path

from runtime_oracle import Oracle, ROOT


PRIVATE = ROOT / "research" / "observations" / "current-res150-build51" / "modules"
CATALOG = ROOT / "research" / "external" / "skeydb" / "awakeners.json"
OUTPUT = ROOT / "research" / "evidence" / "client-build-data-res150.json"
REPORT = ROOT / "research" / "evidence" / "pc-res150-primary-stat-lookup.json"
BUILD_EVIDENCE = ROOT / "research" / "evidence" / "pc-awake-card-command-audit.json"
BUILD = "pc-res150-build51"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def rows(value):
    if isinstance(value, list):
        return [(str(index), item) for index, item in enumerate(value, 1)]
    if isinstance(value, dict):
        return list(value.items())
    raise ValueError("Expected a Lua-list or table object")


def indexed(value):
    return {str(key): item for key, item in rows(value)}


def verify_installed_modules(download: Path, expected: tuple[str, ...]) -> None:
    import UnityPy

    key = ROOT / "research" / "raw" / "bundle-key.bin"
    UnityPy.set_assetbundle_decrypt_key(key.read_bytes())
    found = {name: [] for name in expected}
    for bundle_name in ("config.ab", "gamescript.ab"):
        for obj in UnityPy.load(str(download / bundle_name)).objects:
            if obj.type.name != "TextAsset":
                continue
            value = obj.read()
            name = value.m_Name
            if not name.endswith(".lua") or name[:-4] not in found:
                continue
            payload = value.m_Script.encode("utf-8", "surrogateescape") if isinstance(value.m_Script, str) else bytes(value.m_Script)
            found[name[:-4]].append(payload)
    for name, matches in found.items():
        if len(matches) != 1 or matches[0] != (PRIVATE / f"{name}.lua").read_bytes():
            raise ValueError(f"Private progression module does not uniquely match installed TextAsset: {name}")


class CurrentPrimaryLookupOracle(Oracle):
    def __init__(self, constants):
        super().__init__()
        state = self.state
        self.callbacks, self.errors = [], []
        self.kind = self.lib.lua_type
        self.kind.argtypes, self.kind.restype = [C.c_void_p, C.c_int], C.c_int
        self.integer = self.lib.lua_pushinteger
        self.integer.argtypes, self.integer.restype = [C.c_void_p, C.c_longlong], None
        self.nil = self.lib.lua_pushnil
        self.nil.argtypes, self.nil.restype = [C.c_void_p], None
        self.module("FuncTable", {"output": str((PRIVATE / "FuncTable.lua").relative_to(ROOT))})
        self.setglobal(state, b"_primary_formulas")
        self.table(state, 0, 0)
        self.setglobal(state, b"CommonDefine")
        self.table(state, 0, 1)

        def identity(value_state):
            self.pushvalue(value_state, 1)
            return 1

        self.callback(identity)
        self.setfield(state, -2, b"NewEnum")
        self.setglobal(state, b"System")
        self.table(state, 0, 5)
        for name in ("AwakerConfig", "AwakerUpgrade", "AwakerTalent"):
            self.module(name, {"output": str((PRIVATE / f"{name}.lua").relative_to(ROOT))})
            self.setfield(state, -2, name.encode())

        def constant(value_state):
            key = self.string(value_state, 1, None).decode()
            try:
                data = indexed(constants[key]["Data"])
                value = data["1"]
                if not isinstance(value, (int, float)) or isinstance(value, bool):
                    raise ValueError("Nonnumeric constant " + key)
                (self.integer if isinstance(value, int) else self.number)(value_state, value)
                return 1
            except Exception as error:
                self.errors.append(str(error))
                self.nil(value_state)
                return 1

        self.callback(constant)
        self.setfield(state, -2, b"GetConstant")
        self.setglobal(state, b"DT")
        self.table(state, 0, 1)

        def getfunc(value_state):
            key = self.string(value_state, 1, None)
            if key is None:
                self.errors.append("Missing formula key")
                self.nil(value_state)
                return 1
            self.getglobal(value_state, b"_primary_formulas")
            self.getfield(value_state, -1, key)
            if self.kind(value_state, -1) != 6:
                self.errors.append("Unknown compiled expression " + repr(key))
            return 1

        self.callback(getfunc)
        self.setfield(state, -2, b"GetFunc")
        self.setglobal(state, b"LoadFuncUtils")
        self.table(state, 0, 2)

        def log(_state):
            self.errors.append("Original reader logged an error")
            return 0

        for name in (b"Info", b"Error"):
            self.callback(log)
            self.setfield(state, -2, name)
        self.setglobal(state, b"Logger")
        self.module("AwakerDataUtils", {"output": str((PRIVATE / "AwakerDataUtils.lua").relative_to(ROOT))})
        self.setglobal(state, b"_primary_reader")
        if self.errors:
            raise RuntimeError(self.errors)

    def callback(self, function):
        wrapped = C.CFUNCTYPE(C.c_int, C.c_void_p)(function)
        self.callbacks.append(wrapped)
        self.pushclosure(self.state, wrapped, 0)

    def lookup(self, character, level, stat, talent, rank):
        state = self.state
        self.top(state, 0)
        self.getglobal(state, b"_primary_reader")
        self.getfield(state, -1, b"GetAwakerBaseAttrValue")
        self.integer(state, character)
        self.integer(state, level)
        push = self.lib.lua_pushstring
        push.argtypes, push.restype = [C.c_void_p, C.c_char_p], C.c_void_p
        push(state, stat.encode())
        self.integer(state, talent)
        self.integer(state, rank)
        self.check(self.call(state, 5, 1, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)
        if self.kind(state, -1) != 3:
            raise ValueError("Nonnumeric original stat")
        return self.tonumber(state, -1, None)


def promotion_talents(client_id, talents, attr_types):
    stat_names = {"physique_per": "CON", "atk_per": "ATK", "def_per": "DEF"}
    result = []
    for talent_id, group in talents.items():
        levels = indexed(group.get("data_list", {}))
        first = levels.get("1")
        if not first or first.get("AwakerID") != client_id or not first.get("Season"):
            continue
        output, supported = {}, True
        for level_text, row in levels.items():
            slot = next((index for index in (1, 2) if row.get(f"TalentType{index}") == "Attr_Promote"), None)
            if slot is None:
                continue
            values = indexed(row.get(f"TalentEffect{slot}", {}))
            ordered = [values[str(index)] for index in range(1, len(values) + 1)]
            if len(ordered) % 2:
                raise ValueError(f"Odd Attr_Promote vector for talent {talent_id}")
            promoted = {}
            for index in range(0, len(ordered), 2):
                attr = attr_types[str(ordered[index])]
                if attr.get("Name") not in stat_names or not attr.get("Percentage") or not isinstance(ordered[index + 1], (int, float)):
                    supported = False
                    break
                promoted[stat_names[attr["Name"]]] = ordered[index + 1]
            if not supported or set(promoted) != {"CON", "ATK", "DEF"}:
                supported = False
                break
            output[level_text] = promoted
        if supported and output:
            result.append({"clientTalentId": int(talent_id), "season": first["Season"], "maximumLevel": max(map(int, output)), "percentByLevel": {"0": {"CON": 0, "ATK": 0, "DEF": 0}, **output}})
    return sorted(result, key=lambda item: item["clientTalentId"])


def main() -> None:
    global PRIVATE, OUTPUT, REPORT, BUILD
    parser = argparse.ArgumentParser()
    parser.add_argument("--build", choices=("pc-res150-build51", "pc-res151-build51"), default=BUILD)
    parser.add_argument("--install-root", type=Path)
    args = parser.parse_args()
    BUILD = args.build
    if BUILD == "pc-res151-build51":
        PRIVATE = ROOT / "research" / "observations" / "current-res151-build51" / "modules"
        OUTPUT = ROOT / "research" / "evidence" / "client-build-data-res151.json"
        REPORT = ROOT / "research" / "evidence" / "pc-res151-primary-stat-lookup.json"
        if args.install_root is None:
            parser.error("--install-root is required for the installed resource-151 build")
    required = ("AwakerConfig", "AwakerTalent", "ActorAttrType", "AwakerUpgrade", "Constant")
    for name in (*required, "FuncTable", "AwakerDataUtils", "AttrUtils"):
        if not (PRIVATE / f"{name}.lua").is_file():
            raise FileNotFoundError(PRIVATE / f"{name}.lua")
    characters, talents, attr_types, upgrades, constants = (read(PRIVATE / f"{name}.json") for name in required)
    if len(upgrades) != 90:
        raise ValueError("Expected all 90 installed upgrade rows")
    catalog = read(CATALOG)
    if BUILD == "pc-res151-build51":
        build_evidence_path = ROOT / "research" / "evidence" / "pc-res144-to-res151-combat-build.json"
        build_evidence = read(build_evidence_path)
        if build_evidence.get("currentBuild") != BUILD:
            raise ValueError("Resource-151 build evidence does not match the selected build")
        download = args.install_root.resolve() / "_game_data_" / "DownLoad"
        version_bytes = (download / "_version.json").read_bytes()
        version = json.loads(version_bytes.decode("utf-8-sig"))["versionInfo"]
        if f"pc-res{version['resVersion']}-build{version['buildVersion']}" != BUILD or sha(download / "_version.json") != build_evidence["sourceHashes"]["versionManifest"]:
            raise ValueError("Installed resource-151 manifest does not match pinned build evidence")
        if sha(download / "gamescript.ab") != build_evidence["sourceHashes"]["bundles"]["gamescript.ab"]["sha256"]:
            raise ValueError("Installed resource-151 game-script bundle does not match pinned build evidence")
        verify_installed_modules(download, (*required, "FuncTable", "AwakerDataUtils", "AttrUtils"))
        installed_config_hash = sha(download / "config.ab")
    else:
        build_evidence_path = BUILD_EVIDENCE
        build_evidence = read(build_evidence_path)
        installed_config_hash = build_evidence.get("sourceHashes", {}).get("installedConfigBundle")
        if not isinstance(installed_config_hash, str) or len(installed_config_hash) != 64:
            raise ValueError("Current installed config bundle is not pinned by public build evidence")
    output_rows, unresolved = [], []
    for catalog_row in catalog["records"]:
        matches = [value for value in characters.values() if value.get("AwakerResNum") == catalog_row["ingameId"] + "_AF"]
        if len(matches) != 1:
            unresolved.append({"characterId": catalog_row["id"], "reason": "Current client identity is not uniquely resolved"})
            continue
        current = matches[0]
        constant = constants[f"AwakerUpgradeLevel_{current['Quality']}"]
        offset = indexed(constant["Data"])["1"]
        attribute_talents = []
        for talent_id, group in talents.items():
            values = {}
            for level, row in indexed(group.get("data_list", {})).items():
                if row.get("AwakerID") != current["ID"]:
                    continue
                for index in (1, 2):
                    if row.get(f"TalentType{index}") == "Talent_Attr_Lv":
                        values[level] = indexed(row[f"TalentEffect{index}"])["1"]
                        break
            if values:
                attribute_talents.append((int(talent_id), values))
        if len(attribute_talents) != 1:
            unresolved.append({"characterId": catalog_row["id"], "reason": "Current attribute talent is not uniquely resolved"})
            continue
        talent_id, bonus = attribute_talents[0]
        output_rows.append({
            "characterId": catalog_row["id"], "clientId": current["ID"], "qualityLevelOffset": offset,
            "primary": {stat: {"base": current[key], "extra": current[key + "_extra"]} for stat, key in (("ATK", "atk"), ("DEF", "def"), ("CON", "physique"))},
            "gnostic": {"clientTalentId": talent_id, "bonusLevelsByRank": {"0": 0, **bonus}},
            "advancementTalents": promotion_talents(current["ID"], talents, attr_types),
        })
    source_hashes = {name: sha(PRIVATE / f"{name}.lua") for name in (*required, "FuncTable", "AwakerDataUtils", "AttrUtils")}
    carryforward = None
    if BUILD == "pc-res151-build51":
        previous = read(ROOT / "research" / "evidence" / "client-build-data-res150.json")
        if {"catalog": sha(CATALOG), **source_hashes} != previous["sourceHashes"] or output_rows != previous["characters"] or unresolved != previous["unresolved"]:
            raise ValueError("Resource-151 progression differs from the reported resource-150 carryforward")
        carryforward = {"sourceModuleCount": len(source_hashes), "identicalSourceModules": len(source_hashes), "derivedCharactersEqual": True, "unresolvedIdentitiesEqual": True, "installedTextAssetMatches": len(source_hashes)}
    advancement_talents = [talent for character in output_rows for talent in character["advancementTalents"]]
    data = {
        "schemaVersion": 1, "build": BUILD, "sourceHashes": {"catalog": sha(CATALOG), **source_hashes},
        "characters": output_rows, "unresolved": unresolved,
        "scope": f"Installed resource-{BUILD.split('-')[1][3:]} primary base stats, explicit Gnostic ranks and Attr_Promote percentages. State/passive effects, equipment, substats, final battle properties and gameplay validation are excluded.",
    }
    OUTPUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    oracle, mismatch_count, checks, samples = CurrentPrimaryLookupOracle(constants), 0, 0, []
    property_names = {"ATK": "atk", "DEF": "def", "CON": "physique"}
    for character in output_rows:
        for level in (1, 14, 24, 70, 90):
            for rank in (0, 1, 5):
                bonus = character["gnostic"]["bonusLevelsByRank"][str(rank)]
                for stat, prop in property_names.items():
                    source = character["primary"][stat]
                    expected = math.ceil(source["base"] * (1 + ((level + character["qualityLevelOffset"]) * 0.5 + bonus * 0.5) / 10) + source["extra"])
                    actual = oracle.lookup(character["clientId"], level, prop, character["gnostic"]["clientTalentId"], rank)
                    checks += 1
                    mismatch_count += actual != expected
                    if level == 90 and rank == 5:
                        samples.append({"characterId": character["characterId"], "stat": stat, "expected": expected})
    status = "CURRENT_ORIGINAL_LOOKUP_EXACT" if mismatch_count == 0 else "CURRENT_LOOKUP_MISMATCH"
    report = {
        "schemaVersion": 1, "kind": "MORIMENS_CURRENT_PRIMARY_STAT_LOOKUP", "analysisTrack": "mechanics",
        "baselineBuild": "pc-res144-build51", "currentBuild": BUILD, "status": status,
        "sourceHashes": {
            **source_hashes,
            "currentClientBuildData": sha(OUTPUT),
            "installedConfigBundle": installed_config_hash,
            "installedBuildEvidence": sha(build_evidence_path),
            **({"versionManifest": sha(download / "_version.json")} if BUILD == "pc-res151-build51" else {}),
        },
        "catalog": {"characters": len(catalog["records"]), "resolved": len(output_rows), "unresolved": len(unresolved)},
        **({"resource150Carryforward": carryforward} if carryforward is not None else {}),
        "advancementCatalog": {
            "charactersWithSupportedPrimaryPromotion": sum(bool(character["advancementTalents"]) for character in output_rows),
            "supportedPrimaryPromotionTalents": len(advancement_talents),
            "levels": sum(talent["maximumLevel"] + 1 for talent in advancement_talents),
        },
        "runtimeChecks": {"cases": checks, "mismatches": mismatch_count, "sampleDomain": "Every resolved character at level 90 / Gnostic rank 5", "samples": samples},
        "scope": f"The installed resource-{BUILD.split('-')[1][3:]} original GetAwakerBaseAttrValue path, current lookup tables and current compiled upgrade formulas are executed for five levels, three Gnostic ranks and three primary stats for every resolved catalog character.",
        "limitations": ["Primary stat lookup only", "Advancement percentages use byte-identical current AttrUtils arithmetic but passive states remain unresolved", "No equipment, battle-property assembly, gameplay observation or holdout credit"],
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": status, "resolvedCharacters": len(output_rows), "unresolvedCharacters": len(unresolved), "runtimeChecks": checks, "mismatches": mismatch_count}, indent=2))


if __name__ == "__main__":
    main()
