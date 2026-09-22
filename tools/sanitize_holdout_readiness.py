"""Publish an identifier-free verification recipe from a private readiness audit."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
NAMES = {122483: "Mortal Blast", 122484: "Shining Tornado", 123159: "Dramatic Encounter", 122488: "Strike"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    audit, output = args.audit.resolve(), args.output.resolve()
    try:
        audit.relative_to(ROOT / "research" / "raw")
        output.relative_to(ROOT / "research" / "evidence")
    except ValueError as error:
        raise ValueError("Readiness audit must stay private and output must stay in public evidence") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite holdout-readiness evidence")
    value = json.loads(audit.read_text(encoding="utf-8"))
    if value.get("kind") != "MORIMENS_PRIVATE_HOLDOUT_READINESS_AUDIT" or value.get("analysisTrack") != "verification" or value.get("characterTid") != 94450:
        raise ValueError("Mouchette verification-readiness audit required")
    expected = {
        123159: (27, 104, 109),
        122484: (24, 104, 104),
        122483: (17, 104, 109),
        122488: (1, 109, 109),
    }
    rows = {row.get("skillId"): row for row in value.get("skills", [])}
    if value.get("replayCount") != 102 or value.get("completeHitSnapshots") != 7948 or value.get("deterministicExactHits") != 69 or value.get("deterministicMismatches") != 0 or set(rows) != set(expected):
        raise ValueError("Unexpected Mouchette readiness totals")
    for skill_id, (count, low, high) in expected.items():
        row = rows[skill_id]
        if (row.get("count"), row.get("minCritChanceCeil"), row.get("maxCritChanceCeil")) != (count, low, high):
            raise ValueError(f"Unexpected readiness values for skill {skill_id}")
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_HOLDOUT_READINESS_RECIPE",
        "status": "RETROSPECTIVE_RECIPE_REQUIRES_FRESH_CONTROLLED_RUN",
        "analysisTrack": "verification",
        "character": {"name": "Mouchette", "clientConfigId": 94450},
        "corpus": {"replays": 102, "completeHitSnapshots": 7948, "privateAuditSha256": hashlib.sha256(audit.read_bytes()).hexdigest(), "identifiersPublished": False},
        "deterministicExactHits": value["deterministicExactHits"],
        "deterministicMismatches": value["deterministicMismatches"],
        "skills": [
            {"skillId": skill_id, "name": NAMES[skill_id], "exactHits": expected[skill_id][0], "capturedCritChanceCeilRange": [expected[skill_id][1], expected[skill_id][2]]}
            for skill_id in (122483, 122484, 123159, 122488)
        ],
        "nextControlledRun": {
            "requiredPreHitCondition": "Captured calculated critical chance ceiling is at least 100, making the result deterministic without an RNG draw value.",
            "preferredDirectCards": ["Mortal Blast", "Shining Tornado"],
            "procedure": [
                "Commit the live-session replay-reference baseline before battle.",
                "Use Mouchette with a pre-hit critical chance ceiling of at least 100 and play a supported direct card.",
                "Capture and freeze the first complete deterministic ordinary-Active candidate before revealing its recorded damage.",
                "Reveal only after the prediction freeze and required resource-151 build evidence are committed.",
            ],
        },
        "limitations": [
            "The archive was decoded before calculation and has unknown recorded engine builds, so its matches are retrospective only.",
            "The recipe does not prove that a specific live account or battle currently satisfies the critical-chance condition.",
            "This verification plan is not a theorycraft recommendation, cheese classification or budget-build ranking.",
            "Only a fresh prediction-before-reveal run can produce holdout or publication credit.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(output.relative_to(ROOT)), "status": report["status"], "deterministicExactHits": report["deterministicExactHits"]}, indent=2))


if __name__ == "__main__":
    main()
