"""Publish an identifier-free retrospective audit for an unreviewed capture candidate."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--private-audit", required=True, type=Path)
    parser.add_argument("--capture-candidate", required=True, type=Path)
    parser.add_argument("--compatibility-evidence", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    audit_path, candidate_path, compatibility_path, output = (
        value.resolve() for value in (args.private_audit, args.capture_candidate, args.compatibility_evidence, args.output)
    )
    try:
        audit_path.relative_to(ROOT / "research" / "observations")
        candidate_path.relative_to(ROOT / "research" / "evidence")
        compatibility_path.relative_to(ROOT / "research" / "evidence")
        output.relative_to(ROOT / "research" / "evidence")
    except ValueError as error:
        raise ValueError("Private audit and public evidence paths must remain in their designated roots") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite controlled replay audit evidence")
    rows = json.loads(audit_path.read_text(encoding="utf-8"))
    candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
    compatibility = json.loads(compatibility_path.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or len(rows) != 1:
        raise ValueError("Exactly one private replay audit row required")
    row = rows[0]
    if candidate.get("kind") != "MORIMENS_REPLAY_SESSION_CAPTURE_EVIDENCE" or candidate.get("status") != "CAPTURE_CANDIDATE_REQUIRES_CONTROLLED_BATTLE_REVIEW":
        raise ValueError("Unreviewed controlled capture candidate required")
    if row.get("containerSha256") != candidate.get("containerSha256"):
        raise ValueError("Private audit does not match the capture candidate")
    if row.get("calculationBuild") != "pc-res151-build51" or row.get("recordedCombatBuild") is not None:
        raise ValueError("Expected a resource-151 calculation with recorded build still unreviewed")
    if compatibility.get("status") != "SUPPORTED_FOR_NARROW_REPLAY_ADAPTER_BY_EXACT_CARRYFORWARD" or compatibility.get("afterBuild") != "pc-res151-build51":
        raise ValueError("Resource-151 adapter compatibility evidence required")
    expected_blockers = {
        "At least one ordinary Active row required": 33,
        "Played card must resolve to its captured Awakener owner": 34,
        "Recorded hit must be ordinary Active damage type 1": 2,
        "Single captured enemy monster target required": 2,
    }
    if row.get("candidateBlockers") != expected_blockers:
        raise ValueError("Unexpected candidate blocker inventory")
    totals = {
        key: row.get(key)
        for key in (
            "records", "events", "cardUses", "hits", "completeHitSnapshots",
            "retrospectiveActiveCandidates", "deterministicExactChecks", "deterministicMismatches",
            "exactRngBranchConsistencyChecks", "rngBranchMismatches",
        )
    }
    if totals != {
        "records": 202, "events": 2973, "cardUses": 30, "hits": 77, "completeHitSnapshots": 77,
        "retrospectiveActiveCandidates": 6, "deterministicExactChecks": 0, "deterministicMismatches": 0,
        "exactRngBranchConsistencyChecks": 6, "rngBranchMismatches": 0,
    }:
        raise ValueError("Unexpected controlled replay audit totals")
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_CONTROLLED_REPLAY_RETROSPECTIVE_AUDIT_CANDIDATE",
        "status": "SAME_BATTLE_REVIEW_PENDING",
        "analysisTrack": "verification",
        "captureCandidate": {"path": str(candidate_path.relative_to(ROOT)).replace("\\", "/"), "sha256": sha(candidate_path)},
        "adapterCompatibility": {"path": str(compatibility_path.relative_to(ROOT)).replace("\\", "/"), "sha256": sha(compatibility_path)},
        "privateAuditCommitment": {"sha256": sha(audit_path), "identifiersPublished": False},
        "calculationBuild": row["calculationBuild"],
        "recordedCombatBuild": None,
        "combatDomain": row["combatDomain"],
        "totals": totals,
        "excludedHits": [
            {"reason": reason, "count": count} for reason, count in expected_blockers.items()
        ],
        "scope": "Retrospective ordinary Active damage branch consistency for one mechanically isolated resource-151 capture candidate.",
        "limitations": [
            "The user has not yet attested that the candidate container is the controlled battle loaded in the same session, so recorded build remains unconfirmed.",
            "Outcomes were decoded before calculation; this is not prediction-before-reveal evidence and cannot receive holdout or publication credit.",
            "Six chance-dependent hits match one independently evaluated critical branch; the random draw itself is not reconstructed.",
            "Excluded hit categories are not evaluated and contribute no agreement claim.",
            "No player, account, replay, role-instance or card-instance identifier is published.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(output.relative_to(ROOT)), "status": report["status"], "totals": totals}, indent=2))


if __name__ == "__main__":
    main()
