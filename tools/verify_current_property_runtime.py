"""Run inherited property initialization and HP subtraction against resource 150."""
from pathlib import Path
import argparse
import hashlib
import json

from hp_property_oracle import HpPropertyOracle
from property_initialization_oracle import InitializationOracle
from runtime_oracle import ROOT


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
    module_dir, comparison_path, output = args.module_dir.resolve(), args.comparison.resolve(), args.output.resolve()
    try:
        module_dir.relative_to(ROOT / "research/observations")
        output.relative_to(ROOT / "research/evidence")
    except ValueError as error:
        raise ValueError("Private modules must stay in observations and output in evidence") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite property comparison")
    comparison = json.loads(comparison_path.read_text(encoding="utf-8"))
    assets, module_hashes = {}, {}
    for name in ("BattleConst", "BattleUtilServer", "BattleCmdServer", "BattlePropertyServer"):
        path, row = module_dir / f"{name}.lua", module_row(comparison, f"{name}.lua")
        if not path.is_file() or sha(path) != row["current"][0]["sha256"] or path.stat().st_size != row["current"][0]["size"]:
            raise ValueError(f"Private current module does not match build comparison: {name}")
        assets[name] = {"output": str(path.relative_to(ROOT)).replace("\\", "/")}
        module_hashes[f"current{name}"] = sha(path)
    specs = [
        ("initialization", ROOT / "tests/synthetic/original-property-initialization.json", InitializationOracle(assets), lambda oracle, value: oracle.run(value)),
        ("hpSubtraction", ROOT / "tests/synthetic/original-hp-property.json", HpPropertyOracle(assets), lambda oracle, value: oracle.evaluate(value["hp"], value["request"])),
    ]
    results, fixture_hashes = {}, {}
    baseline = module_row(comparison, "BattlePropertyServer.lua")["baseline"][0]["sha256"]
    for name, path, oracle, evaluate in specs:
        data = json.loads(path.read_text(encoding="utf-8"))
        if data["sourceHash"] != baseline:
            raise ValueError(f"Baseline property source mismatch: {name}")
        mismatches = []
        for row in data["fixtures"]:
            actual = evaluate(oracle, row["input"])
            if actual != row["expected"]:
                mismatches.append({"input": row["input"], "expected": row["expected"], "actual": actual})
        if mismatches:
            raise AssertionError(f"Current property mismatch: {name}: {mismatches[:2]}")
        results[name] = {"fixtures": len(data["fixtures"]), "exactMatches": len(data["fixtures"]), "mismatches": 0}
        fixture_hashes[name + "Fixture"] = sha(path)
    report = {
        "schemaVersion": 1, "kind": "MORIMENS_CROSS_BUILD_ORIGINAL_RUNTIME", "status": "EXACT_MATCH_IN_FIXTURE_DOMAIN",
        "baselineBuild": comparison["baselineBuild"], "currentBuild": comparison["currentBuild"], "methods": ["BattlePropertyServer.ctor", "BattlePropertyServer.SubProperty"],
        "results": results, "fixtures": sum(row["fixtures"] for row in results.values()), "exactMatches": sum(row["exactMatches"] for row in results.values()), "mismatches": 0,
        "sourceHashes": {"comparison": sha(comparison_path), "baselineBattlePropertyServer": baseline, **module_hashes, **fixture_hashes},
        "scope": "Actual resource-150 property bytecode executed through the copied XLua runtime for numeric constructor rounding/mastery initialization and ordinary HP subtraction with explicit adapters.",
        "limitations": ["No role constructor, post-construction state/property mutation, event dispatch, BeHit, shields or death handling", "Synthetic equality is not an independent gameplay observation or holdout"],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "fixtures": report["fixtures"], "output": str(output.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
