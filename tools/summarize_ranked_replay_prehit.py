"""Publish an identifier-free aggregate of a privately captured ranked replay."""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
from pathlib import Path

from attribute_replay_catalog_builds import normalize


ROOT = Path(__file__).resolve().parents[1]
BLOCKERS = {
    "Unknown or nonfinite command value GrowArgValue3": "UNRESOLVED_GROW_ARG_VALUE",
    "At least one ordinary Active row required": "NO_ORDINARY_ACTIVE_ROW",
    "Unsupported state-attached Active parameter shape": "STATE_ATTACHED_ACTIVE_SHAPE",
    "Recorded direct-hit count must be a positive multiple of command repetition count": "REPETITION_WINDOW_AMBIGUOUS",
    "Unknown or nonfinite command value PlayerRole.tentacle_dmg_show": "UNRESOLVED_TENTACLE_SHOW_DAMAGE",
    "Positive-repeat zero-subtype Active hit required": "UNSUPPORTED_ACTIVE_SUBTYPE_OR_REPEAT",
}


def read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def catalog_counts(embedded: dict, old: dict, current: dict) -> dict:
    counts = collections.Counter()
    for row_id, row in embedded.items():
        before = normalize(row) == normalize(old.get(row_id))
        after = normalize(row) == normalize(current.get(row_id))
        counts["both" if before and after else "beforeOnly" if before else "currentOnly" if after else "neither"] += 1
    return {key: counts[key] for key in ("both", "beforeOnly", "currentOnly", "neither")}


def comparison_counts(compared: list[dict], expected_count: int, expected_exact: int) -> dict:
    if len(compared) != expected_count:
        raise ValueError("Audit comparison count differs from its hit rows")
    differences = []
    for row in compared:
        comparison = row.get("observedBranchComparison")
        difference = comparison.get("difference") if isinstance(comparison, dict) else None
        if isinstance(difference, bool) or not isinstance(difference, (int, float)) or not math.isfinite(difference):
            raise ValueError("Every compared hit requires a finite observed-branch difference")
        differences.append(difference)
    exact = sum(difference == 0 for difference in differences)
    if exact != expected_exact:
        raise ValueError("Audit exact-match count differs from its hit rows")
    return {
        "mismatchCompared": len(differences) - exact,
        "largestAbsoluteDifference": max(map(abs, differences), default=0),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    for name in ("audit", "decoded", "index", "delta", "baseline", "output"):
        parser.add_argument(f"--{name}", type=Path, required=True)
    parser.add_argument("--rank", type=int, required=True)
    parser.add_argument("--wave", type=int, required=True)
    parser.add_argument("--difficulty", required=True)
    args = parser.parse_args()
    audit, decoded, index, delta = (read(getattr(args, name)) for name in ("audit", "decoded", "index", "delta"))
    if audit.get("status") != "RETROSPECTIVE_DIAGNOSTIC_ONLY" or audit.get("build") != "pc-res153-build51":
        raise ValueError("A bounded resource-153 retrospective audit is required")
    if audit["sourceCommitments"]["decodedSha256"] != sha(args.decoded) or audit["sourceCommitments"]["indexSha256"] != sha(args.index):
        raise ValueError("Audit source commitments do not match private inputs")
    results = [row for row in delta.get("results", []) if row.get("validContainer")]
    if len(results) != 1 or results[0].get("sha256") != decoded.get("inputSha256") or delta.get("newReferenceCount") != 1:
        raise ValueError("Exactly one newly loaded valid replay container is required")
    if sha(args.baseline) != delta.get("privateBaselineSha256"):
        raise ValueError("Same-process baseline commitment differs")
    if results[0].get("modifiedAfterBaseline"):
        raise ValueError("This summary is for an older ranked replay, not a new battle")
    modules = ROOT / "research/observations"
    catalogs = {}
    embedded = decoded["decoded"]["resourceRecords"]
    for name in ("Skill", "Cmd"):
        old = read(modules / f"current-res151-build51/modules/{name}.json")
        current = read(modules / f"current-res153-build51/modules/{name}.json")
        catalogs[name] = catalog_counts(embedded[name], old, current)
    compared = [row for row in audit["hits"] if row["status"] == "BRANCH_COMPARISON"]
    blocker_counts = collections.Counter(BLOCKERS.get(row.get("blocker"), "OTHER_UNRESOLVED") for row in audit["hits"] if row["status"] == "BLOCKED")
    comparison_summary = comparison_counts(compared, audit["counts"]["compared"], audit["counts"]["exactObservedBranch"])
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_RANKED_REPLAY_PREHIT_AGGREGATE",
        "status": "RETROSPECTIVE_CROSS_BUILD_DIAGNOSTIC_ONLY",
        "uiContext": {"mode": "D Tide", "leaderboardRank": args.rank, "wave": args.wave, "difficulty": args.difficulty, "provenance": "observed in the Morimens playback UI"},
        "playbackClientBuild": "pc-res153-build51",
        "recordedCombatBuild": "UNATTRIBUTED",
        "sourceCommitments": {
            "privateBaselineSha256": sha(args.baseline), "privateDeltaSha256": sha(args.delta),
            "decodedSha256": sha(args.decoded), "indexSha256": sha(args.index),
            "containerSha256": decoded["inputSha256"],
        },
        "capture": {"newReferenceCount": delta["newReferenceCount"], "validContainerCount": len(results), "containerModifiedAfterBaseline": False, "sameProcess": delta["process"]["startedAtUtc"] == read(args.baseline)["process"]["startedAtUtc"]},
        "scale": {"replayRecords": len(decoded["decoded"]["unZippedRecord"]), "cardActions": len(index.get("actionSnapshots", [])), "hits": audit["counts"]["hits"]},
        "adapterCoverage": {**audit["counts"], **comparison_summary, "criticalCompared": sum(row["observed"]["isCrit"] for row in compared), "noncriticalCompared": sum(not row["observed"]["isCrit"] for row in compared), "blockedByCode": {key: blocker_counts[key] for key in sorted(blocker_counts)}},
        "embeddedCatalogRelationToPinnedBuilds": catalogs,
        "scope": "Pre-hit ordinary Active direct-card comparisons only. Branches were calculated before selecting the recorded critical outcome; the selection and comparison were retrospective.",
        "limitations": [
            "The replay existed before this capture; playback on resource 153 does not prove which combat build recorded it.",
            "Some embedded Skill and Cmd rows match neither pinned resource-151 nor resource-153 catalog, so current-build gameplay validation is not claimed.",
            "This is one ranked replay, with no frozen pre-outcome prediction or holdout credit.",
            "Excluded hit paths are counted separately in adapterCoverage; their damage totals must not be inferred from the direct-card comparisons.",
            "Any mismatches remain visible in mismatchCompared and largestAbsoluteDifference rather than being omitted from the report.",
            "No player or replay identifier is published.",
        ],
    }
    if not report["capture"]["sameProcess"]:
        raise ValueError("Playback process changed after the baseline")
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "coverage": report["adapterCoverage"]}))


if __name__ == "__main__":
    main()
