"""Verify the resource-151 state-property handoff and compose it with Active support."""
from pathlib import Path
import hashlib
import json

from state_property_mutation_bridge_oracle import MutationBridgeOracle


ROOT = Path(__file__).resolve().parents[1]
MODULE_ROOT = ROOT / "research/observations/current-res151-build51/modules"
FIXTURE = ROOT / "tests/synthetic/original-state-property-mutation-bridge.json"
CATALOGS = ROOT / "research/evidence/pc-res150-to-res151-config-catalogs.json"
ACTIVE = ROOT / "research/evidence/pc-res151-replay-adapter-compatibility.json"
OUTPUT = ROOT / "research/evidence/pc-res151-state-active-sequence-compatibility.json"
MODULES = ("BattleConst", "BattleUtilServer", "BattleCmdServer", "BattleStateServer", "BattlePropertyServer")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    paths = {name: MODULE_ROOT / f"{name}.lua" for name in MODULES}
    api_path = MODULE_ROOT / "BattleApi.json"
    for name, path in {**paths, "BattleApi": api_path}.items():
        if not path.is_file():
            raise FileNotFoundError(f"Missing resource-151 dependency: {name}")
    assets = {name: {"output": str(path)} for name, path in paths.items()}
    oracle = MutationBridgeOracle(assets, api_path)
    fixture = json.loads(FIXTURE.read_text(encoding="utf-8"))
    mismatches = []
    for index, row in enumerate(fixture["fixtures"]):
        actual = oracle.bridge(row["input"])
        if actual != row["expected"]:
            mismatches.append({"index": index, "expected": row["expected"], "actual": actual})

    catalogs = json.loads(CATALOGS.read_text(encoding="utf-8"))
    active = json.loads(ACTIVE.read_text(encoding="utf-8"))
    if catalogs.get("status") != "LUA_SEMANTICALLY_EQUIVALENT" or catalogs.get("summary", {}).get("luaSemanticChangedSharedRows") != 0:
        raise ValueError("Resource-151 skill/state catalogs are not compatible")
    if active.get("status") != "SUPPORTED_FOR_NARROW_REPLAY_ADAPTER_BY_EXACT_CARRYFORWARD":
        raise ValueError("Resource-151 Active snapshot boundary is incomplete")
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_STATE_ACTIVE_SEQUENCE_COMPATIBILITY",
        "build": "pc-res151-build51",
        "status": "SUPPORTED_BY_DIRECT_RUNTIME_AND_EXACT_COMPOSITION" if not mismatches else "MISMATCH",
        "operation": "run-prepared-state-active-sequence",
        "sourceHashes": {
            **{f"current{name}": sha(path) for name, path in paths.items()},
            "currentBattleApi": sha(api_path),
            "fixture": sha(FIXTURE),
            "catalogCompatibility": sha(CATALOGS),
            "activeCompatibility": sha(ACTIVE),
        },
        "directRuntime": {"fixtures": len(fixture["fixtures"]), "exactMatches": len(fixture["fixtures"]) - len(mismatches), "mismatches": len(mismatches)},
        "composedEvidence": {
            "catalogStatus": catalogs["status"],
            "catalogTableCount": catalogs["summary"]["tableCount"],
            "catalogSemanticChanges": catalogs["summary"]["luaSemanticChangedSharedRows"],
            "activeStatus": active["status"],
            "activeClientModuleDependencies": len(active["clientModuleDependencies"]),
            "activeConfigDependencies": len(active["configDependencies"]),
        },
        "results": mismatches,
        "scope": "One catalog-backed role-state setup mutating one explicit recipient through original resource-151 state/property bytecode, followed by one bounded catalog-prepared Active skill cast by that same role from the updated complete snapshot.",
        "limitations": [
            "Only numeric role-property changes and explicitly declared caster-state layer queries carry into the Active step",
            "Costs, zones, proxy routing, duration/expiry, callbacks, other actors, target-state mutation and automatic targeting are excluded",
            "No gameplay, prediction or holdout credit",
        ],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "directRuntimeFixtures": report["directRuntime"]["fixtures"], "directRuntimeMismatches": len(mismatches), "operation": report["operation"], "output": str(OUTPUT.relative_to(ROOT))}, indent=2))
    if mismatches:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
