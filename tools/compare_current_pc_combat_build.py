"""Compare an installed PC resource build with the copied research checkpoint.

The report contains version and content hashes only. It never copies installed
modules, account data, replay identifiers, or authentication material.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re

import UnityPy

ROOT = Path(__file__).resolve().parents[1]
BASELINE_BUILD = "pc-res144-build51"
BUNDLES = ("share.ab", "gamescript.ab", "foundation.ab")
COMBAT_MODULES = (
    "BattleConst.lua", "BattleUtilServer.lua", "BattleCmdServer.lua", "BattleUnitBase.lua",
    "BattlePropertyServer.lua", "BattleStateServer.lua", "BEActiveDamage.lua",
    "BEPureDamage.lua", "BEFixedDamage.lua", "BETentacleAttack.lua",
    "BattleReplayPlayer.lua", "BattleRecord.lua", "PVEGameplay.lua",
    "BattleEngine.lua", "BattleUnitUtil.lua",
)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def text_assets(path):
    rows = {}
    environment = UnityPy.load(str(path))
    for obj in environment.objects:
        if obj.type.name != "TextAsset":
            continue
        value = obj.read()
        data = value.m_Script.encode("utf-8", "surrogateescape") if isinstance(value.m_Script, str) else bytes(value.m_Script)
        rows.setdefault(value.m_Name, []).append({"sha256": sha(data), "size": len(data)})
    for values in rows.values():
        values.sort(key=lambda row: (row["sha256"], row["size"]))
    return rows


def baseline_assets():
    index = json.loads((ROOT / "research/symbols/text-assets.json").read_text(encoding="utf-8"))
    rows = {}
    accepted = {f"pc/downloaded/{name}" for name in BUNDLES}
    for item in index:
        if str(item.get("bundle", "")).replace("\\", "/") not in accepted:
            continue
        rows.setdefault(item["name"], []).append({"sha256": item["sha256"], "size": item["size"]})
    for values in rows.values():
        values.sort(key=lambda row: (row["sha256"], row["size"]))
    return rows


def steam_metadata(path):
    text = path.read_text(encoding="utf-8", errors="replace")
    value = lambda name: (re.search(rf'"{re.escape(name)}"\s+"([^"]+)"', text) or [None, None])[1]
    return {"appId": value("appid"), "buildId": value("buildid"), "lastUpdatedUnix": int(value("LastUpdated"))}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--install-root", required=True, type=Path)
    parser.add_argument("--steam-manifest", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    install = args.install_root.resolve()
    download = install / "_game_data_" / "DownLoad"
    version_path = download / "_version.json"
    output = args.output.resolve()
    try:
        output.relative_to(ROOT / "research/evidence")
    except ValueError as error:
        raise ValueError("Comparison output must stay inside research/evidence") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite build comparison")
    key = ROOT / "research/raw/bundle-key.bin"
    if not key.is_file():
        raise FileNotFoundError("Local bundle key is required")
    UnityPy.set_assetbundle_decrypt_key(key.read_bytes())
    current = {}
    bundle_hashes = {}
    for name in BUNDLES:
        path = download / name
        data = path.read_bytes()
        bundle_hashes[name] = {"sha256": sha(data), "size": len(data)}
        for module, values in text_assets(path).items():
            current.setdefault(module, []).extend(values)
    for values in current.values():
        values.sort(key=lambda row: (row["sha256"], row["size"]))
    baseline = baseline_assets()
    matched = set(baseline) & set(current)
    modules = []
    for name in COMBAT_MODULES:
        before, after = baseline.get(name), current.get(name)
        modules.append({"name": name, "status": "IDENTICAL" if before == after and before else "CHANGED" if before and after else "MISSING", "baseline": before, "current": after})
    version_bytes = version_path.read_bytes()
    version = json.loads(version_bytes.decode("utf-8-sig"))["versionInfo"]
    current_build = f"pc-res{version['resVersion']}-build{version['buildVersion']}"
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_COMBAT_BUILD_COMPARISON",
        "baselineBuild": BASELINE_BUILD,
        "currentBuild": current_build,
        "currentVersion": version,
        "steam": steam_metadata(args.steam_manifest.resolve()),
        "sourceHashes": {"versionManifest": sha(version_bytes), "bundles": bundle_hashes},
        "inventory": {
            "baselineNames": len(baseline), "currentNames": len(current), "matchedNames": len(matched),
            "identicalMatchedNames": sum(baseline[name] == current[name] for name in matched),
            "changedMatchedNames": sum(baseline[name] != current[name] for name in matched),
            "missingNames": len(set(baseline) - set(current)), "newNames": len(set(current) - set(baseline)),
        },
        "combatModules": modules,
        "compatibility": "REVALIDATION_REQUIRED" if any(row["status"] != "IDENTICAL" for row in modules) else "SELECTED_MODULES_IDENTICAL",
        "scope": "Installed downloaded manifest and TextAsset content hashes compared with the copied resource-144 checkpoint. Path IDs are ignored because bundle repacking changes them. No module code, account data, replay identifiers or credentials are included.",
        "limitations": [
            "Module equality does not prove full-build equality",
            "Changed modules require method-level review and original-runtime retesting before current-build gameplay can validate the existing calculator",
            "This report identifies the viewing client build; it does not identify the engine build of a historical replay",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"currentBuild": current_build, "compatibility": report["compatibility"], "changedCombatModules": [row["name"] for row in modules if row["status"] != "IDENTICAL"], "output": str(output.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
