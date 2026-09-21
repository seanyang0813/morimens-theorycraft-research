"""Publish identifier-free replay-domain routing summaries for separate tracks."""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build_reports(domain_rows, regression):
    if not isinstance(domain_rows, list) or not domain_rows:
        raise ValueError("Nonempty private domain audit required")
    by_id = {}
    role_totals = Counter()
    domain_totals = Counter()
    for row in domain_rows:
        label = row.get("observationId")
        domain = row.get("combatDomain")
        if not isinstance(label, str) or not label or label in by_id:
            raise ValueError("Unique private observation labels required")
        if domain not in {"PVE_MONSTER_TARGETS", "PVP_PLAYER_TARGETS", "MIXED_OR_UNKNOWN_TARGETS"}:
            raise ValueError("Recognized combat domain required")
        count = row.get("completeHitSnapshots")
        types = row.get("targetRoleTypes") or {}
        if not isinstance(count, int) or count < 0 or not isinstance(types, dict):
            raise ValueError("Finite domain counts required")
        if any(not isinstance(value, int) or value < 0 for value in types.values()) or sum(types.values()) != count:
            raise ValueError("Target-role counts must equal complete snapshots")
        by_id[label] = row
        domain_totals[domain] += 1
        role_totals.update(types)

    pve_count = domain_totals["PVE_MONSTER_TARGETS"]
    budget = {
        "schemaVersion": 1,
        "kind": "MORIMENS_SANITIZED_BUDGET_DOMAIN_ROUTING",
        "analysisTrack": "budget-scouting",
        "identifiersPublished": False,
        "captureCount": len(domain_rows),
        "completeHitSnapshots": sum(role_totals.values()),
        "combatDomains": dict(sorted(domain_totals.items())),
        "completeHitTargetRoleTypes": dict(sorted(role_totals.items())),
        "pveBudgetEligibleCaptureCount": pve_count,
        # A nonzero eligible set needs the separate coordinate-aware inventory
        # before comparable groups can be counted.  Zero is derivable here.
        "pveComparableGroupCount": 0 if pve_count == 0 else None,
        "claimBoundary": {
            "allowed": ["archive routing eligibility for later same-coordinate budget comparison"],
            "forbidden": ["cheese classification", "theorycraft conclusion", "damage verification", "build optimality"],
        },
        "scope": "A capture enters PvE budget scouting only when every complete hit target is a Monster. Mixed, Player-only and zero-complete-hit captures fail closed.",
    }

    corpus = regression.get("replays")
    if not isinstance(corpus, list) or not corpus:
        raise ValueError("Regression corpus rows required")
    routed = Counter()
    candidate_totals = Counter()
    complete_totals = Counter()
    for row in corpus:
        label = row.get("observationId")
        if label not in by_id:
            raise ValueError("Every regression replay requires a domain result")
        domain = by_id[label]["combatDomain"]
        candidates = row.get("retrospectiveActiveCandidates")
        complete = row.get("completeHitSnapshots")
        if not isinstance(candidates, int) or candidates < 0 or not isinstance(complete, int) or complete < 0:
            raise ValueError("Finite regression counts required")
        routed[domain] += 1
        candidate_totals[domain] += candidates
        complete_totals[domain] += complete
    if candidate_totals["PVP_PLAYER_TARGETS"]:
        raise ValueError("Player-only records must not contribute monster-target regression candidates")

    verification = {
        "schemaVersion": 1,
        "kind": "MORIMENS_SANITIZED_REGRESSION_DOMAIN_ROUTING",
        "analysisTrack": "verification",
        "identifiersPublished": False,
        "replayCount": len(corpus),
        "domains": {
            domain: {
                "replays": routed[domain],
                "completeHitSnapshots": complete_totals[domain],
                "retrospectiveActiveCandidates": candidate_totals[domain],
            }
            for domain in sorted(routed)
        },
        "totalRetrospectiveActiveCandidates": sum(candidate_totals.values()),
        "publicationCredit": False,
        "claimBoundary": {
            "allowed": ["provenance of retrospective monster-target component regressions"],
            "forbidden": ["whole-record PvE classification", "budget ranking", "cheese classification", "blind holdout credit"],
        },
        "scope": "The strict adapter requires each selected candidate hit to target a Monster. A mixed-domain source record remains mixed and does not become PvE evidence.",
    }
    return budget, verification


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--domain-audit", required=True, type=Path)
    parser.add_argument("--regression-audit", required=True, type=Path)
    parser.add_argument("--budget-output", required=True, type=Path)
    parser.add_argument("--verification-output", required=True, type=Path)
    args = parser.parse_args()
    domain_rows = json.loads(args.domain_audit.read_text(encoding="utf-8-sig"))
    regression = json.loads(args.regression_audit.read_text(encoding="utf-8"))
    budget, verification = build_reports(domain_rows, regression)
    source_hashes = {"privateDomainAudit": _sha(args.domain_audit), "publicRegressionAudit": _sha(args.regression_audit)}
    budget["sourceHashes"] = source_hashes
    verification["sourceHashes"] = source_hashes
    for path, report in ((args.budget_output, budget), (args.verification_output, verification)):
        output = path.resolve()
        try:
            output.relative_to(ROOT / "research" / "evidence")
        except ValueError as error:
            raise ValueError("Public routing summaries must stay under research/evidence") from error
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"captures": budget["captureCount"], "pveEligible": budget["pveBudgetEligibleCaptureCount"], "retrospectiveCandidates": verification["totalRetrospectiveActiveCandidates"]}))


if __name__ == "__main__":
    main()
