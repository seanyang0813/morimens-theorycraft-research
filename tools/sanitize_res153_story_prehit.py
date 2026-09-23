"""Commit an identifier-free retrospective resource-153 story replay audit."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path, expected_root: str) -> dict:
    resolved = path.resolve()
    resolved.relative_to(ROOT / "research" / expected_root)
    return json.loads(resolved.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", required=True, type=Path)
    parser.add_argument("--delta", required=True, type=Path)
    parser.add_argument("--decoded", required=True, type=Path)
    parser.add_argument("--index", required=True, type=Path)
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument("--domain", required=True, type=Path)
    parser.add_argument("--account-uid", required=True, type=int)
    parser.add_argument("--stage-id", required=True, type=int)
    parser.add_argument("--stage-name", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    output = args.output.resolve()
    output.relative_to(ROOT / "research" / "evidence")
    if output.exists():
        raise FileExistsError("Refusing to overwrite evidence")

    baseline = load(args.baseline, "evidence")
    delta = load(args.delta, "raw")
    decoded = load(args.decoded, "observations")
    index = load(args.index, "observations")
    audit = load(args.audit, "observations")
    domain = load(args.domain, "observations")

    if baseline.get("status") != "COMMITTED_PRE_BATTLE_BASELINE":
        raise ValueError("Committed pre-battle baseline required")
    if baseline.get("build", {}).get("id") != "pc-res153-build51":
        raise ValueError("Expected resource-153 build commitment")
    if delta.get("privateBaselineSha256") != baseline["privateBaselineCommitment"]["sha256"]:
        raise ValueError("Delta does not bind the committed private baseline")
    if delta["process"]["startedAtUtc"] != baseline["session"]["processStartedAtUtc"]:
        raise ValueError("Game process changed")
    if delta["process"]["executableSha256"] != baseline["session"]["executableSha256"]:
        raise ValueError("Executable changed")
    if decoded.get("kind") != "MORIMENS_DECODED_REPLAY":
        raise ValueError("Decoded replay required")
    battle = decoded["decoded"]["battleDat"]
    if battle.get("playerUid") != args.account_uid:
        raise ValueError("Replay account does not match")
    if battle.get("stageId") != args.stage_id:
        raise ValueError("Replay stage does not match")
    stage = decoded["decoded"]["resourceRecords"]["Stage"][str(args.stage_id)]
    if stage.get("Name", "").split("|")[-1] != args.stage_name:
        raise ValueError("Embedded stage name does not match")

    matches = [row for row in delta["results"] if row.get("sha256") == decoded["inputSha256"]]
    if len(matches) != 1 or not matches[0].get("validContainer") or not matches[0].get("modifiedAfterBaseline"):
        raise ValueError("Replay must be one retrievable post-baseline container")
    selected = matches[0]
    if domain.get("inputSha256") != decoded["inputSha256"] or domain.get("combatDomain") != "PVE_MONSTER_TARGETS":
        raise ValueError("Selected replay must be PvE")
    if index.get("inputSha256") != decoded["inputSha256"]:
        raise ValueError("Index does not bind the selected replay")
    if audit.get("status") != "RETROSPECTIVE_DIAGNOSTIC_ONLY":
        raise ValueError("Expected retrospective audit")
    if audit.get("build") != baseline["build"]["id"]:
        raise ValueError("Audit build differs from the pre-battle baseline")
    commitments = audit.get("sourceCommitments", {})
    if commitments != {
        "indexSha256": digest(args.index),
        "decodedSha256": digest(args.decoded),
        "containerSha256": decoded["inputSha256"],
    }:
        raise ValueError("Audit does not bind the selected replay and index")
    if audit.get("counts", {}).get("hits") != len(index.get("hits", [])):
        raise ValueError("Audit and index hit counts differ")
    statuses = Counter(hit["status"] for hit in audit["hits"])
    compared = [hit for hit in audit["hits"] if hit["status"] == "BRANCH_COMPARISON"]
    if len(compared) != audit["counts"]["compared"]:
        raise ValueError("Compared-hit count differs")
    if any(hit["observedBranchComparison"]["difference"] != 0 for hit in compared):
        raise ValueError("A compared hit disagrees with the recorded branch")
    if statuses != Counter({
        "BRANCH_COMPARISON": audit["counts"]["compared"],
        "NON_PLAYED_CARD_HIT": audit["counts"]["nonPlayedCardHits"],
        "BLOCKED": audit["counts"]["blocked"],
    }):
        raise ValueError("Audit status totals differ")

    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_RES153_STORY_PREHIT_RETROSPECTIVE_EVIDENCE",
        "analysisTrack": "verification",
        "status": "RETROSPECTIVE_DIAGNOSTIC_ONLY",
        "baselineCommitment": {
            "path": args.baseline.resolve().relative_to(ROOT).as_posix(),
            "sha256": digest(args.baseline),
        },
        "privateCommitments": {
            "deltaSha256": digest(args.delta),
            "decodedSha256": digest(args.decoded),
            "indexSha256": digest(args.index),
            "auditSha256": digest(args.audit),
            "identifiersPublished": False,
        },
        "selectedContainerSha256": decoded["inputSha256"],
        "selectedContainerLastModifiedUtc": selected.get("objectLastModifiedUtc"),
        "sameProcessAndExecutable": True,
        "selectedObjectModifiedAfterBaseline": True,
        "selectedAccountMatchedPrivately": True,
        "stage": {"id": args.stage_id, "name": args.stage_name, "difficulty": "Hard"},
        "combatDomain": domain["combatDomain"],
        "viewingClientBuild": baseline["build"]["id"],
        "replay": {
            "records": index["counts"]["records"],
            "events": index["counts"]["events"],
            "cardUses": len(index["cardUses"]),
            "hits": len(index["hits"]),
        },
        "activePrehitAudit": {
            **audit["counts"],
            "criticalOutcomes": dict(Counter("critical" if hit["observed"]["isCrit"] else "noncritical" for hit in compared)),
            "largestAbsoluteDifference": max((abs(hit["observedBranchComparison"]["difference"]) for hit in compared), default=None),
            "blockers": dict(Counter(hit.get("blocker", "") for hit in audit["hits"] if hit["status"] == "BLOCKED")),
        },
        "publicationCredit": False,
        "limitations": [
            "The battle outcome was visible before decoding and calculation; this is not a blind holdout.",
            "The recorded critical flags select the matching calculated branches after the outcome; random draws were not predicted.",
            "Hits from triggered effects and unsupported command shapes are excluded from the Active-hit comparison.",
            "The viewing client and same-process capture match resource 153, but the replay does not encode an engine build field.",
            "No account, player, replay UUID, role-instance or card-instance identifier is published.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": output.relative_to(ROOT).as_posix(), "counts": report["activePrehitAudit"]}, ensure_ascii=True))


if __name__ == "__main__":
    main()
