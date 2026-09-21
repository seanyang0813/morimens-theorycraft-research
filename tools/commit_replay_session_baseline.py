"""Create a public, identifier-free commitment to a private live-session baseline."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
UUID = re.compile(r"^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$")
BUNDLES = ("share.ab", "gamescript.ab", "foundation.ab")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def utc(value: str) -> datetime:
    normalized = re.sub(r"(\.\d{6})\d+(?=(?:Z|[+-]\d\d:\d\d)$)", r"\1", value)
    parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("Session timestamps must carry a UTC offset")
    return parsed


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--private-baseline", required=True, type=Path)
    parser.add_argument("--build-evidence", required=True, type=Path)
    parser.add_argument("--install-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    baseline_path = args.private_baseline.resolve()
    build_path = args.build_evidence.resolve()
    install = args.install_root.resolve()
    output = args.output.resolve()
    try:
        baseline_path.relative_to(ROOT / "research" / "raw")
        output.relative_to(ROOT / "research" / "evidence")
    except ValueError as error:
        raise ValueError("Private input and public output must stay in their designated research directories") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite session commitment")

    baseline_bytes = baseline_path.read_bytes()
    baseline = json.loads(baseline_bytes)
    build_bytes = build_path.read_bytes()
    build = json.loads(build_bytes)
    if baseline.get("schemaVersion") != 1 or baseline.get("kind") != "MORIMENS_PRIVATE_REPLAY_SESSION_BASELINE":
        raise ValueError("Supported private session baseline required")
    references = baseline.get("replayReferences")
    if not isinstance(references, list) or references != sorted(set(references)) or any(not isinstance(value, str) or not UUID.fullmatch(value) for value in references):
        raise ValueError("Private replay-reference inventory must be sorted, unique and structurally valid")
    started = utc(baseline.get("process", {}).get("startedAtUtc", ""))
    captured = utc(baseline.get("capturedAtUtc", ""))
    if captured <= started:
        raise ValueError("Baseline must be captured after the live process started")
    if not isinstance(baseline.get("bytesRead"), int) or baseline["bytesRead"] <= 0:
        raise ValueError("Positive read coverage required")

    if build.get("schemaVersion") != 1 or build.get("kind") != "MORIMENS_PC_COMBAT_BUILD_COMPARISON" or not isinstance(build.get("currentBuild"), str):
        raise ValueError("Current PC combat-build evidence required")
    download = install / "_game_data_" / "DownLoad"
    live_hashes = {"versionManifest": sha(download / "_version.json"), "bundles": {name: sha(download / name) for name in BUNDLES}}
    expected = build.get("sourceHashes", {})
    if live_hashes["versionManifest"] != expected.get("versionManifest"):
        raise ValueError("Installed version manifest differs from committed build evidence")
    for name in BUNDLES:
        if live_hashes["bundles"][name] != expected.get("bundles", {}).get(name, {}).get("sha256"):
            raise ValueError(f"Installed {name} differs from committed build evidence")
    executable_hash = sha(install / "Morimens.exe")
    if executable_hash != baseline.get("process", {}).get("executableSha256"):
        raise ValueError("Live-session executable differs from the installed executable")

    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_REPLAY_SESSION_BASELINE_COMMITMENT",
        "status": "COMMITTED_PRE_BATTLE_BASELINE",
        "createdAtUtc": datetime.now(timezone.utc).isoformat(),
        "analysisTrack": "verification",
        "session": {
            "processStartedAtUtc": started.isoformat(),
            "baselineCapturedAtUtc": captured.isoformat(),
            "executableSha256": executable_hash,
        },
        "build": {
            "id": build["currentBuild"],
            "evidencePath": str(build_path.relative_to(ROOT)).replace("\\", "/"),
            "evidenceSha256": hashlib.sha256(build_bytes).hexdigest(),
            "installedSourceHashes": live_hashes,
        },
        "privateBaselineCommitment": {
            "sha256": hashlib.sha256(baseline_bytes).hexdigest(),
            "replayReferenceCount": len(references),
            "bytesRead": baseline["bytesRead"],
            "identifiersPublished": False,
        },
        "requirementsForLaterUse": [
            "A post-battle capture must prove the same process start and executable hash",
            "Private review must establish that the selected replay reference was absent from this committed baseline and first appeared after the controlled battle",
            "The retrieved object timestamp and container hash must be preserved before decoding",
            "The capture must be classified as PvE before entering the PvE calculator",
            "A prediction must be frozen and committed before any outcome is revealed",
        ],
        "scope": "Pre-battle live-session and installed-build commitment only; no replay identifier, player identifier, battle outcome or strategy is published.",
        "limitations": [
            "This artifact alone does not identify a future replay, prove that a battle occurred, establish the recorded combat build or receive holdout credit",
            "A process restart, installed-build change or replay reference already present in the private baseline invalidates the intended same-session proof",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(output.relative_to(ROOT)), "status": report["status"], "build": report["build"]["id"], "replayReferenceCount": len(references)}))


if __name__ == "__main__":
    main()
