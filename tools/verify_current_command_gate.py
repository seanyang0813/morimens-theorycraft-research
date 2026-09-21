"""Compare the installed resource-150 BattleEngine command gate with baseline fixtures."""
from pathlib import Path
import hashlib
import json

from command_gate_oracle import CommandGateOracle, ROOT


def main():
    module_dir = ROOT / "research/observations/current-res150-build51/modules"
    current_path = module_dir / "BattleEngine.lua"
    comparison_path = ROOT / "research/evidence/pc-res144-to-res150-combat-build.json"
    baseline_path = ROOT / "tests/synthetic/original-command-gate.json"
    output = ROOT / "research/evidence/pc-res150-command-gate-runtime.json"
    current = current_path.read_bytes()
    comparison = json.loads(comparison_path.read_text(encoding="utf-8"))
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    names = ("BattleConst", "BattleUtilServer", "BattleCmdServer", "BattlePropertyServer", "BattleEngine")
    for name in names:
        path = module_dir / f"{name}.lua"
        rows = [row for row in comparison["combatModules"] if row["name"] == f"{name}.lua"]
        if len(rows) != 1 or len(rows[0].get("current") or []) != 1:
            raise ValueError(f"Unique current module hash required: {name}")
        if hashlib.sha256(path.read_bytes()).hexdigest() != rows[0]["current"][0]["sha256"]:
            raise ValueError(f"Private current module does not match build comparison: {name}")
    assets = {name: {"output": str((module_dir / f"{name}.lua").relative_to(ROOT)).replace("\\", "/")}
              for name in names}
    oracle = CommandGateOracle(assets)
    results = []
    for fixture in baseline["fixtures"]:
        actual = oracle.run(fixture["input"])
        results.append({"input": fixture["input"], "expected": fixture["expected"], "actual": actual,
                        "exactMatch": actual == fixture["expected"]})
    matches = sum(row["exactMatch"] for row in results)
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON",
        "baselineBuild": "pc-res144-build51",
        "currentBuild": "pc-res150-build51",
        "member": "BattleEngine.OnReceiveCommand ordinary PvE lg_UseCard entry gate",
        "status": "EXACT_MATCH_IN_FIXTURE_DOMAIN" if matches == len(results) else "BEHAVIOR_CHANGE_DETECTED",
        "sourceHashes": {
            "comparison": hashlib.sha256(comparison_path.read_bytes()).hexdigest(),
            **{f"current{name}": hashlib.sha256((module_dir / f"{name}.lua").read_bytes()).hexdigest()
               for name in names},
            "baselineFixtures": hashlib.sha256(baseline_path.read_bytes()).hexdigest(),
        },
        "fixtures": len(results), "exactMatches": matches, "results": results,
        "scope": "Actual resource-150 BattleEngine with inherited BattleCommand classification; supplied waiting/root/finish state, Camp2, and a missing-card lookup as the observable dispatch boundary.",
        "limitations": [
            "No valid card execution, card ownership, energy payment, turn advance, effect scheduling or gameplay",
            "This does not cover BattleEngine recording, initialization, event creation or update-loop changes",
        ],
    }
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "fixtures": len(results), "exactMatches": matches,
                      "output": str(output.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
