"""Compare resource-150 Active-effect initialization with inherited fixtures."""
from pathlib import Path
import argparse
import hashlib
import json
import math

from active_damage_binding_oracle import ActiveBindingOracle
from active_damage_initialization_oracle import InitializationOracle
from runtime_oracle import ROOT


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def module_row(report, name):
    rows = [row for row in report["combatModules"] if row["name"] == name]
    if len(rows) != 1 or len(rows[0].get("current") or []) != 1:
        raise ValueError(f"Unique current module hash required: {name}")
    return rows[0]


def current_repetitions(value):
    repeat = value["repeat"] if value["repeat"] is not None else 1
    base = max(1, math.ceil(repeat))
    return max(1, math.ceil((base + value["plus"]) * (1 + value["per"] / 100)))


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
        raise FileExistsError("Refusing to overwrite Active-effect comparison")
    comparison = json.loads(comparison_path.read_text(encoding="utf-8"))
    assets, module_hashes = {}, {}
    for name in ("BattleConst", "BattleUtilServer", "BattleCmdServer", "BEActiveDamage"):
        path = module_dir / f"{name}.lua"
        row = module_row(comparison, f"{name}.lua")
        if not path.is_file() or sha(path) != row["current"][0]["sha256"] or path.stat().st_size != row["current"][0]["size"]:
            raise ValueError(f"Private current module does not match build comparison: {name}")
        assets[name] = {"output": str(path.relative_to(ROOT)).replace("\\", "/")}
        module_hashes[f"current{name}"] = sha(path)
    files = {
        "binding": ROOT / "tests/synthetic/original-active-damage-binding.json",
        "initialization": ROOT / "tests/synthetic/original-active-damage-initialization.json",
    }
    fixtures = {name: json.loads(path.read_text(encoding="utf-8")) for name, path in files.items()}
    baseline = module_row(comparison, "BEActiveDamage.lua")["baseline"][0]["sha256"]
    if any(data["sourceHashes"]["BEActiveDamage"] != baseline for data in fixtures.values()):
        raise ValueError("Baseline Active-effect fixture source mismatch")
    binding_oracle, init_oracle = ActiveBindingOracle(assets), InitializationOracle(assets)
    binding_mismatches = []
    for row in fixtures["binding"]["fixtures"]:
        actual = binding_oracle.run(row["input"])
        if actual != row["expected"]:
            binding_mismatches.append({"input": row["input"], "baseline": row["expected"], "current": actual})
    divergences = []
    current_outputs = []
    for row in fixtures["initialization"]["fixtures"]:
        actual = init_oracle.run_init(row["input"])
        current_outputs.append((row["input"], actual))
        if actual != row["expected"]:
            divergences.append({"input": row["input"], "baseline": row["expected"], "current": actual})
    if binding_mismatches:
        raise AssertionError(f"Unexpected current binding mismatch: {binding_mismatches[:2]}")
    for value, actual in current_outputs:
        if value["targetsPresent"] and actual["totalEffectTimes"] != current_repetitions(value):
            raise AssertionError(f"Current repeat rule does not explain output: {value}, {actual}")
    if not divergences or any(row["input"]["repeat"] not in (-1, 0) for row in divergences):
        raise AssertionError("Expected a confined nonpositive-repeat behavior change")
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_CROSS_BUILD_ACTIVE_DAMAGE",
        "status": "BEHAVIOR_CHANGE_CONFIRMED",
        "baselineBuild": comparison["baselineBuild"],
        "currentBuild": comparison["currentBuild"],
        "binding": {"fixtures": len(fixtures["binding"]["fixtures"]), "exactMatches": len(fixtures["binding"]["fixtures"]), "mismatches": 0},
        "initialization": {"fixtures": len(fixtures["initialization"]["fixtures"]), "baselineMatches": len(fixtures["initialization"]["fixtures"]) - len(divergences), "divergences": len(divergences)},
        "currentRepeatRule": "baseTimes=max(1,ceil(repeat or 1)); total=max(1,ceil((baseTimes+plus)*(1+per/100)))",
        "divergences": divergences,
        "sourceHashes": {"comparison": sha(comparison_path), "bindingFixture": sha(files["binding"]), "initializationFixture": sha(files["initialization"]), "baselineBEActiveDamage": baseline, **module_hashes},
        "scope": "Actual resource-150 BEActiveDamage initialization and per-target binding executed through the copied XLua runtime with explicit adapters. The authored current repeat rule explains every initialized fixture output.",
        "limitations": [
            "The fixture domain uses ordinary Active subtype, supplied properties and a no-op superclass",
            "No complete command, target acquisition, scheduling tree, HP lifecycle or gameplay observation",
            "This build-specific behavior change prevents treating the resource-144 Active-effect initializer as current-build equivalent",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "bindingMatches": report["binding"]["exactMatches"], "initializationMatches": report["initialization"]["baselineMatches"], "divergences": report["initialization"]["divergences"], "output": str(output.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
