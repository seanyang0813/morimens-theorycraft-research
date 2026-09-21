"""Promote a mechanical capture candidate after explicit private user attestation."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Attestation timestamp must carry an offset")
    return parsed.astimezone(timezone.utc)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", required=True, type=Path)
    parser.add_argument("--private-attestation", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    candidate_path, attestation_path, output = (value.resolve() for value in (args.candidate, args.private_attestation, args.output))
    try:
        candidate_path.relative_to(ROOT / "research" / "evidence")
        output.relative_to(ROOT / "research" / "evidence")
        attestation_path.relative_to(ROOT / "research" / "raw")
    except ValueError as error:
        raise ValueError("Candidate/output must be public evidence and attestation must remain private") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite reviewed capture evidence")
    candidate = json.loads(candidate_path.read_text(encoding="utf-8"))
    attestation_bytes = attestation_path.read_bytes()
    attestation = json.loads(attestation_bytes)
    if candidate.get("schemaVersion") != 1 or candidate.get("kind") != "MORIMENS_REPLAY_SESSION_CAPTURE_EVIDENCE" or candidate.get("status") != "CAPTURE_CANDIDATE_REQUIRES_CONTROLLED_BATTLE_REVIEW":
        raise ValueError("Unreviewed session capture candidate required")
    if attestation.get("schemaVersion") != 1 or attestation.get("kind") != "MORIMENS_PRIVATE_CONTROLLED_PVE_ATTESTATION" or attestation.get("containerSha256") != candidate.get("containerSha256"):
        raise ValueError("Matching private controlled-PvE attestation required")
    required = ("controlledPveBattleCompletedAfterBaseline", "loadedRecordIsThatBattle")
    if any(attestation.get(key) is not True for key in required) or not isinstance(attestation.get("attestedAtUtc"), str):
        raise ValueError("Explicit controlled battle and matching record confirmation required")
    attested_at = utc(attestation["attestedAtUtc"])
    candidate_created_at = utc(candidate.get("createdAtUtc", ""))
    if attested_at < candidate_created_at:
        raise ValueError("Attestation predates the mechanically validated capture candidate")
    if attested_at > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise ValueError("Attestation timestamp is implausibly far in the future")
    report = json.loads(json.dumps(candidate))
    report["status"] = "REVIEWED_SAME_SESSION_CONTROLLED_PVE_CAPTURE"
    report["reviewedAtUtc"] = datetime.now(timezone.utc).isoformat()
    report["sessionChecks"]["controlledPveBattleConfirmed"] = True
    report["privateAttestationCommitment"] = {"sha256": hashlib.sha256(attestation_bytes).hexdigest(), "identifiersPublished": False}
    report.pop("requirementsForReview", None)
    report["scope"] = "Reviewed same-process, post-baseline, controlled-PvE capture provenance for the exact container; no replay or player identifier is published."
    report["limitations"] = ["This artifact establishes capture/build provenance only; prediction chronology and exact gameplay agreement remain separate requirements", "The private user attestation is committed by hash and requires authorized review"]
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(output.relative_to(ROOT)), "status": report["status"], "build": report["build"]["id"], "combatDomain": report["combatDomain"]}))


if __name__ == "__main__":
    main()
