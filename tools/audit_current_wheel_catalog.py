"""Publish a sanitized resource-144 to resource-150 Wheel-row comparison."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / "research/extracted/config"
CURRENT = ROOT / "research/observations/current-res150-build51/modules"
OUTPUT = ROOT / "research/evidence/pc-res144-to-res150-wheel-transitions.json"
STATE_IDS = [123520, 123521, 123518, 124066, 134231, 134313, 134383, 134382, 70350]
CMD_IDS = [124022, 124065, 134385, 134386]


def load(root: Path, name: str) -> tuple[dict, str]:
    payload = (root / f"{name}.json").read_bytes()
    return json.loads(payload), hashlib.sha256(payload).hexdigest()


def normalized(value):
    if isinstance(value, dict):
        return {key: normalized(item) for key, item in value.items() if key != "BaseSortID"}
    if isinstance(value, list):
        return [normalized(item) for item in value]
    return value


old_state, old_state_hash = load(OLD, "State")
new_state, new_state_hash = load(CURRENT, "State")
old_cmd, old_cmd_hash = load(OLD, "Cmd")
new_cmd, new_cmd_hash = load(CURRENT, "Cmd")

rows = []
for state_id in STATE_IDS:
    before, after = normalized(old_state[str(state_id)]), normalized(new_state[str(state_id)])
    if state_id == 123521:
        expected = json.loads(json.dumps(before))
        expected["DescPara"]["2"] = "math.ceil(StateOwner.AtkForce*StateArg2*0.01)"
        expected["TriggerPara1"] = "math.ceil(StateOwner.AtkForce*StateArg2*0.01)"
        if after != expected:
            raise ValueError("Unexpected resource-150 Doomsday State 123521 change")
        rows.append({"type": "State", "id": state_id, "status": "ATTACK_PROPERTY_MIGRATED", "changedFields": ["DescPara.2", "TriggerPara1"], "beforeAttackProperty": "atk", "afterAttackProperty": "AtkForce"})
    else:
        if after != before:
            raise ValueError(f"Unexpected resource-150 State {state_id} change")
        rows.append({"type": "State", "id": state_id, "status": "GAMEPLAY_FIELDS_EQUAL"})

for command_id in CMD_IDS:
    if normalized(old_cmd[str(command_id)]) != normalized(new_cmd[str(command_id)]):
        raise ValueError(f"Unexpected resource-150 Cmd {command_id} change")
    rows.append({"type": "Cmd", "id": command_id, "status": "GAMEPLAY_FIELDS_EQUAL"})

report = {
    "schemaVersion": 1,
    "kind": "MORIMENS_PC_WHEEL_TRANSITION_CATALOG_COMPARISON",
    "beforeBuild": "pc-res144-build51",
    "afterBuild": "pc-res150-build51",
    "status": "SUPPORTED_WITH_EXPLICIT_ATTACK_PROPERTY_MIGRATION",
    "sourceHashes": {"beforeState": old_state_hash, "afterState": new_state_hash, "beforeCmd": old_cmd_hash, "afterCmd": new_cmd_hash},
    "normalization": {"ignoredFields": ["BaseSortID"]},
    "rows": rows,
    "summary": {"stateRows": len(STATE_IDS), "commandRows": len(CMD_IDS), "gameplayEqualRows": len(rows) - 1, "attackPropertyMigrationRows": 1, "unexpectedRows": 0},
    "scope": "Exact normalized comparison of the State and Cmd rows used by the four supported Wheel transitions.",
    "limitations": [
        "The comparison proves only the listed catalog rows and does not execute trigger delivery or card mutation",
        "Resource-150 Doomsday callers must supply the live StateOwner.AtkForce value",
        "This artifact provides no gameplay validation, build recommendation or holdout credit",
    ],
}
OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": report["status"], **report["summary"], "output": str(OUTPUT.relative_to(ROOT)).replace("\\", "/")}, indent=2))
