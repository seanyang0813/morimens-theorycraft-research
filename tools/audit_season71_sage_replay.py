"""Publish only enemy HP mechanics from one private Season 71 Zone 5 SS replay."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from replay_index import build_replay_index


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "research/observations/dtide-season71-zone5-ss-rank1-decoded.json"
OUTPUT = ROOT / "research/evidence/dtide-season71-sage-ss-replay-audit.json"
CATALOG = ROOT / "research/evidence/replay-protocol.json"


def audit() -> dict:
    raw = SOURCE.read_bytes()
    artifact = json.loads(raw)
    decoded = artifact["decoded"]
    stage_id = str(decoded["battleDat"]["stageId"])
    stage = decoded["resourceRecords"]["Stage"][stage_id]
    assert "71期E5" in stage["CnID"]
    assert "第五禁区·危险等级SS" in stage["Name"]

    index = build_replay_index(artifact, json.loads(CATALOG.read_text(encoding="utf-8")))
    assert index["snapshotBoundaryStatus"] == "COMPLETE"
    assert len(index["initializations"]) == 1
    monster_rows = decoded["resourceRecords"]["MonsterConfig"]
    bosses = [row for row in index["initializations"][0]["monsterDataList"]
              if "「知者」" in monster_rows[str(row["tid"])]["MonsterName"]]
    assert len(bosses) == 1, "Expected exactly one Sage"
    boss = bosses[0]
    initial_hp = boss["properties"]["max_hp"]
    assert boss["properties"]["hp"] == initial_hp and initial_hp > 0
    events = [event for event in index["propertyChanges"]
              if event["data"].get("uid") == boss["uid"]
              and event["data"].get("propertyType") in {"hp", "max_hp"}]
    first_zero = next((i for i, event in enumerate(events)
                       if event["data"]["propertyType"] == "hp"
                       and event["data"].get("value") == 0), None)
    assert first_zero is not None
    max_changes = [i for i, event in enumerate(events)
                   if event["data"]["propertyType"] == "max_hp"]
    assert len(max_changes) == 1 and max_changes[0] > first_zero
    doubled_hp = events[max_changes[0]]["data"]["value"]
    assert doubled_hp == 2 * initial_hp
    second_bar = events[max_changes[0] + 1:]
    assert any(event["data"]["propertyType"] == "hp"
               and event["data"].get("value") == doubled_hp for event in second_bar)
    assert any(event["data"]["propertyType"] == "hp"
               and event["data"].get("value") == 0 for event in second_bar)
    return {
        "schemaVersion": 1,
        "kind": "DTIDE_SEASON71_SAGE_SS_REPLAY_AUDIT",
        "sourceDecodedSha256": hashlib.sha256(raw).hexdigest(),
        "sourceContainerSha256": artifact["inputSha256"],
        "recordStartUtc": datetime.fromtimestamp(
            index["initializations"][0]["time"], timezone.utc).isoformat(),
        "stageId": int(stage_id),
        "stage": "Season 71, Zone 5, SS",
        "boss": "The Sage",
        "initialBarHp": initial_hp,
        "firstBarZeroRecordIndex": events[first_zero]["recordIndex"],
        "secondBarMaxHp": doubled_hp,
        "secondBarRefillObserved": True,
        "secondBarZeroObserved": True,
        "minimumTwoBarHpRemoval": initial_hp + doubled_hp,
        "teamBuildsReadForAudit": False,
        "limitations": [
            "One current-season SS replay, not tier 7 or a budget-team clear.",
            "The HP floor excludes extra healing, shields, overkill, and survival requirements.",
            "No full combat-engine simulation or independent holdout credit.",
        ],
    }


if __name__ == "__main__":
    result = audit()
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({k: result[k] for k in ("stage", "recordStartUtc", "initialBarHp",
                                             "secondBarMaxHp", "minimumTwoBarHpRemoval")}, indent=2))
