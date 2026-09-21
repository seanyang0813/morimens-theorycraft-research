"""Freeze and verify Android script bundles against the packaged content manifest.

This tool is read-only except for its JSON report.  It never downloads content.
"""
from pathlib import Path
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "research/raw/android/unpacked/assets/_version.json"
DEFAULT_OUTPUT = ROOT / "research/evidence/android-script-group-manifest.json"


def display_path(path: Path) -> str:
    resolved = path.resolve()
    return str(resolved.relative_to(ROOT) if resolved.is_relative_to(ROOT) else resolved).replace("\\", "/")


def digest(path: Path, algorithm: str) -> str:
    value = hashlib.new(algorithm)
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def load_script_group(manifest_path: Path):
    raw = manifest_path.read_bytes()
    manifest = json.loads(raw.decode("utf-8"))
    groups = [group for group in manifest.get("groups", []) if group.get("groupName") == "Scripts"]
    if len(groups) != 1:
        raise ValueError(f"Expected exactly one Scripts group, found {len(groups)}")
    items = groups[0].get("items")
    if not isinstance(items, list) or not items:
        raise ValueError("Scripts group has no items")
    names = [item.get("f") for item in items]
    if any(not isinstance(name, str) or not name for name in names):
        raise ValueError("Scripts group contains an invalid filename")
    if len(names) != len(set(names)):
        raise ValueError("Scripts group contains duplicate filenames")
    for item in items:
        if not isinstance(item.get("s"), int) or item["s"] < 0:
            raise ValueError(f"Invalid size for {item.get('f')}")
        if not isinstance(item.get("i"), int):
            raise ValueError(f"Invalid resource index for {item.get('f')}")
        value = item.get("h")
        if not isinstance(value, str) or len(value) != 32 or any(c not in "0123456789abcdefABCDEF" for c in value):
            raise ValueError(f"Invalid manifest hash for {item.get('f')}")
    return manifest, raw, items


def build_report(manifest_path: Path, capture_dir: Path | None = None):
    manifest, raw, items = load_script_group(manifest_path)
    version = manifest.get("versionInfo")
    if not isinstance(version, dict):
        raise ValueError("Manifest versionInfo is missing")

    # This bundled Android file is in the same manifest and directly establishes
    # the meaning of h without relying on the 32-character shape alone.
    default_items = [
        item for group in manifest.get("groups", []) if group.get("groupName") == "default"
        for item in group.get("items", []) if item.get("f") == "luascript_update.archive"
    ]
    proof_path = manifest_path.parent / "luascript_update.archive"
    hash_proof = {"status": "UNPROVEN", "algorithm": None}
    if len(default_items) == 1 and proof_path.is_file():
        expected = default_items[0].get("h")
        actual = digest(proof_path, "md5")
        hash_proof = {
            "status": "DIRECT_ANDROID_MATCH" if actual == expected else "MISMATCH",
            "algorithm": "MD5" if actual == expected else None,
            "file": display_path(proof_path),
            "expectedManifestHash": expected,
            "computedMd5": actual,
            "size": proof_path.stat().st_size,
        }

    rows = []
    all_match = capture_dir is not None and hash_proof["status"] == "DIRECT_ANDROID_MATCH"
    capture_root = capture_dir.resolve() if capture_dir is not None else None
    for item in items:
        row = {
            "file": item["f"],
            "expectedSize": item["s"],
            "expectedManifestHash": item["h"].lower(),
            "resourceIndex": item["i"],
        }
        if capture_root is not None:
            candidate = (capture_root / item["f"]).resolve()
            if not candidate.is_relative_to(capture_root):
                raise ValueError(f"Manifest path escapes capture directory: {item['f']}")
            if not candidate.is_file():
                row["captureStatus"] = "MISSING"
                all_match = False
            else:
                actual_size = candidate.stat().st_size
                row["actualSize"] = actual_size
                row["sha256"] = digest(candidate, "sha256")
                if hash_proof["status"] == "DIRECT_ANDROID_MATCH":
                    row["computedMd5"] = digest(candidate, "md5")
                    row["sizeMatches"] = actual_size == item["s"]
                    row["manifestHashMatches"] = row["computedMd5"] == item["h"].lower()
                    row["captureStatus"] = "MATCH" if row["sizeMatches"] and row["manifestHashMatches"] else "MISMATCH"
                else:
                    row["captureStatus"] = "HASH_ALGORITHM_UNPROVEN"
                all_match = all_match and row["captureStatus"] == "MATCH"
        rows.append(row)

    status = "AWAITING_CAPTURE" if capture_dir is None else ("VERIFIED" if all_match else "REJECTED")
    return {
        "kind": "LOCAL_ANDROID_SCRIPT_GROUP_MANIFEST",
        "scope": "Packaged manifest and optional local capture only; no download, code execution, formula parity, or gameplay validation.",
        "manifest": {
            "path": display_path(manifest_path),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "versionInfo": version,
        },
        "manifestHashInterpretation": hash_proof,
        "scriptGroup": {"count": len(rows), "files": rows},
        "capture": {"directory": str(capture_root) if capture_root else None, "status": status},
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--capture-dir", type=Path)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    report = build_report(args.manifest, args.capture_dir)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "resourceVersion": report["manifest"]["versionInfo"].get("resVersion"),
        "scriptFiles": report["scriptGroup"]["count"],
        "hashProof": report["manifestHashInterpretation"]["status"],
        "captureStatus": report["capture"]["status"],
        "report": str(args.output),
    }, indent=2))
    return 2 if args.capture_dir is not None and report["capture"]["status"] != "VERIFIED" else 0


if __name__ == "__main__":
    raise SystemExit(main())
