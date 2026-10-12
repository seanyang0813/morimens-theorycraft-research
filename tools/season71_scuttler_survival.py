"""Read-only, enemy-only survival bounds from the connected Season 71 replay.

This is an HP-budget stress test, not a prospective battle simulator. It
deliberately ignores the recorded player's team and card choices.
"""

import json
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "research/observations/current-connected-20261012-01-index.json"
OUTPUT = ROOT / "research/evidence/season71-scuttler-survival-bounds.json"
RECORD_TURNS = {77: 2, 161: 3, 333: 6}


def main():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    assert data["battleDat"]["stageId"] == 153548
    init = data["initializations"][0]
    player = init["roleDataList"][0]
    boss = init["monsterDataList"][0]
    player_uid = player["uid"]
    boss_uid = boss["uid"]
    groups = defaultdict(list)
    for hit in data["hits"]:
        cfg = hit["data"]["beHitConfig"]
        if cfg["castRoleUid"] == boss_uid and cfg["targetRoleUid"] == player_uid:
            groups[hit["recordIndex"]].append(cfg)
    assert set(groups) == set(RECORD_TURNS)
    hp = player["properties"]["max_hp"]
    assert hp == 3193
    rounds = []
    cumulative = 0
    for record, turn in RECORD_TURNS.items():
        hits = groups[record]
        raw = sum(h["originVal"] for h in hits)
        cumulative += raw
        rounds.append({
            "turn": turn,
            "skillId": hits[0]["skillConfigId"],
            "hitValuesAlreadyUnderObservedEnemyStates": [h["originVal"] for h in hits],
            "incomingBeforeBlock": raw,
            "cumulativeIncomingBeforeBlock": cumulative,
            "netDefenseNeededFromFullHpToRemainAboveZero": max(0, cumulative - hp + 1),
        })
    assert [r["incomingBeforeBlock"] for r in rounds] == [2394, 1689, 2962]
    assert cumulative == 7045
    # An optimistic algebraic DR branch only: Murphy's Sacrifice is omitted.
    optimistic_dr = []
    running = 0
    for r in rounds:
        running += r["incomingBeforeBlock"] * 0.7
        optimistic_dr.append({
            "turn": r["turn"],
            "cumulativeIncomingIfAdditional30PercentDR": round(running, 1),
            "additionalNetDefenseNeeded": max(0, round(running - hp + 1, 1)),
        })
    result = {
        "kind": "BOUNDED_ENEMY_SURVIVAL_STRESS_TEST",
        "stageId": data["battleDat"]["stageId"],
        "bossInitialHpObserved": boss["properties"]["max_hp"],
        "baselinePlayerMaxHpObserved": hp,
        "baselinePlayerInitialHpObserved": player["properties"]["hp"],
        "enemyAttackRounds": rounds,
        "optimisticAdditional30PercentDRIgnoringSacrifice": optimistic_dr,
        "candidate": {
            "team": ["Mouchette", "Ramona", "Doll", "Ogier"],
            "breakpointEnlightenLevels": {"Mouchette": 3, "Ramona": 0, "Doll": 2, "Ogier": 3},
            "purpose": "Mouchette AoE, Ramona card reuse/Power reduction, Doll heal, Ogier repeatable shields; four Chaos members if Chaos Ring is present",
            "unverified": "No complete team survival or clear follows from these bounds.",
        },
        "limitations": [
            "One recorded boss battle, not the other preview monsters or an entire zone.",
            "Observed originVal is after any enemy states already active; do not apply Weakness again.",
            "Baseline HP is from a different recorded build, not this proposed team.",
            "No card draw, energy, damage, shielding, healing, block expiry, or boss AI counterfactual is simulated.",
            "Additional 30% DR branch excludes Murphy's Sacrifice and is not a recommended build prediction.",
        ],
    }
    OUTPUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
