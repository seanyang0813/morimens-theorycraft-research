"""Verify and compose the resource-151 prepared Defend Block/energy boundary."""
from pathlib import Path
import hashlib
import json

from block_target_storage_oracle import BlockStorageOracle
from connected_block_calculation_oracle import BlockOracle


ROOT = Path(__file__).resolve().parents[1]
MODULE_ROOT = ROOT / "research/observations/current-res151-build51/modules"
CALC_FIXTURE = ROOT / "tests/synthetic/original-connected-block-calculation.json"
STORAGE_FIXTURE = ROOT / "tests/synthetic/original-block-target-storage.json"
ENERGY = ROOT / "research/evidence/pc-res151-ulti-energy-compatibility.json"
CATALOGS = ROOT / "research/evidence/pc-res150-to-res151-config-catalogs.json"
OUTPUT = ROOT / "research/evidence/pc-res151-prepared-block-compatibility.json"
MODULES = ("BattleConst", "BattleUtilServer", "BattleCmdServer", "BattlePropertyServer")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    paths = {name: MODULE_ROOT / f"{name}.lua" for name in MODULES}
    for name, path in paths.items():
        if not path.is_file():
            raise FileNotFoundError(f"Missing resource-151 module: {name}")
    assets = {name: {"output": str(path)} for name, path in paths.items()}
    calculation_fixture = json.loads(CALC_FIXTURE.read_text(encoding="utf-8"))
    storage_fixture = json.loads(STORAGE_FIXTURE.read_text(encoding="utf-8"))
    calculation_oracle = BlockOracle(assets)
    storage_oracle = BlockStorageOracle(assets)
    mismatches = []
    for index, row in enumerate(calculation_fixture["fixtures"]):
        actual = calculation_oracle.run(row["input"])
        if actual != row["expected"]:
            mismatches.append({"domain": "calculation", "index": index, "expected": row["expected"], "actual": actual})
    for index, row in enumerate(storage_fixture["storage"]):
        value = row["input"]
        actual = storage_oracle.run(value["block"], value["maxHp"], value["blockMaxPer"], value["request"], value["ignoreMax"])
        if actual != row["expected"]:
            mismatches.append({"domain": "storage", "index": index, "expected": row["expected"], "actual": actual})

    energy = json.loads(ENERGY.read_text(encoding="utf-8"))
    catalogs = json.loads(CATALOGS.read_text(encoding="utf-8"))
    if energy.get("status") != "SUPPORTED_BY_EXACT_DEPENDENCY_CARRYFORWARD" or energy.get("resource150Runtime", {}).get("fixtures") != 516:
        raise ValueError("Resource-151 ultimate-energy compatibility is incomplete")
    if catalogs.get("status") != "LUA_SEMANTICALLY_EQUIVALENT" or catalogs.get("summary", {}).get("luaSemanticChangedSharedRows") != 0:
        raise ValueError("Resource-151 skill-command catalog compatibility is incomplete")
    calculation_count = len(calculation_fixture["fixtures"])
    storage_count = len(storage_fixture["storage"])
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_PREPARED_BLOCK_BUILD_COMPATIBILITY",
        "build": "pc-res151-build51",
        "status": "SUPPORTED_BY_DIRECT_RUNTIME_AND_EXACT_COMPOSITION" if not mismatches else "MISMATCH",
        "operation": "run-prepared-snapshot-block-skill",
        "sourceHashes": {
            **{f"current{name}": sha(path) for name, path in paths.items()},
            "calculationFixture": sha(CALC_FIXTURE),
            "storageFixture": sha(STORAGE_FIXTURE),
            "energyCompatibility": sha(ENERGY),
            "catalogCompatibility": sha(CATALOGS),
        },
        "directRuntime": {
            "calculation": {"fixtures": calculation_count, "exactMatches": calculation_count - sum(row["domain"] == "calculation" for row in mismatches), "mismatches": sum(row["domain"] == "calculation" for row in mismatches)},
            "storage": {"fixtures": storage_count, "exactMatches": storage_count - sum(row["domain"] == "storage" for row in mismatches), "mismatches": sum(row["domain"] == "storage" for row in mismatches)},
            "fixtures": calculation_count + storage_count,
            "mismatches": len(mismatches),
        },
        "composedEvidence": {
            "catalogStatus": catalogs["status"],
            "catalogTableCount": catalogs["summary"]["tableCount"],
            "catalogSemanticChanges": catalogs["summary"]["luaSemanticChangedSharedRows"],
            "ultimateEnergyStatus": energy["status"],
            "ultimateEnergyFixtures": energy["resource150Runtime"]["fixtures"],
            "ultimateEnergyMismatches": energy["resource150Runtime"]["mismatches"],
        },
        "results": mismatches,
        "scope": "Catalog-prepared Skill 4176 / command 834 shape: ordinary Camp1 PvE Awakener Defend Block for one supplied UpperTarget followed by capped caster ultimate-energy gain from complete live property maps.",
        "limitations": [
            "The two-row operation is authored composition of separately proven catalog preparation, direct resource-151 Block runtime and exact-carried energy components",
            "Automatic target generation, card legality/payment, effect repetition, callbacks, Block events and later card lifecycle are excluded",
            "No gameplay, prediction or holdout credit",
        ],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "directRuntimeFixtures": report["directRuntime"]["fixtures"], "directRuntimeMismatches": len(mismatches), "energyFixturesComposed": report["composedEvidence"]["ultimateEnergyFixtures"], "output": str(OUTPUT.relative_to(ROOT))}, indent=2))
    if mismatches:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
