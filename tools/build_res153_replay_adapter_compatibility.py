"""Gate the narrow resource-153 replay adapter on pinned dependency evidence."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "research/evidence"
BEFORE = EVIDENCE / "pc-res151-replay-adapter-compatibility.json"
DELTA = EVIDENCE / "pc-res151-to-res153-replay-adapter-dependencies.json"
OUTPUT = EVIDENCE / "pc-res153-replay-adapter-compatibility.json"
MODULES = {
    "BattleConst.lua", "BattleUtilServer.lua", "BattleCmdServer.lua",
    "BattleUnitBase.lua", "BattlePropertyServer.lua", "BEActiveDamage.lua",
}


def commitment(path: Path) -> dict:
    return {"path": path.relative_to(ROOT).as_posix(), "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def main() -> None:
    before = json.loads(BEFORE.read_text(encoding="utf-8"))
    delta = json.loads(DELTA.read_text(encoding="utf-8"))
    if before.get("status") != "SUPPORTED_FOR_NARROW_REPLAY_ADAPTER_BY_EXACT_CARRYFORWARD":
        raise ValueError("Resource-151 narrow adapter evidence is required")
    if (delta.get("status") != "SELECTED_DEPENDENCIES_COMPATIBLE"
            or delta.get("beforeBuild") != "pc-res151-build51"
            or delta.get("afterBuild") != "pc-res153-build51"
            or {row.get("name") for row in delta.get("moduleDependencies", [])} != MODULES
            or not delta.get("battleApiLuaSemanticallyEquivalent")
            or not delta.get("constantDamagePer2HasStateLuaSemanticallyEquivalent")):
        raise ValueError("Resource-153 selected dependencies are incomplete")
    states = delta.get("stateClassification", {})
    if (states.get("sharedClassificationChanges") != 0 or states.get("addedRows") != 1
            or states.get("newTypeCounts") != {"none": 1, "buff": 0, "debuff": 0}):
        raise ValueError("Resource-153 target state classification has changed")
    old_states = json.loads((ROOT / "research/observations/current-res151-build51/modules/State.json").read_text(encoding="utf-8"))
    new_states = json.loads((ROOT / "research/observations/current-res153-build51/modules/State.json").read_text(encoding="utf-8"))
    if set(new_states) - set(old_states) != {"153976"}:
        raise ValueError("Unexpected added resource-153 State ID")
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_REPLAY_ADAPTER_BUILD_COMPATIBILITY",
        "beforeBuild": "pc-res151-build51",
        "afterBuild": "pc-res153-build51",
        "status": "SUPPORTED_FOR_NARROW_ORDINARY_ACTIVE_PREHIT_ADAPTER_BY_SELECTED_CARRYFORWARD",
        "adapterScope": "Complete live property maps; PvE Awakener ordinary direct Active pre-hit damage; replay-embedded Skill, Cmd, MonsterConfig and AwakerConfig routing; no HP mutation or trigger scheduling.",
        "sourceEvidence": {"resource151Adapter": commitment(BEFORE), "resource153SelectedDependencies": commitment(DELTA)},
        "stateClassification": {"inheritedRowsUnchanged": states["beforeRows"], "addedNoneStateId": 153976},
        "routing": "Every candidate must use replay-embedded Skill, Cmd, MonsterConfig and AwakerConfig rows; the local resource-151 rows are not presumed current.",
        "limitations": [
            "This result enables only a bounded retrospective pre-hit calculation, not the general simulator or website for resource 153.",
            "Random critical rolls, target prediction, command scheduling, callbacks, state side effects and HP mutation are outside this gate.",
            "No replay comparison, independent gameplay validation, frozen prediction, or holdout credit follows from dependency equality.",
        ],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"path": OUTPUT.relative_to(ROOT).as_posix(), "status": report["status"]}))


if __name__ == "__main__":
    main()
