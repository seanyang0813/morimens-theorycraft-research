"""Inventory replay metadata without retaining player or replay identifiers.

The indexed replay files can exceed a gigabyte.  This tool streams only the
top-level ``battleDat`` object, then discards all fields except stage metadata
and roster investment signals.  Output is restricted to the ignored private
observations directory because dynamic stage IDs can still be useful linkage
data even after direct identifiers are removed.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OBSERVATIONS = ROOT / "research" / "observations"
DEFAULT_BATTLE_CONFIG = ROOT / "research" / "extracted" / "config" / "BattleConfig.json"
DEFAULT_AWAKER_CONFIG = ROOT / "research" / "extracted" / "config" / "AwakerConfig.json"
INVESTMENT_FIELDS = (
    "characterLevelSum", "highestCharacterLevel", "maxLevelCharacterCount",
    "potencyLevelSum", "highestPotencyLevel", "slotLevelSum",
)


def _read_json_object_after_key(path: Path, key: str, chunk_size: int = 1024 * 1024):
    marker = f'"{key}"'.encode()
    prefix = bytearray()
    with path.open("rb") as stream:
        while True:
            chunk = stream.read(chunk_size)
            if not chunk:
                raise ValueError(f"Missing top-level key {key!r}: {path}")
            prefix.extend(chunk)
            marker_at = prefix.find(marker)
            if marker_at >= 0:
                break
            if len(prefix) > len(marker) * 2:
                del prefix[:-len(marker) * 2]

        colon_at = prefix.find(b":", marker_at + len(marker))
        while colon_at < 0:
            chunk = stream.read(chunk_size)
            if not chunk:
                raise ValueError(f"Missing value for {key!r}: {path}")
            prefix.extend(chunk)
            colon_at = prefix.find(b":", marker_at + len(marker))

        start = colon_at + 1
        while True:
            while start < len(prefix) and chr(prefix[start]).isspace():
                start += 1
            if start < len(prefix):
                break
            chunk = stream.read(chunk_size)
            if not chunk:
                raise ValueError(f"Missing value for {key!r}: {path}")
            prefix.extend(chunk)

        opening = prefix[start]
        if opening not in (ord("{"), ord("[")):
            raise ValueError(f"Expected object or array for {key!r}: {path}")
        closing = ord("}") if opening == ord("{") else ord("]")
        value = bytearray()
        depth = 0
        quoted = False
        escaped = False
        offset = start
        while True:
            if offset >= len(prefix):
                chunk = stream.read(chunk_size)
                if not chunk:
                    raise ValueError(f"Unterminated value for {key!r}: {path}")
                prefix = bytearray(chunk)
                offset = 0
            byte = prefix[offset]
            value.append(byte)
            offset += 1
            if quoted:
                if escaped:
                    escaped = False
                elif byte == ord("\\"):
                    escaped = True
                elif byte == ord('"'):
                    quoted = False
                continue
            if byte == ord('"'):
                quoted = True
            elif byte == opening:
                depth += 1
            elif byte == closing:
                depth -= 1
                if depth == 0:
                    return json.loads(value)


def _number(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) else 0


def _slot_levels(role):
    levels = []
    for slot in role.get("slots") or []:
        level = slot.get("level") if isinstance(slot, dict) else None
        if isinstance(level, (int, float)) and not isinstance(level, bool):
            levels.append(level)
    return levels


def _display_name(row):
    value = row.get("Name") if isinstance(row, dict) else None
    if not isinstance(value, str):
        return None
    return value.split("|", 1)[-1]


def _safe_roster(battle_dat, awaker_config):
    rows = []
    for role in battle_dat.get("roleData") or []:
        if not isinstance(role, dict):
            continue
        awakening_id = role.get("tid")
        rows.append({
            "awakenerId": awakening_id,
            "awakenerName": _display_name(awaker_config.get(str(awakening_id), {})),
            "level": role.get("level"),
            "potencyLevel": role.get("potencyLevel"),
            "breakLevel": role.get("breakLevel"),
            "likeLevel": role.get("likeLevel"),
            "slotLevels": _slot_levels(role),
        })
    rows.sort(key=lambda row: (row["awakenerId"] is None, row["awakenerId"] or 0))
    return rows


def _investment(roster):
    return {
        "characterLevelSum": sum(_number(row.get("level")) for row in roster),
        "highestCharacterLevel": max((_number(row.get("level")) for row in roster), default=0),
        "maxLevelCharacterCount": sum(row.get("level") == 90 for row in roster),
        "potencyLevelSum": sum(_number(row.get("potencyLevel")) for row in roster),
        "highestPotencyLevel": max((_number(row.get("potencyLevel")) for row in roster), default=0),
        "slotLevelSum": sum(sum(row.get("slotLevels") or []) for row in roster),
        "wheelEnhancement": None,
    }


def _template_wave(cn_id):
    if not isinstance(cn_id, str):
        return None
    match = re.search(r"_(\d+)$", cn_id)
    return int(match.group(1)) if match else None


def _dominates(left, right):
    pairs = [(left.get(key), right.get(key)) for key in INVESTMENT_FIELDS]
    pairs = [(a, b) for a, b in pairs if isinstance(a, (int, float)) and isinstance(b, (int, float))]
    return bool(pairs) and all(a <= b for a, b in pairs) and any(a < b for a, b in pairs)


def build_inventory(paths, battle_config, awaker_config=None, domain_by_capture=None):
    awaker_config = awaker_config or {}
    domain_by_capture = domain_by_capture or {}
    captures = []
    for path in sorted(paths):
        battle_dat = _read_json_object_after_key(path, "battleDat")
        battle_tid = battle_dat.get("battleTid")
        config = battle_config.get(str(battle_tid), {})
        roster = _safe_roster(battle_dat, awaker_config)
        combat_domain = domain_by_capture.get(path.parent.name)
        captures.append({
            "captureLabel": path.parent.name,
            "stageId": battle_dat.get("stageId"),
            "battleTid": battle_tid,
            "battleTemplate": config.get("CnID"),
            "templateWave": _template_wave(config.get("CnID")),
            "difficultyId": battle_dat.get("difficultyId"),
            "gameplayType": battle_dat.get("gameplayType"),
            "playerLevel": battle_dat.get("playerLevel"),
            "accountPower": battle_dat.get("accountPower"),
            "combatDomain": combat_domain or "UNREVIEWED",
            "eligibleForPveBudget": combat_domain == "PVE_MONSTER_TARGETS",
            "investmentSignals": _investment(roster),
            "roster": roster,
        })

    groups = defaultdict(list)
    for row in captures:
        key = (row["stageId"], row["battleTid"], row["difficultyId"], row["templateWave"])
        groups[key].append(row["captureLabel"])
    coordinate_groups = []
    for key, labels in groups.items():
        if len(labels) < 2:
            continue
        coordinate_groups.append({
            "stageId": key[0],
            "battleTid": key[1],
            "difficultyId": key[2],
            "templateWave": key[3],
            "candidateCount": len(labels),
            "captureLabels": labels,
        })
    coordinate_groups.sort(key=lambda row: (-row["candidateCount"], row["captureLabels"]))

    pve_groups = []
    eligible = [row for row in captures if row["eligibleForPveBudget"]]
    eligible_groups = defaultdict(list)
    for row in eligible:
        key = (row["stageId"], row["battleTid"], row["difficultyId"], row["templateWave"])
        eligible_groups[key].append(row)
    for key, members in eligible_groups.items():
        if len(members) < 2:
            continue
        frontier = [
            row for row in members
            if not any(_dominates(other["investmentSignals"], row["investmentSignals"])
                       for other in members if other is not row)
        ]
        frontier.sort(key=lambda row: tuple(row["investmentSignals"].get(field, float("inf"))
                                            for field in INVESTMENT_FIELDS))
        pve_groups.append({
            "stageId": key[0], "battleTid": key[1], "difficultyId": key[2], "templateWave": key[3],
            "candidateCount": len(members), "frontierCount": len(frontier),
            "captureLabels": [row["captureLabel"] for row in members],
            "frontierCaptureLabels": [row["captureLabel"] for row in frontier],
        })
    pve_groups.sort(key=lambda row: (-row["candidateCount"], row["captureLabels"]))
    return {
        "schemaVersion": 1,
        "kind": "MORIMENS_PRIVATE_REPLAY_INVENTORY",
        "privacy": "Direct player, replay, battle-instance and role-instance identifiers omitted",
        "analysisTrack": "budget-scouting",
        "method": "Exact stage/battle/difficulty/wave groups with a Pareto frontier; no weighted score",
        "comparedFields": list(INVESTMENT_FIELDS),
        "captureCount": len(captures),
        "combatDomainCounts": dict(sorted(Counter(row["combatDomain"] for row in captures).items())),
        "pveBudgetEligibleCaptureCount": len(eligible),
        "templateCounts": dict(sorted(Counter(row["battleTemplate"] or "UNRESOLVED" for row in captures).items())),
        "coordinateGroups": coordinate_groups,
        "pveComparableGroups": pve_groups,
        "captures": captures,
        "limitations": [
            "This is a budget-scouting inventory, not cheese analysis or theorycrafting evidence",
            "Only captures independently classified PVE_MONSTER_TARGETS may enter a D-Tide budget frontier",
            "Dynamic stage IDs are server metadata and do not resolve through the shipped client config",
            "A template wave parsed from a battle name is recorded separately from server stage identity",
            "Wheel enhancement is absent from the replay role payload",
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-glob", default="replay-batch-*/index.json")
    parser.add_argument("--battle-config", type=Path, default=DEFAULT_BATTLE_CONFIG)
    parser.add_argument("--awaker-config", type=Path, default=DEFAULT_AWAKER_CONFIG)
    parser.add_argument("--domain-audit", action="append", type=Path, default=[])
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    try:
        output.relative_to(OBSERVATIONS.resolve())
    except ValueError as error:
        raise ValueError("Inventory output must stay inside research/observations") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite inventory")
    paths = list(OBSERVATIONS.glob(args.input_glob))
    if not paths:
        raise ValueError("No replay indexes matched")
    battle_config = json.loads(args.battle_config.read_text(encoding="utf-8"))
    awaker_config = json.loads(args.awaker_config.read_text(encoding="utf-8"))
    domain_by_capture = {}
    for audit_path in args.domain_audit:
        audit = json.loads(audit_path.read_text(encoding="utf-8"))
        rows = audit if isinstance(audit, list) else audit.get("replays", [])
        for row in rows:
            label, domain = row.get("observationId"), row.get("combatDomain")
            if label and domain:
                domain_by_capture[label] = domain
    report = build_inventory(paths, battle_config, awaker_config, domain_by_capture)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({
        "captureCount": report["captureCount"],
        "coordinateGroupCount": len(report["coordinateGroups"]),
        "pveComparableGroupCount": len(report["pveComparableGroups"]),
        "output": str(output.relative_to(ROOT)),
    }, indent=2))


if __name__ == "__main__":
    main()
