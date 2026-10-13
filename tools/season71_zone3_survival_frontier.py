"""Replay-conditioned HP budget for Season 71 Zone 3; not a battle clear sim.

No candidate survival frontier is reported without explicit candidate player
HP. The replay HP belongs to a different team and is only a regression fixture.
"""

import argparse
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "research/evidence/season71-zone3-example-enemy-audit.json"
OUTPUT = ROOT / "research/evidence/season71-zone3-survival-frontier.json"


def survive(rows, max_changes, horizon, starting_hp, block_each_turn, heal_each_turn):
    hp = starting_hp
    max_hp = starting_hp
    minimum_hp = hp
    by_turn = {turn: [] for turn in range(1, horizon + 1)}
    for row in rows:
        if 1 <= row["turn"] <= horizon:
            by_turn[row["turn"]].append(row)
    changes = {(c["turn"], c["record"]) for c in max_changes}
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
                max_hp = math.ceil(max_hp * 0.8)
                hp = min(hp, max_hp)
        minimum_hp = min(minimum_hp, hp)
    return True, minimum_hp


def minimum_block(rows, changes, horizon, starting_hp, healing):
    lower, upper = 0, 20000
    while lower < upper:
        mid = (lower + upper) // 2
        if survive(rows, changes, horizon, starting_hp, mid, healing)[0]:
            upper = mid
        else:
            lower = mid + 1
    return lower


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate-hp", type=int,
                        help="Verified initial player max HP for the proposed build")
    parser.add_argument("--healing-per-turn", type=int,
                        help="Verified effective healing available at each turn start")
    args = parser.parse_args()
    if (args.candidate_hp is None) != (args.healing_per_turn is None):
        parser.error("candidate HP and healing must be supplied together")
    if args.candidate_hp is not None and (args.candidate_hp <= 0 or args.healing_per_turn < 0):
        parser.error("candidate HP must be positive and healing nonnegative")
    audit = json.loads(SOURCE.read_text(encoding="utf-8"))
    rows = audit["enemyHitsToPlayer"]
    changes = audit["playerMaxHpChanges"]
    assert audit["stageId"] == 153505
    assert [c["maxHp"] for c in changes] == [2513, 2011, 1609, 1288]
    horizons = [4, 8, 11, 16]
    # The reduction recurrence is checked against this replay, but the replay's
    # 3,141 HP must never become a default for another candidate's result.
    replay_hp = audit["initialPlayerMaxHp"]
    replay_reductions = []
    for _ in changes:
        replay_hp = math.ceil(replay_hp * 0.8)
        replay_reductions.append(replay_hp)
    assert replay_reductions == [c["maxHp"] for c in changes]
    frontier = None
    if args.candidate_hp is not None:
        frontier = []
        for turn in horizons:
            threshold = minimum_block(rows, changes, turn,
                                      args.candidate_hp, args.healing_per_turn)
            assert survive(rows, changes, turn, args.candidate_hp,
                           threshold, args.healing_per_turn)[0]
            if threshold:
                assert not survive(rows, changes, turn, args.candidate_hp,
                                   threshold - 1, args.healing_per_turn)[0]
            frontier.append({"throughTurn": turn, "minimumFreshBlockPerTurn": threshold})
    result = {
        "kind": "REPLAY_CONDITIONED_ENEMY_PRESSURE_NOT_CLEAR_SIM",
        "sourceAudit": "research/evidence/season71-zone3-example-enemy-audit.json",
        "replayPlayerHpNotCandidateHp": audit["initialPlayerHp"],
        "candidateInitialPlayerHp": args.candidate_hp,
        "candidateEffectiveHealingPerTurn": args.healing_per_turn,
        "observedTotalIncomingBeforeBlock": sum(r["incomingBeforeBlock"] for r in rows),
        "observedIncomingByTurn": {str(turn): sum(r["incomingBeforeBlock"] for r in rows if r["turn"] == turn)
                                   for turn in range(1, 17)},
        "candidateSurvivalFrontier": frontier,
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
                  "Each Equivalent Exchange cuts the supplied candidate maximum HP by 20%, with ceiling, after its hit.",
                  "No resource, card, Wheel, relic, damage, or kill simulation."],
        "limitations": ["No candidate survival result is calculated without candidate HP and healing inputs.",
                        "Even with inputs, required Block is a threshold, not Ogier's measured output.",
                        "Counterfactual team or faster kills change enemy actions and damage.",
                        "Player's replay had two deaths and respawns; this hypothetical model starts fresh and disallows them.",
                        "The same turn number may contain multiple enemy hits; the model preserves their order."],
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"candidateSurvivalFrontier": frontier,
                      "totalIncoming": result["observedTotalIncomingBeforeBlock"]}))


if __name__ == "__main__":
    main()
