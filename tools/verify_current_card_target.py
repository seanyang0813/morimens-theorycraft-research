"""Run the inherited card/tag target-damage domain on resource-150 bytecode."""
from pathlib import Path
import hashlib
import json

from card_target_oracle import CardTargetOracle, ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir = ROOT / "research/observations/current-res150-build51/modules"
    comparison_path = ROOT / "research/evidence/pc-res144-to-res150-combat-build.json"
    fixture_paths = [ROOT / "tests/synthetic/original-card-target.json",
                     ROOT / "tests/synthetic/original-card-target-mixed.json"]
    output = ROOT / "research/evidence/pc-res150-card-target-runtime.json"
    comparison = json.loads(comparison_path.read_text(encoding="utf-8"))
    names = ("BattleConst", "BattleUtilServer", "BattleCmdServer")
    assets = {}
    hashes = {"comparison": sha(comparison_path), "fixture": sha(fixture_paths[0]),
              "mixedFixture": sha(fixture_paths[1])}
    for name in names:
        path = module_dir / f"{name}.lua"
        rows = [row for row in comparison["combatModules"] if row["name"] == f"{name}.lua"]
        if len(rows) != 1 or len(rows[0].get("current") or []) != 1:
            raise ValueError(f"Unique current module hash required: {name}")
        if sha(path) != rows[0]["current"][0]["sha256"]:
            raise ValueError(f"Private current module does not match build comparison: {name}")
        assets[name] = {"output": str(path.relative_to(ROOT)).replace("\\", "/")}
        hashes[f"current{name}"] = sha(path)
    fixtures = [fixture for path in fixture_paths
                for fixture in json.loads(path.read_text(encoding="utf-8"))["fixtures"]]
    oracle = CardTargetOracle(assets)
    results = []
    for fixture in fixtures:
        actual = oracle.final_damage(fixture["showDamage"], fixture["adapterInputs"])
        results.append({"showDamage": fixture["showDamage"], "adapterInputs": fixture["adapterInputs"],
                        "baseline": fixture["expected"], "current": actual,
                        "exactMatch": actual == fixture["expected"]})
    matches = sum(row["exactMatch"] for row in results)
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON",
        "baselineBuild": "pc-res144-build51", "currentBuild": "pc-res150-build51",
        "methods": ["BattleCmdServer.__GetFinalDamage", "BattleCmdServer.GetTargetBeDmgPerMul"],
        "status": "EXACT_MATCH_IN_FIXTURE_DOMAIN" if matches == len(results) else "BEHAVIOR_CHANGE_DETECTED",
        "sourceHashes": hashes, "fixtures": len(results), "exactMatches": matches,
        "mismatches": len(results) - matches,
        "results": [row for row in results if not row["exactMatch"]],
        "scope": "Actual resource-150 card, Strike/Ulti tag critical contributions, Ulti and instruction-card target slots, state-trigger-add exclusion, and supplied block/barrier eligibility over the inherited resource-144 fixture domains.",
        "limitations": [
            "Barrier-state eligibility is supplied rather than resolved from a complete live state manager",
            "No offensive-input assembly, HP resolution, gameplay or holdout credit",
        ],
    }
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "fixtures": len(results), "exactMatches": matches,
                      "output": str(output.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
