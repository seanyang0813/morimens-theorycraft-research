"""Run inherited BeHit/HP fixtures with resource-150 changed dependencies."""
from pathlib import Path
import hashlib
import json

from behit_hp_oracle import BeHitHpOracle, ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir = ROOT / "research/observations/current-res150-build51/modules"
    comparison_path = ROOT / "research/evidence/pc-res144-to-res150-combat-build.json"
    fixture_path = ROOT / "tests/synthetic/original-behit-hp.json"
    output = ROOT / "research/evidence/pc-res150-behit-hp-runtime.json"
    comparison = json.loads(comparison_path.read_text(encoding="utf-8"))
    names = ("BattleConst", "BattleUtilServer", "BattleCmdServer", "BattlePropertyServer")
    assets = {}
    hashes = {"comparison": sha(comparison_path), "fixture": sha(fixture_path)}
    for name in names:
        path = module_dir / f"{name}.lua"
        rows = [row for row in comparison["combatModules"] if row["name"] == f"{name}.lua"]
        if len(rows) != 1 or len(rows[0].get("current") or []) != 1:
            raise ValueError(f"Unique current module hash required: {name}")
        if sha(path) != rows[0]["current"][0]["sha256"]:
            raise ValueError(f"Private current module does not match build comparison: {name}")
        assets[name] = {"output": str(path.relative_to(ROOT)).replace("\\", "/")}
        hashes[f"current{name}"] = sha(path)
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
    oracle = BeHitHpOracle(assets)
    mismatches = []
    for row in fixture["fixtures"]:
        actual = oracle.evaluate(row["input"])
        if actual != row["expected"]:
            mismatches.append({"input": row["input"], "baseline": row["expected"], "current": actual})
    total = len(fixture["fixtures"])
    report = {
        "schemaVersion": 1, "kind": "MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON",
        "baselineBuild": "pc-res144-build51", "currentBuild": "pc-res150-build51",
        "method": "BattleUnitBase.BeHit through BattlePropertyServer HP mutation",
        "status": "EXACT_MATCH_IN_FIXTURE_DOMAIN" if not mismatches else "BEHAVIOR_CHANGE_DETECTED",
        "sourceHashes": hashes, "fixtures": total, "exactMatches": total - len(mismatches),
        "mismatches": len(mismatches), "results": mismatches,
        "scope": "Actual resource-150 changed constants, utility, command and property modules with byte-identical resource-144 BattleUnitBase/BattleUnitUtil; explicit immunity, block, puncture, retained-HP, incoming-limit and death-resistance inputs.",
        "limitations": [
            "Record, animation and damage-event calls are observational spies",
            "No downstream event execution, statistics credit, death lifecycle, gameplay or holdout credit",
        ],
    }
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "fixtures": total,
                      "exactMatches": report["exactMatches"], "output": str(output.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
