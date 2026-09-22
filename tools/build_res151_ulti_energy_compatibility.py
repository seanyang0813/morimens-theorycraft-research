"""Carry the bounded ultimate-energy experiment from resource 150 to 151."""
from pathlib import Path
import hashlib
import json


ROOT = Path(__file__).resolve().parents[1]
BEFORE = ROOT / "research/observations/current-res150-build51/modules"
AFTER = ROOT / "research/observations/current-res151-build51/modules"
RUNTIME = ROOT / "research/evidence/pc-res150-ulti-energy-runtime.json"
OUTPUT = ROOT / "research/evidence/pc-res151-ulti-energy-compatibility.json"
MODULES = (
    "BattleConst.lua", "BattleUtilServer.lua", "BattleCmdServer.lua",
    "BattlePropertyServer.lua", "BattleEffectServer.lua",
    "BEGainUltiEnergy.lua", "BattleUnitAwaker.lua",
)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    rows = []
    for name in MODULES:
        before, after = BEFORE / name, AFTER / name
        if not before.is_file() or not after.is_file():
            raise FileNotFoundError(f"Missing private module pair: {name}")
        before_hash, after_hash = sha(before), sha(after)
        rows.append({
            "name": name,
            "status": "IDENTICAL" if before_hash == after_hash else "CHANGED",
            "before": {"sha256": before_hash, "bytes": before.stat().st_size},
            "after": {"sha256": after_hash, "bytes": after.stat().st_size},
        })
    changed = [row["name"] for row in rows if row["status"] != "IDENTICAL"]
    if changed:
        raise ValueError("Ultimate-energy dependencies changed: " + ", ".join(changed))
    runtime = json.loads(RUNTIME.read_text(encoding="utf-8"))
    if runtime.get("status") != "EXACT_MATCH_IN_FIXTURE_DOMAIN" or runtime.get("fixtures") != 516 or runtime.get("mismatches") != 0:
        raise ValueError("Resource-150 ultimate-energy runtime evidence is incomplete")
    for row in rows:
        key = "current" + row["name"].removesuffix(".lua")
        if runtime.get("sourceHashes", {}).get(key) != row["before"]["sha256"]:
            raise ValueError("Resource-150 runtime dependency hash changed: " + row["name"])
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_ULTI_ENERGY_BUILD_COMPATIBILITY",
        "beforeBuild": "pc-res150-build51",
        "afterBuild": "pc-res151-build51",
        "status": "SUPPORTED_BY_EXACT_DEPENDENCY_CARRYFORWARD",
        "methods": runtime["methods"],
        "modules": rows,
        "resource150Runtime": {
            "path": "research/evidence/pc-res150-ulti-energy-runtime.json",
            "sha256": sha(RUNTIME),
            "fixtures": runtime["fixtures"],
            "domains": runtime["domains"],
            "mismatches": runtime["mismatches"],
        },
        "operation": "run-ulti-energy-effect",
        "reasoning": "Every Lua module exercised by the bounded resource-150 calculation, effect and capped-storage fixture domains is byte-identical in the installed resource-151 build, so those exact domains carry forward without widening them.",
        "scope": "Ordinary ultimate-energy calculation, repetitions and capped Awakener storage from explicit snapshots through the existing experiment interface.",
        "limitations": [
            "Explicit properties, target order, card/type/tag decisions and Awakener eligibility remain caller inputs",
            "Callbacks are reported but not dispatched; full command/card lifecycle, automatic build assembly and gameplay remain outside scope",
            "No prediction or holdout credit",
        ],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "moduleDependencies": len(rows), "fixturesCarriedForward": runtime["fixtures"], "operation": report["operation"], "output": str(OUTPUT.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
