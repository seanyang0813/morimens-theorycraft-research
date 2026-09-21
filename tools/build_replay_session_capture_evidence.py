"""Build an identifier-free, pre-review capture candidate from private session files."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
UUID = re.compile(r"^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$")
BUNDLES = ("share.ab", "gamescript.ab", "foundation.ab")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path: Path) -> tuple[bytes, dict]:
    data = path.read_bytes()
    value = json.loads(data)
    if not isinstance(value, dict):
        raise ValueError(f"JSON object required: {path.name}")
    return data, value


def utc(value: str) -> datetime:
    normalized = re.sub(r"(\.\d{6})\d+(?=(?:Z|[+-]\d\d:\d\d)$)", r"\1", value)
    parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Capture timestamps must carry an offset")
    return parsed.astimezone(timezone.utc)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--private-baseline", required=True, type=Path)
    parser.add_argument("--private-delta", required=True, type=Path)
    parser.add_argument("--public-baseline", required=True, type=Path)
    parser.add_argument("--build-evidence", required=True, type=Path)
    parser.add_argument("--container", required=True, type=Path)
    parser.add_argument("--domain-report", required=True, type=Path)
    parser.add_argument("--install-root", required=True, type=Path)
    parser.add_argument("--candidate-index", required=True, type=int)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    paths = {name: getattr(args, name).resolve() for name in ("private_baseline", "private_delta", "public_baseline", "build_evidence", "container", "domain_report", "install_root", "output")}
    for name in ("private_baseline", "private_delta", "container", "domain_report"):
        try: paths[name].relative_to(ROOT / "research")
        except ValueError as error: raise ValueError("Private capture inputs must stay in the research workspace") from error
    try: paths["output"].relative_to(ROOT / "research" / "evidence")
    except ValueError as error: raise ValueError("Public capture evidence must stay under research/evidence") from error
    if paths["output"].exists():
        raise FileExistsError("Refusing to overwrite capture evidence")

    baseline_bytes, baseline = read(paths["private_baseline"])
    delta_bytes, delta = read(paths["private_delta"])
    public_bytes, public = read(paths["public_baseline"])
    build_bytes, build = read(paths["build_evidence"])
    _, domain = read(paths["domain_report"])
    if baseline.get("kind") != "MORIMENS_PRIVATE_REPLAY_SESSION_BASELINE" or delta.get("kind") != "MORIMENS_PRIVATE_REPLAY_SESSION_DELTA":
        raise ValueError("Matching private session baseline and delta required")
    private_baseline_sha = hashlib.sha256(baseline_bytes).hexdigest()
    if delta.get("privateBaselineSha256") != private_baseline_sha:
        raise ValueError("Session delta does not bind the supplied private baseline")
    if public.get("kind") != "MORIMENS_REPLAY_SESSION_BASELINE_COMMITMENT" or public.get("status") != "COMMITTED_PRE_BATTLE_BASELINE" or public.get("privateBaselineCommitment", {}).get("sha256") != private_baseline_sha:
        raise ValueError("Public pre-battle commitment does not bind the supplied private baseline")
    process_before, process_after = baseline.get("process", {}), delta.get("process", {})
    if process_before.get("pid") != process_after.get("pid") or process_before.get("startedAtUtc") != process_after.get("startedAtUtc") or process_before.get("executableSha256") != process_after.get("executableSha256"):
        raise ValueError("Session delta came from a different process")
    before_refs = baseline.get("replayReferences")
    if not isinstance(before_refs, list) or any(not isinstance(item, str) or not UUID.fullmatch(item) for item in before_refs):
        raise ValueError("Valid private baseline reference inventory required")
    results = delta.get("results")
    if not isinstance(results, list) or args.candidate_index < 0 or args.candidate_index >= len(results):
        raise ValueError("Candidate index is outside the private session delta")
    selected = results[args.candidate_index]
    replay_uuid = selected.get("uuid")
    if not isinstance(replay_uuid, str) or not UUID.fullmatch(replay_uuid) or replay_uuid in set(before_refs):
        raise ValueError("Selected replay reference was not newly observed after the baseline")
    container_hash = sha(paths["container"])
    if selected.get("privateFile") != paths["container"].name or selected.get("sha256") != container_hash or selected.get("bytes") != paths["container"].stat().st_size or selected.get("validContainer") is not True:
        raise ValueError("Selected private container does not match the session delta")
    baseline_time, delta_time = utc(baseline["capturedAtUtc"]), utc(delta["capturedAtUtc"])
    object_time = utc(selected.get("objectLastModifiedUtc", ""))
    if object_time < baseline_time or object_time > delta_time + timedelta(minutes=5):
        raise ValueError("Replay object timestamp is outside the committed post-baseline capture interval")
    if domain.get("schemaVersion") != 1 or domain.get("kind") != "MORIMENS_REPLAY_COMBAT_DOMAIN" or domain.get("inputSha256") != container_hash or domain.get("combatDomain") != "PVE_MONSTER_TARGETS" or not isinstance(domain.get("completeHitSnapshots"), int) or domain["completeHitSnapshots"] <= 0:
        raise ValueError("Outcome-free PvE domain report for the selected container required")

    if build.get("kind") != "MORIMENS_PC_COMBAT_BUILD_COMPARISON" or build.get("currentBuild") != public.get("build", {}).get("id"):
        raise ValueError("Build evidence differs from the pre-battle commitment")
    download = paths["install_root"] / "_game_data_" / "DownLoad"
    live_hashes = {"versionManifest": sha(download / "_version.json"), "bundles": {name: sha(download / name) for name in BUNDLES}}
    expected = build.get("sourceHashes", {})
    if live_hashes["versionManifest"] != expected.get("versionManifest") or any(live_hashes["bundles"][name] != expected.get("bundles", {}).get(name, {}).get("sha256") for name in BUNDLES):
        raise ValueError("Installed combat build changed after the pre-battle commitment")
    if sha(paths["install_root"] / "Morimens.exe") != process_before.get("executableSha256"):
        raise ValueError("Installed executable changed after the pre-battle commitment")

    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_REPLAY_SESSION_CAPTURE_EVIDENCE",
        "status": "CAPTURE_CANDIDATE_REQUIRES_CONTROLLED_BATTLE_REVIEW",
        "analysisTrack": "verification",
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "build": {"id": build["currentBuild"], "evidencePath": str(paths["build_evidence"].relative_to(ROOT)).replace("\\", "/"), "evidenceSha256": hashlib.sha256(build_bytes).hexdigest()},
        "containerSha256": container_hash,
        "combatDomain": domain["combatDomain"],
        "baselineCommitment": {"path": str(paths["public_baseline"].relative_to(ROOT)).replace("\\", "/"), "sha256": hashlib.sha256(public_bytes).hexdigest(), "privateBaselineSha256": private_baseline_sha},
        "privateCaptureCommitment": {"sha256": hashlib.sha256(delta_bytes).hexdigest(), "identifiersPublished": False},
        "timing": {"baselineCapturedAtUtc": baseline_time.isoformat(), "objectLastModifiedUtc": object_time.isoformat(), "deltaCapturedAtUtc": delta_time.isoformat()},
        "sessionChecks": {"sameProcessStart": True, "sameExecutable": True, "installedBuildUnchanged": True, "newReferenceAbsentFromBaseline": True, "controlledPveBattleConfirmed": False, "containerPreservedBeforeDecode": True},
        "requirementsForReview": ["The user must confirm that this newly appearing reference is the controlled PvE battle completed after the baseline", "Review must occur before this artifact can be included as recorded-build evidence in a frozen prediction"],
        "scope": "Mechanically validated same-process, post-baseline, PvE capture candidate; no replay or player identifier is published.",
        "limitations": ["This candidate is not reviewed same-session evidence and cannot receive holdout or publication credit", "The outcome-free domain check establishes PvE target type, not stage, difficulty, strategy or prediction correctness"],
    }
    paths["output"].parent.mkdir(parents=True, exist_ok=True)
    paths["output"].write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(paths["output"].relative_to(ROOT)), "status": report["status"], "build": report["build"]["id"], "combatDomain": report["combatDomain"]}))


if __name__ == "__main__":
    main()
