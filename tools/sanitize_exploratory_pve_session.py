"""Publish an identifier-free diagnostic for one completed, outcome-visible PvE run."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--delta", type=Path, required=True)
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--decoded", type=Path, required=True)
    parser.add_argument("--player-uid", type=int, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    baseline_path, delta_path, audit_path, decoded_path, output = (
        path.resolve() for path in (args.baseline, args.delta, args.audit, args.decoded, args.output)
    )
    for path, root in ((baseline_path, "evidence"), (delta_path, "raw"),
                       (audit_path, "observations"), (decoded_path, "observations"),
                       (output, "evidence")):
        path.relative_to(ROOT / "research" / root)
    if output.exists():
        raise FileExistsError("Refusing to overwrite evidence")

    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    delta = json.loads(delta_path.read_text(encoding="utf-8"))
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    decoded = json.loads(decoded_path.read_text(encoding="utf-8"))
    if baseline.get("status") != "COMMITTED_PRE_BATTLE_BASELINE":
        raise ValueError("Committed pre-battle baseline required")
    if delta.get("privateBaselineSha256") != baseline["privateBaselineCommitment"]["sha256"]:
        raise ValueError("Delta does not reference the committed private baseline")
    if delta["process"]["startedAtUtc"] != baseline["session"]["processStartedAtUtc"]:
        raise ValueError("Process start changed")
    if delta["process"]["executableSha256"] != baseline["session"]["executableSha256"]:
        raise ValueError("Executable changed")
    if decoded.get("kind") != "MORIMENS_DECODED_REPLAY":
        raise ValueError("Decoded replay required")
    battle = decoded["decoded"]["battleDat"]
    if battle.get("playerUid") != args.player_uid:
        raise ValueError("Selected replay belongs to a different account")
    matches = [row for row in delta["results"] if row.get("sha256") == decoded["inputSha256"]]
    if len(matches) != 1 or matches[0].get("modifiedAfterBaseline") is not True:
        raise ValueError("Selected replay must be a unique post-baseline container")
    selected = matches[0]
    if len([row for row in audit if row.get("containerSha256") == selected["sha256"]]) != 1:
        raise ValueError("Selected replay must have exactly one audit row")
    row = next(row for row in audit if row.get("containerSha256") == selected["sha256"])
    if row.get("combatDomain") != "PVE_MONSTER_TARGETS":
        raise ValueError("Selected replay must be classified as PvE")
    if row.get("calculationBuild") != baseline["build"]["id"]:
        raise ValueError("Audit calculation build differs from installed build")
    if row.get("deterministicMismatches") or row.get("rngBranchMismatches"):
        raise ValueError("Calculator mismatch requires private investigation before publishing")
    fields = ("records", "events", "cardUses", "hits", "completeHitSnapshots",
              "retrospectiveActiveCandidates", "deterministicExactChecks",
              "exactRngBranchConsistencyChecks", "deterministicMismatches",
              "rngBranchMismatches")
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_EXPLORATORY_PVE_SESSION_AUDIT",
        "analysisTrack": "verification",
        "status": "RETROSPECTIVE_DIAGNOSTIC_ONLY",
        "baselineCommitment": {"path": baseline_path.relative_to(ROOT).as_posix(), "sha256": digest(baseline_path)},
        "privateDeltaCommitment": {"sha256": digest(delta_path), "identifiersPublished": False},
        "privateAuditCommitment": {"sha256": digest(audit_path), "identifiersPublished": False},
        "selectedContainerSha256": selected["sha256"],
        "selectedContainerLastModifiedUtc": selected.get("objectLastModifiedUtc"),
        "sameProcessAndExecutable": True,
        "selectedObjectModifiedAfterBaseline": True,
        "selectedAccountMatchedPrivately": True,
        "stage": "Chapter 1-7 Normal",
        "combatDomain": row["combatDomain"],
        "calculationBuild": row["calculationBuild"],
        "totals": {key: row[key] for key in fields},
        "captureInventory": {
            "newReferences": delta["newReferenceCount"],
            "retrievableContainers": sum(item.get("validContainer") is True for item in delta["results"]),
            "selectedOwnBattleContainers": 1,
        },
        "publicationCredit": False,
        "limitations": [
            "Damage was visible during play and the replay was decoded before calculation; this is not a blind holdout.",
            "The stage contains multiple combats and its record screen also loaded other players' replays; only the privately matched account container is audited here.",
            "Critical random draws are not reconstructed; branch consistency does not establish an exact predicted result.",
            "The installed executable and resources were unchanged in the same process, but the replay does not explicitly encode the engine build.",
            "No player, account, replay, role-instance or card-instance identifier is published.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": output.relative_to(ROOT).as_posix(), "totals": report["totals"]}))


if __name__ == "__main__":
    main()
