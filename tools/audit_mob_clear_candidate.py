"""Sanitized retrospective AoE audit for the proposed Mouchette/Helot line.

This reads already decoded private replays and publishes no player or replay IDs.
It measures observed card-hit coverage and HP changes, not an E0 prediction.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OBS = ROOT / "research/observations"
OUT = ROOT / "research/evidence/season71-mob-clear-candidate-audit.json"

SOURCES = [
    ("mouchette-pack", OBS / "replay-batch-112/compact-index.json", 122483),
    ("helot-38", OBS / "replay-batch-38/compact-index.json", 4010),
    ("helot-47", OBS / "replay-batch-47/compact-index.json", 4010),
    ("helot-48", OBS / "replay-batch-48/compact-index.json", 4010),
]


def audit_source(label: str, path: Path, skill_id: int) -> dict:
    index = json.loads(path.read_text(encoding="utf-8"))
    actions = []
    for action in index["actionSnapshots"]:
        played_card = action.get("cards", {}).get(str(action.get("cardUid")), {})
        if played_card.get("configId") != skill_id:
            continue
        hits = [h["data"]["beHitConfig"] for h in action["window"]["hits"]
                if h["data"]["beHitConfig"].get("skillConfigId") == skill_id]
        if not hits:
            continue
        by_target: dict[int, list[dict]] = {}
        for hit in hits:
            by_target.setdefault(hit["destRoleUid"], []).append(hit)
        actions.append({
            "actionIndex": action["actionIndex"],
            "targetCount": len(by_target),
            "hitCount": len(hits),
            "recordedDamage": sum(h.get("realDamage", 0) for h in hits),
            "targets": [{
                "initialHpAtCard": rows[0].get("oldHp"),
                "targetMaxHp": rows[0].get("curMaxHp"),
                "hpAfterLastCardHit": rows[-1].get("curHp"),
                "recordedDamage": sum(h.get("realDamage", 0) for h in rows),
            } for rows in by_target.values()],
        })
    return {"label": label, "skillId": skill_id, "observedActions": len(actions),
            "multiTargetActions": sum(a["targetCount"] > 1 for a in actions),
            "actions": actions}


def main() -> None:
    samples = [audit_source(*source) for source in SOURCES]
    first_pack = next(action for action in samples[0]["actions"] if action["actionIndex"] == 20)
    assert first_pack["targetCount"] == 3 and first_pack["hitCount"] == 9
    assert sorted(target["recordedDamage"] for target in first_pack["targets"]) == [13815, 13815, 20721]
    assert sum(sample["multiTargetActions"] for sample in samples[1:]) == 0
    mouchette_decoded = json.loads((OBS / "replay-batch-112/decoded.json").read_text(encoding="utf-8"))["decoded"]
    mouchette_build = next(role for role in mouchette_decoded["battleDat"]["roleData"]
                           if role.get("tid") == 94450)
    result = {
        "schemaVersion": 1,
        "kind": "RETROSPECTIVE_MOB_CLEAR_CANDIDATE_AUDIT",
        "sources": samples,
        "mouchettePackContext": {
            "stageId": mouchette_decoded["battleDat"]["stageId"],
            "mouchetteLevel": mouchette_build["level"],
            "mouchettePotencyLevel": mouchette_build["potencyLevel"],
            "mortalBlastSkillLevel": next(slot["level"] for slot in mouchette_build["slots"]
                                          if slot["tid"] == 122483),
        },
        "limitations": [
            "Historical replays with different builds and encounters; none uses the proposed E0 team.",
            "Only the sampled Mouchette replay shows three targets hit by one Mortal Blast action.",
            "The sampled Helot actions hit one target each; these do not validate multi-enemy coverage in gameplay.",
            "Targets may have been damaged before these cards. No team clear, tier-7 simulation, or blind holdout is established.",
        ],
    }
    OUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"samples": [{k: row[k] for k in ("label", "observedActions", "multiTargetActions")}
                                  for row in samples]}, indent=2))


if __name__ == "__main__":
    main()
