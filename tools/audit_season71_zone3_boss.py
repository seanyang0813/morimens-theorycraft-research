"""Sanitize the user-supplied Season 71 Zone 3 replay into enemy mechanics.

Private replay/container files remain under ignored research paths. The public
output has no keeper name, account ID, replay UUID, or role UID.
"""

import json
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "research/observations/zone3-example-20261013-index.json"
OUTPUT = ROOT / "research/evidence/season71-zone3-example-enemy-audit.json"


def main():
    data = json.loads(INDEX.read_text(encoding="utf-8"))
    assert data["battleDat"]["stageId"] == 153505
    init = data["initializations"][0]
    player = init["roleDataList"][0]
    assert len(init["monsterDataList"]) == 1
    boss = init["monsterDataList"][0]
    player_uid, boss_uid = player["uid"], boss["uid"]
    spawned = [e for e in data["events"] if e["eventName"] == "SpawnMonster"
               and e["data"]["roleData"].get("camp") == 2]
    spawn_uids = {e["data"]["roleData"]["uid"] for e in spawned}
    spawn_tids = {e["data"]["roleData"]["tid"] for e in spawned}
    assert len(spawn_tids) == 1
    phase = sorted((e for e in data["events"] if e["eventName"] == "ChangeBoutPhase"),
                   key=lambda e: (e["recordIndex"], e["frameIndex"]))

    def turn_at(record):
        prior = [e for e in phase if e["recordIndex"] <= record]
        return prior[-1]["data"]["boutNumber"] if prior else 0

    attacks = defaultdict(list)
    for event in data["hits"]:
        hit = event["data"]["beHitConfig"]
        if hit.get("targetRoleUid") != player_uid:
            continue
        caster = hit.get("castRoleUid")
        if caster not in spawn_uids and caster != boss_uid:
            continue
        source = "boss" if caster == boss_uid else "spawned_enemy"
        attacks[(event["recordIndex"], source, hit.get("skillConfigId"))].append(hit)
    attack_rows = []
    for (record, source, skill), hits in sorted(attacks.items()):
        attack_rows.append({
            "turn": turn_at(record), "record": record, "source": source,
            "skillId": skill, "hits": len(hits),
            "incomingBeforeBlock": sum(h.get("originVal", 0) for h in hits),
            "observedBlockLoss": sum(h.get("blockLose", 0) for h in hits),
            "observedHpLoss": sum(h.get("realDamage", 0) for h in hits),
        })
    max_hp = [{"turn": turn_at(e["recordIndex"]), "record": e["recordIndex"],
               "maxHp": e["data"]["value"]}
              for e in data["propertyChanges"]
              if e["data"].get("uid") == player_uid
              and e["data"].get("propertyType") == "max_hp"]
    boss_max_hp = [{"turn": turn_at(e["recordIndex"]), "record": e["recordIndex"],
                    "maxHp": e["data"]["value"]}
                   for e in data["propertyChanges"]
                   if e["data"].get("uid") == boss_uid
                   and e["data"].get("propertyType") == "max_hp"]
    finish = [e for e in data["events"] if e["eventName"] == "BattleFinish"]
    assert len(finish) == 1
    outcome = finish[0]["data"]["battleFinishData"]
    stats = outcome["statistics"]["BattleStats"]
    result = {
        "kind": "SEASON71_ZONE3_REPLAY_ENEMY_AUDIT",
        "sourceReplayContainerSha256": data["inputSha256"],
        "stageId": 153505,
        "initialBossHp": boss["properties"]["max_hp"],
        "initialPlayerHp": player["properties"]["hp"],
        "initialPlayerMaxHp": player["properties"]["max_hp"],
        "bossMaxHpChanges": boss_max_hp,
        "playerMaxHpChanges": max_hp,
        "spawnedEnemyCount": len(spawned),
        "spawnedEnemyTypes": len(spawn_tids),
        "firstSpawnedEnemyMaxHp": spawned[0]["data"]["roleData"]["properties"]["max_hp"],
        "enemyHitsToPlayer": attack_rows,
        "observedPosseUses": sum(e["eventName"] == "UseKeeperSkill" for e in data["events"]),
        "recordedRounds": stats["BoutCount"],
        "recordedPlayerDeaths": stats["PlayerDeathCount"],
        "recordedPlayerRespawns": outcome["roleRespawnedNum"],
        "recordedWinCamp": finish[0]["data"].get("winCamp"),
        "limitations": [
            "A retrospective successful replay; enemy attack values depend on that run's buffs and mitigation.",
            "The clear used respawns and is not evidence for a no-death attempt.",
            "Spawned-enemy actions and boss max-HP growth make static two-bar HP insufficient for a clear prediction.",
            "This audit does not simulate a proposed team, wheel loadout, card draw, Keyflare, or future battle.",
        ],
    }
    assert result["initialBossHp"] == 2671629
    assert [r["maxHp"] for r in max_hp] == [2513, 2011, 1609, 1288]
    assert len(spawned) == 27
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"bossHpEvents": len(boss_max_hp), "playerMaxHpEvents": len(max_hp),
                      "enemyHitGroups": len(attack_rows), "spawned": len(spawned),
                      "deaths": result["recordedPlayerDeaths"], "respawns": result["recordedPlayerRespawns"]}))


if __name__ == "__main__":
    main()
