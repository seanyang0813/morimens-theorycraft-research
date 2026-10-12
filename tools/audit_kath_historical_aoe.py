"""Sanitize one historical Kathigu-Ra multi-target D-Tide action."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "research/observations/replay-batch-61"
OUT = ROOT / "research/evidence/kath-historical-aoe-audit.json"


def main() -> None:
    decoded_bytes = (SOURCE / "decoded.json").read_bytes()
    index_bytes = (SOURCE / "compact-index.json").read_bytes()
    decoded = json.loads(decoded_bytes)["decoded"]
    index = json.loads(index_bytes)
    stage_id = str(decoded["battleDat"]["stageId"])
    stage = decoded["resourceRecords"]["Stage"][stage_id]
    assert "69期D4" in stage["CnID"]
    kath = next(role for role in decoded["battleDat"]["roleData"] if role["tid"] == 77913)
    assert (kath["level"], kath["potencyLevel"]) == (90, 15)
    action = next(row for row in index["actionSnapshots"] if row["actionIndex"] == 159)
    assert action["cards"][str(action["cardUid"])]["configId"] == 97916
    hits = [event["data"]["beHitConfig"] for event in action["window"]["hits"]
            if event["data"]["beHitConfig"].get("skillConfigId") == 97916]
    assert len(hits) == 2 and len({hit["destRoleUid"] for hit in hits}) == 2
    targets = sorted(({
        "targetMaxHp": hit["curMaxHp"],
        "hpBeforeHit": hit["oldHp"],
        "hpAfterHit": hit["curHp"],
        "observedHpLoss": hit["oldHp"] - hit["curHp"],
    } for hit in hits), key=lambda row: row["targetMaxHp"], reverse=True)
    assert [row["observedHpLoss"] for row in targets] == [7013528, 6211186]
    result = {
        "schemaVersion": 1,
        "kind": "HISTORICAL_KATH_AOE_OBSERVATION",
        "sourceDecodedSha256": hashlib.sha256(decoded_bytes).hexdigest(),
        "sourceIndexSha256": hashlib.sha256(index_bytes).hexdigest(),
        "stage": "Season 69, D-Tide wave 4, highest listed difficulty",
        "stageRecommendedLevel": stage["RecLevel"],
        "kathLevel": kath["level"],
        "kathPotencyLevel": kath["potencyLevel"],
        "gigaflareSkillLevel": next(slot["level"] for slot in kath["slots"] if slot["tid"] == 97912),
        "observedSkill": "Kathigu-Ra transformed Gigaflare (97916)",
        "targets": targets,
        "limitations": [
            "One late action in an older season with an E15 Kathigu-Ra; not an E3 damage prediction.",
            "The target HP values and observed HP losses do not expose all buffs, relics or earlier setup.",
            "This is not a Season 71 replay, full mob clear, or validation of a proposed four-character team.",
        ],
    }
    OUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"stage": result["stage"], "targets": targets}, indent=2))


if __name__ == "__main__":
    main()
