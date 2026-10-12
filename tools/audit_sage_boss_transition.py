"""Audit only the Sage boss HP transition in two private, older PvE replays."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from replay_index import build_replay_index

ROOT = Path(__file__).resolve().parents[1]
CATALOG = json.loads((ROOT / "research/evidence/replay-protocol.json").read_text(encoding="utf-8"))


def audit(batch: int) -> dict:
    path = ROOT / f"research/observations/replay-batch-{batch:02d}/decoded.json"
    raw = path.read_bytes()
    index = build_replay_index(json.loads(raw), CATALOG)
    assert index["snapshotBoundaryStatus"] == "COMPLETE", "Incomplete replay boundary"
    assert len(index["initializations"]) == 1
    bosses = [m for m in index["initializations"][0]["monsterDataList"] if m.get("tid") == 67097]
    assert len(bosses) == 1, "Exactly one Sage boss required"
    boss = bosses[0]
    uid = boss["uid"]
    initial_hp = boss["properties"]["max_hp"]
    assert boss["properties"]["hp"] == initial_hp and initial_hp > 0
    hp_events = [e for e in index["propertyChanges"]
                 if e["data"].get("uid") == uid and e["data"].get("propertyType") in {"hp", "max_hp"}]
    first_zero = next((n for n, e in enumerate(hp_events)
                       if e["data"]["propertyType"] == "hp" and e["data"].get("value") == 0), None)
    assert first_zero is not None, "First bar did not reach zero"
    max_events = [n for n, e in enumerate(hp_events) if e["data"]["propertyType"] == "max_hp"]
    assert len(max_events) == 1 and max_events[0] > first_zero, "Expected one post-death max-HP change"
    doubled = hp_events[max_events[0]]["data"]["value"]
    assert doubled == 2 * initial_hp, "Second bar max HP was not doubled"
    refilled = any(e["data"]["propertyType"] == "hp" and e["data"].get("value") == doubled
                   for e in hp_events[max_events[0] + 1:])
    assert refilled, "Second bar did not refill to doubled maximum"
    final_zero = any(e["data"]["propertyType"] == "hp" and e["data"].get("value") == 0
                     for e in hp_events[max_events[0] + 1:])
    assert final_zero, "Replay did not reach second-bar zero"
    return {"sourceSha256": hashlib.sha256(raw).hexdigest(), "initialBarHp": initial_hp,
            "secondBarMaxHp": doubled, "minimumTwoBarHpRemoval": initial_hp + doubled,
            "firstBarZeroBeforeDoubling": True, "secondBarRefillObserved": True,
            "secondBarZeroObserved": True}


if __name__ == "__main__":
    print(json.dumps({"schemaVersion": 1, "kind": "SAGE_BOSS_HP_TRANSITION_REPLAY_AUDIT",
                      "scope": "Two older PvE Sage replays; enemy events only; not Season 71 tier 7",
                      "fixtures": [audit(14), audit(15)],
                      "teamBuildsRead": False, "publicationCredit": False}, indent=2))
