"""Run the existing ShowDamageFormula domain against a newer copied module pair."""
from pathlib import Path
import argparse
import hashlib
import json

from runtime_oracle import Oracle, ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def module_row(report, name):
    rows = [row for row in report["combatModules"] if row["name"] == name]
    if len(rows) != 1 or len(rows[0].get("current") or []) != 1:
        raise ValueError(f"Unique current module hash required: {name}")
    return rows[0]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--module-dir", required=True, type=Path)
    parser.add_argument("--comparison", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    module_dir = args.module_dir.resolve()
    comparison_path = args.comparison.resolve()
    output = args.output.resolve()
    try:
        module_dir.relative_to(ROOT / "research/observations")
        output.relative_to(ROOT / "research/evidence")
    except ValueError as error:
        raise ValueError("Private modules must stay in observations and output in evidence") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite runtime comparison")
    comparison = json.loads(comparison_path.read_text(encoding="utf-8"))
    if comparison.get("kind") != "MORIMENS_PC_COMBAT_BUILD_COMPARISON":
        raise ValueError("PC combat-build comparison required")
    modules = {}
    for name in ("BattleConst.lua", "BattleUtilServer.lua"):
        path = module_dir / name
        row = module_row(comparison, name)
        if not path.is_file() or sha(path) != row["current"][0]["sha256"] or path.stat().st_size != row["current"][0]["size"]:
            raise ValueError(f"Private current module does not match build comparison: {name}")
        modules[name] = path
    fixture_path = ROOT / "tests/synthetic/original-runtime.json"
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    baseline_util = module_row(comparison, "BattleUtilServer.lua")["baseline"][0]["sha256"]
    if fixture.get("sourceHash") != baseline_util:
        raise ValueError("Baseline fixture source does not match compared module")
    oracle = Oracle()
    relative = lambda path: str(path.relative_to(ROOT)).replace("\\", "/")
    oracle.module("BattleConst", {"output": relative(modules["BattleConst.lua"])})
    oracle.setglobal(oracle.state, b"_oracle_bc")
    oracle.module("BattleUtilServer", {"output": relative(modules["BattleUtilServer.lua"])})
    oracle.setglobal(oracle.state, b"_oracle_util")
    mismatches = []
    for row in fixture["fixtures"]:
        actual = oracle.damage(row["input"])
        if actual != row["expected"]:
            mismatches.append({"id": row["id"], "expected": row["expected"], "actual": actual})
    if mismatches:
        raise AssertionError(f"Current ShowDamageFormula mismatches: {mismatches[:3]}")
    pc = json.loads((ROOT / "research/builds/pc.json").read_text(encoding="utf-8"))
    xlua = next(row["sha256"] for row in pc["files"] if row["copy"].replace("\\", "/").endswith("Plugins/x86_64/xlua.dll"))
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_CROSS_BUILD_ORIGINAL_RUNTIME",
        "status": "EXACT_MATCH_IN_FIXTURE_DOMAIN",
        "baselineBuild": comparison["baselineBuild"],
        "currentBuild": comparison["currentBuild"],
        "method": "BattleUtilServer.ShowDamageFormula",
        "fixtures": len(fixture["fixtures"]),
        "exactMatches": len(fixture["fixtures"]),
        "mismatches": 0,
        "sourceHashes": {
            "comparison": sha(comparison_path),
            "fixture": sha(fixture_path),
            "baselineBattleUtilServer": baseline_util,
            "currentBattleConst": sha(modules["BattleConst.lua"]),
            "currentBattleUtilServer": sha(modules["BattleUtilServer.lua"]),
            "copiedXluaRuntime": xlua,
        },
        "scope": "The actual resource-150 BattleConst and BattleUtilServer bytecode was loaded through the copied client XLua runtime and evaluated over every existing ShowDamageFormula fixture. Exact equality establishes behavior only over this explicit synthetic domain.",
        "limitations": [
            "The resource-150 BattleCmdServer, BattlePropertyServer, BEActiveDamage, BattleRecord and BattleEngine changes are not covered here",
            "Target, critical, HP, state, command, replay and lifecycle paths require separate current-build review",
            "Synthetic cross-build equality is not an independent gameplay observation or publication holdout",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "fixtures": report["fixtures"], "currentBuild": report["currentBuild"], "output": str(output.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
