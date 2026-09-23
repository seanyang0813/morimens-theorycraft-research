"""Publish an identifier-free deterministic-hit selection inventory.

This is outcome-first retrospective planning, never holdout evidence.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--private-audit", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "research/evidence/general-holdout-readiness.json")
    args = parser.parse_args()
    private, output = args.private_audit.resolve(), args.output.resolve()
    if not private.is_relative_to(ROOT / "research/raw") or not output.is_relative_to(ROOT / "research/evidence"):
        raise ValueError("Private audit and public output must stay in their designated roots")
    if output.exists():
        raise FileExistsError("Refusing to overwrite a public readiness report")
    audit = load(private)
    if (audit.get("kind") != "MORIMENS_PRIVATE_GENERAL_HOLDOUT_READINESS_AUDIT"
            or audit.get("analysisTrack") != "verification"
            or audit.get("recordedCombatBuild") is not None
            or audit.get("replayCount") != 102
            or audit.get("completeHitSnapshots") != 7948
            or audit.get("deterministicExactHits") != 182
            or audit.get("deterministicMismatches") != 0):
        raise ValueError("Expected the complete outcome-first PvE replay tranche")
    client = load(ROOT / "research/evidence/client-build-data-res151.json")
    catalog = load(ROOT / "website/dist/build-catalog.json")
    public_names = {row["id"]: row["name"] for row in catalog["characters"]}
    names = {row["clientId"]: public_names[row["characterId"]] for row in client["characters"]}
    private_skills = audit.get("skills")
    if not isinstance(private_skills, list) or len(private_skills) != 15 or sum(row.get("count", 0) for row in private_skills) != 182:
        raise ValueError("Unexpected deterministic skill inventory")
    if any(row.get("characterTid") not in names or row.get("minCritChanceCeil", 0) < 100
           or row.get("maxCritChanceCeil", 0) < row.get("minCritChanceCeil", 0)
           or not isinstance(row.get("skillId"), int) or not isinstance(row.get("tags"), list)
           for row in private_skills):
        raise ValueError("Unresolved character, skill or deterministic critical boundary")
    character_counts = Counter()
    skills = []
    for row in private_skills:
        character_counts[row["characterTid"]] += row["count"]
        skills.append({"characterName": names[row["characterTid"]],
                       "characterConfigId": row["characterTid"],
                       "skillConfigId": row["skillId"],
                       "skillTags": row["tags"],
                       "exactHitSnapshots": row["count"],
                       "capturedCritChanceCeilRange": [row["minCritChanceCeil"], row["maxCritChanceCeil"]]})
    if len(character_counts) != 7:
        raise ValueError("Unexpected deterministic character coverage")
    report = {"schemaVersion": 1, "kind": "MORIMENS_GENERAL_HOLDOUT_READINESS_RECIPE",
              "analysisTrack": "verification", "status": "RETROSPECTIVE_SELECTION_REQUIRES_FRESH_CONTROLLED_RUN",
              "corpus": {"replays": 102, "completeHitSnapshots": 7948,
                         "privateAuditSha256": hashlib.sha256(private.read_bytes()).hexdigest(),
                         "identifiersPublished": False},
              "deterministicExactHits": 182, "deterministicMismatches": 0,
              "characters": [{"name": names[tid], "clientConfigId": tid, "exactHitSnapshots": count}
                             for tid, count in character_counts.most_common()],
              "skills": skills,
              "nextControlledRun": [
                  "Commit a live same-session replay baseline before the battle.",
                  "Choose an accessible card with a captured pre-hit critical-chance ceiling of at least 100; this historical distribution does not prove a live account can reach it.",
                  "Freeze a complete ordinary-Active prediction under a reviewed current-build replay capture before revealing damage.",
              ],
              "limitations": [
                  "All 182 matches were calculated after the replay outcomes were decoded; none is an independent holdout or publication credit.",
                  "Recorded engine bytecode versions are unknown and historical skill frequency is not card availability, account accessibility or build quality.",
                  "Counts are hit snapshots, not distinct card actions, battles, players or independent replications.",
                  "Critical chances are reconstructed from captured retrospective inputs; a new live snapshot must prove its own deterministic condition.",
                  "No player, account, replay, role-instance or card-instance identifier is published.",
              ]}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(output.relative_to(ROOT)), "characters": len(character_counts), "skills": len(skills), "exactHits": 182}))


if __name__ == "__main__":
    main()
