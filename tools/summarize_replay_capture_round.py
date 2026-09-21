"""Publish an identifier-free aggregate for one private replay audit round."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--blind-eligible", required=True, type=int)
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError("Refusing to overwrite public capture report")
    rows = json.loads(args.audit.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or not rows:
        raise ValueError("Private audit must be a nonempty replay list")
    if not 0 <= args.blind_eligible <= len(rows):
        raise ValueError("Blind-eligible count is outside the audited replay count")

    summed = {
        key: sum(int(row.get(key, 0)) for row in rows)
        for key in (
            "records",
            "events",
            "cardUses",
            "hits",
            "completeHitSnapshots",
            "unknownCommands",
            "unknownEvents",
            "retrospectiveActiveCandidates",
            "deterministicExactChecks",
            "deterministicMismatches",
            "exactRngBranchConsistencyChecks",
            "rngBranchMismatches",
        )
    }
    role_type_names = {"1": "Awakener", "2": "Monster", "3": "Player", "unknown": "Unknown"}
    target_role_types: dict[str, int] = {}
    for row in rows:
        for role_type, count in row.get("completeHitTargetRoleTypes", {}).items():
            label = role_type_names.get(str(role_type), f"ProtocolRoleType{role_type}")
            target_role_types[label] = target_role_types.get(label, 0) + int(count)
    if sum(target_role_types.values()) != summed["completeHitSnapshots"]:
        raise ValueError("Target-role classification must cover every complete hit snapshot")
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_SANITIZED_REPLAY_CAPTURE_ROUND",
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(),
        "analysisTrack": "verification",
        "identifiersPublished": False,
        "rawArtifactsPublished": False,
        "privateAuditSha256": hashlib.sha256(args.audit.read_bytes()).hexdigest(),
        "scope": (
            "Aggregate acquisition and adapter-eligibility evidence only. Recorded combat builds are unknown. "
            "The records may be routed to separate budget-scouting or cheese-analysis artifacts, but this report "
            "does not make either claim and cannot supply a theorycraft conclusion or publication-gate holdout."
        ),
        "totals": {"replays": len(rows), **summed, "completeHitTargetRoleTypes": target_role_types},
        "blindSelection": {
            "eligibleReplays": args.blind_eligible,
            "frozenPredictions": 0,
            "selector": "first complete deterministic Active candidate with a complete direct-hit identity boundary",
            "outcome": "NO_ELIGIBLE_CANDIDATE" if args.blind_eligible == 0 else "ELIGIBLE_NOT_FROZEN_BY_THIS_REPORT",
        },
        "claimBoundary": {
            "allowed": [
                "native replay containers decoded and indexed privately",
                "bounded verification adapter eligibility counts",
                "protocol unknown-command and unknown-event counts",
            ],
            "forbidden": [
                "cheese classification",
                "budget-build ranking",
                "optimal theorycraft sequence",
                "current-build attribution",
                "independent gameplay holdout credit",
            ],
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(args.output), "replays": len(rows), "blindEligible": args.blind_eligible}))


if __name__ == "__main__":
    main()
