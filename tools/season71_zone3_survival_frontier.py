"""Replay-conditioned HP budget for Season 71 Zone 3; not a battle clear sim.

Uses the sanitized enemy audit. Each turn's hypothetical Block is fresh and
expires after that turn; healing is applied at turn start. Incoming hit values
already reflect the recorded enemy states, so this does not reapply Weakness.
"""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "research/evidence/season71-zone3-example-enemy-audit.json"
OUTPUT = ROOT / "research/evidence/season71-zone3-survival-frontier.json"


def survive(rows, max_changes, horizon, block_each_turn, heal_each_turn=0):
    hp = 3141
    max_hp = 3141
    minimum_hp = hp
    by_turn = {turn: [] for turn in range(1, horizon + 1)}
    for row in rows:
        if 1 <= row["turn"] <= horizon:
            by_turn[row["turn"]].append(row)
    changes = {(c["turn"], c["record"]): c["maxHp"] for c in max_changes}
    for turn in range(1, horizon + 1):
        hp = min(max_hp, hp + heal_each_turn)
        block = block_each_turn
        for row in by_turn[turn]:
            damage = row["incomingBeforeBlock"]
            absorbed = min(block, damage)
            block -= absorbed
            hp -= damage - absorbed
            if hp <= 0:
                return False, hp
            key = (turn, row["record"])
            if key in changes:
                max_hp = changes[key]
                hp = min(hp, max_hp)
        minimum_hp = min(minimum_hp, hp)
    return True, minimum_hp


def minimum_block(rows, changes, horizon, healing):
    lower, upper = 0, 20000
    while lower < upper:
        mid = (lower + upper) // 2
        if survive(rows, changes, horizon, mid, healing)[0]:
            upper = mid
        else:
            lower = mid + 1
    return lower


def main():
    audit = json.loads(SOURCE.read_text(encoding="utf-8"))
    rows = audit["enemyHitsToPlayer"]
    changes = audit["playerMaxHpChanges"]
    assert audit["stageId"] == 153505
    assert [c["maxHp"] for c in changes] == [2513, 2011, 1609, 1288]
    horizons = [4, 8, 11, 16]
    healing = [0, 250, 500]
    frontier = [{"throughTurn": turn,
                 "minimumFreshBlockPerTurnByHealing": {
                     str(heal): minimum_block(rows, changes, turn, heal)
                     for heal in healing}}
                for turn in horizons]
    for case in frontier:
        turn = case["throughTurn"]
        for heal_text, threshold in case["minimumFreshBlockPerTurnByHealing"].items():
            heal = int(heal_text)
            assert survive(rows, changes, turn, threshold, heal)[0]
            if threshold:
                assert not survive(rows, changes, turn, threshold - 1, heal)[0]
    result = {
        "kind": "REPLAY_CONDITIONED_SURVIVAL_FRONTIER_NOT_CLEAR_SIM",
        "sourceAudit": "research/evidence/season71-zone3-example-enemy-audit.json",
        "initialPlayerHp": audit["initialPlayerHp"],
        "observedTotalIncomingBeforeBlock": sum(r["incomingBeforeBlock"] for r in rows),
        "observedIncomingByTurn": {str(turn): sum(r["incomingBeforeBlock"] for r in rows if r["turn"] == turn)
                                   for turn in range(1, 17)},
        "frontier": frontier,
        "damageFloors": {
            "unmodifiedTwoBarsHp": 2671629 + 5343258,
            "minimumAverageDamagePerTurnIfNoHpGrowthAndNoAddDamage": {
                str(turn): round((2671629 + 5343258) / turn)
                for turn in horizons
            },
            "firstObservedAddHp": audit["firstSpawnedEnemyMaxHp"],
            "hypotheticalLotanE7PureHitAt15PercentTargetMaxHp": {
                "firstBossBar": round(2671629 * 0.15),
                "secondBossBar": round(5343258 * 0.15),
                "firstAdd": round(audit["firstSpawnedEnemyMaxHp"] * 0.15),
            },
            "addHpRemainingAfterThatOnePureHit": round(audit["firstSpawnedEnemyMaxHp"] * 0.85),
            "mouchetteE3BlastThreeEqualHitsNeededToFinishOneAddAfterThatHit":
                math.ceil(audit["firstSpawnedEnemyMaxHp"] * 0.85 / 3),
        },
        "model": ["Observed post-state incoming hits held fixed, in replay order.",
                  "Fresh fixed Block at the start of every turn; unused Block expires.",
                  "Fixed healing at each turn start, capped by current maximum HP.",
                  "Observed maximum-HP reductions applied after that event's hit.",
                  "No resource, card, Wheel, relic, damage, or kill simulation."],
        "limitations": ["Hypothetical healing/Block values are thresholds, not any character's measured output.",
                        "Counterfactual team or faster kills change enemy actions and damage.",
                        "Player's replay had two deaths and respawns; this hypothetical model starts fresh and disallows them.",
                        "The same turn number may contain multiple enemy hits; the model preserves their order."],
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"frontier": frontier, "totalIncoming": result["observedTotalIncomingBeforeBlock"]}))


if __name__ == "__main__":
    main()
