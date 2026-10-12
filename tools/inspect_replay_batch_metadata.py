"""Index private replay containers by stage and initial battle without inspecting teams.

This is a scouting aid, not evidence that a record belongs to the current
rotation. Pair its results with a UI-observed season, wave, and difficulty.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from replay_codec import ReplayCodec, container_compstr


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--delta", required=True, type=Path)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    delta_path = args.delta.resolve()
    output_path = args.output.resolve()
    if args.limit < 1:
        raise ValueError("--limit must be positive")
    output_path.relative_to(ROOT / "research" / "observations")
    if output_path.exists():
        raise FileExistsError(output_path)

    delta = json.loads(delta_path.read_text(encoding="utf-8"))
    if delta.get("kind") != "MORIMENS_PRIVATE_REPLAY_SESSION_DELTA":
        raise ValueError("Expected private replay-session delta")
    battles = json.loads((ROOT / "research/extracted/config/BattleConfig.json").read_text(encoding="utf-8"))
    monsters = json.loads((ROOT / "research/extracted/config/MonsterConfig.json").read_text(encoding="utf-8"))
    candidates = sorted(
        (row for row in delta["results"] if row.get("validContainer") and row.get("privateFile")),
        key=lambda row: row.get("objectLastModifiedUtc") or "",
        reverse=True,
    )[: args.limit]
    codec = ReplayCodec()
    summary = []
    for row in candidates:
        source = delta_path.parent / row["privateFile"]
        decoded = codec.decode(container_compstr(source, "latin1", row.get("jsonEncoding", "latin1")))
        battle_dat = decoded.get("battleDat", {})
        battle_id = str(battle_dat.get("battleTid", ""))
        battle = battles.get(battle_id, {})
        monster_id = str(battle.get("Monster1", ""))
        monster = monsters.get(monster_id, {})
        summary.append({
            "privateFile": row["privateFile"],
            "objectLastModifiedUtc": row.get("objectLastModifiedUtc"),
            "stageId": battle_dat.get("stageId"),
            "battleTid": battle_id,
            "firstBattleMonsterId": monster_id,
            "firstBattleMonsterNameKey": monster.get("MonsterName"),
            "records": len(decoded.get("unZippedRecord", [])),
        })
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=True))


if __name__ == "__main__":
    main()
