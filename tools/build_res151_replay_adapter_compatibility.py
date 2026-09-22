"""Compose the exact resource-151 dependency boundary for the replay adapter."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "research" / "evidence"
REQUIRED_MODULES = (
    "BattleConst.lua",
    "BattleUtilServer.lua",
    "BattleCmdServer.lua",
    "BattleUnitBase.lua",
    "BattlePropertyServer.lua",
    "BEActiveDamage.lua",
)
RUNTIME_REQUIREMENTS = {
    "pc-res150-show-damage-runtime.json": ("EXACT_MATCH_IN_FIXTURE_DOMAIN", 2262),
    "pc-res150-offensive-setup-runtime.json": ("EXACT_MATCH_IN_FIXTURE_DOMAIN", 879),
    "pc-res150-target-damage-runtime.json": ("EXACT_MATCH_IN_FIXTURE_DOMAIN", 2097),
    "pc-res150-card-target-runtime.json": ("EXACT_MATCH_IN_FIXTURE_DOMAIN", 506),
    "pc-res150-behit-hp-runtime.json": ("EXACT_MATCH_IN_FIXTURE_DOMAIN", 18),
}


def load(name: str) -> tuple[dict, Path]:
    path = EVIDENCE / name
    return json.loads(path.read_text(encoding="utf-8")), path


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    carry, carry_path = load("pc-res150-to-res151-combat-carryforward.json")
    catalogs, catalogs_path = load("pc-res150-to-res151-config-catalogs.json")
    if carry.get("status") != "TRACKED_COMBAT_MODULES_IDENTICAL":
        raise ValueError("Exact resource-150 to resource-151 module carry-forward required")
    modules = {row.get("name"): row for row in carry.get("modules", [])}
    missing = [name for name in REQUIRED_MODULES if modules.get(name, {}).get("status") != "IDENTICAL"]
    if missing:
        raise ValueError("Replay adapter module dependency is not identical: " + ", ".join(missing))
    if catalogs.get("status") != "LUA_SEMANTICALLY_EQUIVALENT" or catalogs.get("summary", {}).get("luaSemanticChangedSharedRows") != 0:
        raise ValueError("Lua-semantic equality of the five replay adapter catalogs required")
    runtime = []
    for name, (status, fixtures) in RUNTIME_REQUIREMENTS.items():
        value, path = load(name)
        if value.get("status") != status or value.get("fixtures") != fixtures or value.get("mismatches") != 0:
            raise ValueError(f"Resource-150 runtime evidence is incomplete: {name}")
        runtime.append({"path": f"research/evidence/{name}", "sha256": sha(path), "status": status, "fixtures": fixtures})
    active, active_path = load("pc-res150-active-damage-runtime.json")
    if active.get("status") != "BEHAVIOR_CHANGE_CONFIRMED" or active.get("binding", {}).get("mismatches") != 0:
        raise ValueError("Resource-150 Active initialization evidence is incomplete")
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_REPLAY_ADAPTER_BUILD_COMPATIBILITY",
        "beforeBuild": "pc-res150-build51",
        "afterBuild": "pc-res151-build51",
        "status": "SUPPORTED_FOR_NARROW_REPLAY_ADAPTER_BY_EXACT_CARRYFORWARD",
        "adapterScope": "Complete live property maps; PvE Awakener ordinary direct Active damage; replay-embedded Skill, Cmd, MonsterConfig and AwakerConfig routing; optional ordinary or Puncture HP mutation.",
        "clientModuleDependencies": [
            {"name": name, "status": modules[name]["status"], "before": modules[name]["before"], "after": modules[name]["after"]}
            for name in REQUIRED_MODULES
        ],
        "configDependencies": ["Skill", "Cmd", "State", "BattleApi", "Constant"],
        "sourceEvidence": {
            "moduleCarryforward": {"path": "research/evidence/pc-res150-to-res151-combat-carryforward.json", "sha256": sha(carry_path)},
            "configComparison": {"path": "research/evidence/pc-res150-to-res151-config-catalogs.json", "sha256": sha(catalogs_path)},
            "resource150Runtime": runtime,
            "activeInitialization": {"path": "research/evidence/pc-res150-active-damage-runtime.json", "sha256": sha(active_path), "status": active["status"]},
        },
        "reasoning": [
            "The adapter consumes live battle-property maps, so it does not use the role-property constructor path.",
            "Every client code module executed or translated by the bounded adapter is byte-identical between resources 150 and 151.",
            "Every installed config table read by the adapter has zero Lua-semantic row changes between resources 150 and 151.",
            "The resource-150 behavior remains bounded by its recorded synthetic runtime fixture domains; exact dependency equality carries those domains to resource 151 without widening them.",
        ],
        "limitations": [
            "This compatibility result applies only to the named replay adapter scope, not the general simulator or every combat mechanic.",
            "Replay transport, target prediction, random-number-stream reconstruction, callbacks, statistics and full death scheduling remain outside the adapter.",
            "This report supplies no gameplay agreement, chronology, same-session provenance or holdout credit.",
        ],
    }
    output = EVIDENCE / "pc-res151-replay-adapter-compatibility.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(output.relative_to(ROOT)), "status": report["status"], "moduleDependencies": len(REQUIRED_MODULES), "configDependencies": len(report["configDependencies"])}, indent=2))


if __name__ == "__main__":
    main()
