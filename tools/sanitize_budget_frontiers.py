"""Publish identifier-free PvE budget frontiers from a private replay inventory."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


FORBIDDEN_KEYS = {"captureLabel", "captureLabels", "frontierCaptureLabels", "stageId", "playerUid", "battleUuid", "battleUid"}
INVESTMENT_FIELDS = (
    "characterLevelSum", "highestCharacterLevel", "maxLevelCharacterCount",
    "potencyLevelSum", "highestPotencyLevel", "slotLevelSum", "wheelEnhancement",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sanitize_inventory(inventory: dict, source_hash: str) -> dict:
    if inventory.get("kind") != "MORIMENS_PRIVATE_REPLAY_INVENTORY" or inventory.get("analysisTrack") != "budget-scouting":
        raise ValueError("Private budget-scouting inventory required")
    captures = inventory.get("captures")
    groups = inventory.get("pveComparableGroups")
    if not isinstance(captures, list) or not isinstance(groups, list) or not groups:
        raise ValueError("At least one comparable PvE group required")
    by_label = {row.get("captureLabel"): row for row in captures}
    if len(by_label) != len(captures) or None in by_label:
        raise ValueError("Unique private capture labels required")

    public_groups = []
    frontier_total = 0
    for group_index, group in enumerate(groups, 1):
        labels = group.get("frontierCaptureLabels")
        if not isinstance(labels, list) or not labels:
            raise ValueError("Every comparable group needs a nonempty frontier")
        members = [by_label.get(label) for label in labels]
        if any(member is None or member.get("combatDomain") != "PVE_MONSTER_TARGETS" for member in members):
            raise ValueError("Every published frontier member must be independently routed PvE")
        coordinates = {(row.get("battleTid"), row.get("battleTemplate"), row.get("templateWave"), row.get("difficultyId")) for row in members}
        if len(coordinates) != 1:
            raise ValueError("Frontier members must share exact public comparison coordinates")
        battle_tid, battle_template, template_wave, difficulty_id = coordinates.pop()
        candidates = []
        for candidate_index, row in enumerate(members, 1):
            roster = []
            for member in row.get("roster") or []:
                roster.append({
                    "awakenerId": member.get("awakenerId"),
                    "awakenerName": member.get("awakenerName"),
                    "level": member.get("level"),
                    "potencyLevel": member.get("potencyLevel"),
                    "breakLevel": member.get("breakLevel"),
                    "likeLevel": member.get("likeLevel"),
                    "slotLevels": list(member.get("slotLevels") or []),
                })
            candidates.append({
                "candidateId": f"group-{group_index}-candidate-{candidate_index}",
                "investmentSignals": {key: row.get("investmentSignals", {}).get(key) for key in INVESTMENT_FIELDS},
                "roster": roster,
            })
        frontier_total += len(candidates)
        public_groups.append({
            "groupId": f"group-{group_index}",
            "battleTid": battle_tid,
            "battleTemplate": battle_template,
            "templateWave": template_wave,
            "serverDifficultyId": difficulty_id,
            "comparedRecords": group.get("candidateCount"),
            "frontierCandidates": candidates,
        })

    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_SANITIZED_PVE_BUDGET_FRONTIERS",
        "analysisTrack": "budget-scouting",
        "identifiersPublished": False,
        "sourcePrivateInventorySha256": source_hash,
        "captureCount": inventory.get("captureCount"),
        "pveEligibleCaptureCount": inventory.get("pveBudgetEligibleCaptureCount"),
        "comparisonGroupCount": len(public_groups),
        "frontierCandidateCount": frontier_total,
        "groups": public_groups,
        "claimBoundary": {
            "allowed": ["observed roster and investment Pareto frontiers within exact replay coordinates"],
            "forbidden": ["cheese classification", "optimal theorycraft build", "damage verification", "blind holdout credit"],
        },
        "limitations": [
            "The server difficulty ID is retained but is not translated into a user-facing difficulty label",
            "Wheel enhancement is absent from replay role payloads",
            "A Pareto-frontier record is a budget-scouting candidate, not proof of optimality or a mechanic explanation",
        ],
    }
    pending = [report]
    while pending:
        value = pending.pop()
        if isinstance(value, dict):
            if FORBIDDEN_KEYS.intersection(value):
                raise ValueError("Forbidden private identifier key reached public budget report")
            pending.extend(value.values())
        elif isinstance(value, list):
            pending.extend(value)
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError("Refusing to overwrite public budget report")
    inventory = json.loads(args.inventory.read_text(encoding="utf-8"))
    report = sanitize_inventory(inventory, sha256(args.inventory))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(args.output), "groups": report["comparisonGroupCount"], "frontierCandidates": report["frontierCandidateCount"]}))


if __name__ == "__main__":
    main()
