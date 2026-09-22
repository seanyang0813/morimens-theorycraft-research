"""Decode and compact a numbered private replay-container batch.

Raw containers and generated artifacts remain in gitignored research folders.
The default path deliberately omits the very large full replay index; callers
can request it for a small selected set with ``--full-index``.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import os
import re
from pathlib import Path

from compact_replay_candidate_index import compact_candidate_index
from replay_codec import ReplayCodec, container_compstr
from replay_index import build_replay_index


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw"
OBSERVATIONS = ROOT / "research" / "observations"
PROTOCOL = ROOT / "research" / "evidence" / "replay-protocol.json"
NAME = re.compile(r"^replay-batch-(\d+)-container\.json$")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def select_inputs(pattern: str, minimum: int | None, maximum: int | None) -> list[tuple[int, Path]]:
    rows = []
    for path in RAW.glob(pattern):
        match = NAME.fullmatch(path.name)
        if not match:
            continue
        number = int(match.group(1))
        if minimum is not None and number < minimum:
            continue
        if maximum is not None and number > maximum:
            continue
        rows.append((number, path.resolve()))
    rows.sort()
    if not rows:
        raise ValueError("No numbered private replay containers matched")
    if len({number for number, _ in rows}) != len(rows):
        raise ValueError("Duplicate replay batch number")
    return rows


def output_paths(number: int, output_root: Path) -> dict[str, Path]:
    directory = output_root / f"replay-batch-{number:02d}"
    return {
        "directory": directory,
        "decoded": directory / "decoded.json",
        "compact": directory / "compact-index.json",
        "index": directory / "index.json",
    }


def plan_batch(inputs: list[tuple[int, Path]], output_root: Path, full_index: bool) -> dict:
    pending, skipped = [], []
    for number, source in inputs:
        paths = output_paths(number, output_root)
        required = [paths["decoded"], paths["compact"]] + ([paths["index"]] if full_index else [])
        row = {"batch": number, "label": paths["directory"].name, "containerBytes": source.stat().st_size}
        (skipped if all(path.is_file() for path in required) else pending).append(row)
    return {
        "selected": len(inputs),
        "pending": pending,
        "skipped": skipped,
        "fullIndex": full_index,
    }


def write_json_atomic(path: Path, value, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + f".tmp-{os.getpid()}")
    text = json.dumps(value, separators=(",", ":") if compact else None,
                      indent=None if compact else 2, ensure_ascii=False) + "\n"
    temporary.write_text(text, encoding="utf-8", newline="\n")
    temporary.replace(path)


def process_one(job: tuple[int, str, str, bool]) -> dict:
    number, source_text, output_root_text, full_index = job
    source, output_root = Path(source_text), Path(output_root_text)
    paths = output_paths(number, output_root)
    digest = sha256(source)

    if paths["decoded"].is_file():
        artifact = json.loads(paths["decoded"].read_text(encoding="utf-8"))
        if artifact.get("kind") != "MORIMENS_DECODED_REPLAY" or artifact.get("inputSha256") != digest:
            raise ValueError(f"Existing decoded artifact does not match batch {number}")
    else:
        compressed = container_compstr(source, "latin1", "latin1")
        decoded = ReplayCodec().decode(compressed)
        artifact = {
            "schemaVersion": 1,
            "kind": "MORIMENS_DECODED_REPLAY",
            "inputSha256": digest,
            "jsonEncoding": "latin1",
            "compStrEncoding": "latin1",
            "decoded": decoded,
        }
        write_json_atomic(paths["decoded"], artifact)

    need_index = full_index and not paths["index"].is_file()
    need_compact = not paths["compact"].is_file()
    index = None
    if need_index or need_compact:
        protocol = json.loads(PROTOCOL.read_text(encoding="utf-8"))
        index = build_replay_index(artifact, protocol)
        if need_compact:
            write_json_atomic(paths["compact"], compact_candidate_index(index), compact=True)
        if need_index:
            write_json_atomic(paths["index"], index)

    compact = json.loads(paths["compact"].read_text(encoding="utf-8"))
    return {
        "batch": number,
        "label": paths["directory"].name,
        "inputSha256": digest,
        "records": compact.get("counts", {}).get("records", 0),
        "events": compact.get("counts", {}).get("events", 0),
        "actions": len(compact.get("actionSnapshots", [])),
        "hits": compact.get("counts", {}).get("hits", 0),
        "completeHitSnapshots": compact.get("summary", {}).get("completeHitSnapshots", 0),
    }


def summarize_completed(number: int, source: Path, output_root: Path) -> dict:
    paths = output_paths(number, output_root)
    compact = json.loads(paths["compact"].read_text(encoding="utf-8"))
    return {
        "batch": number,
        "label": paths["directory"].name,
        "inputSha256": sha256(source),
        "records": compact.get("counts", {}).get("records", 0),
        "events": compact.get("counts", {}).get("events", 0),
        "actions": len(compact.get("actionSnapshots", [])),
        "hits": compact.get("counts", {}).get("hits", 0),
        "completeHitSnapshots": compact.get("summary", {}).get("completeHitSnapshots", 0),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-glob", default="replay-batch-*-container.json")
    parser.add_argument("--output-root", type=Path, default=OBSERVATIONS)
    parser.add_argument("--min-batch", type=int)
    parser.add_argument("--max-batch", type=int)
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--full-index", action="store_true")
    parser.add_argument("--plan-only", action="store_true")
    args = parser.parse_args()
    output_root = args.output_root.resolve()
    try:
        output_root.relative_to(OBSERVATIONS.resolve())
    except ValueError as error:
        raise ValueError("Batch output must stay inside research/observations") from error
    if args.workers < 1 or args.workers > 8:
        raise ValueError("Workers must be between 1 and 8")
    if args.min_batch is not None and args.max_batch is not None and args.min_batch > args.max_batch:
        raise ValueError("Minimum batch cannot exceed maximum batch")

    inputs = select_inputs(args.input_glob, args.min_batch, args.max_batch)
    plan = plan_batch(inputs, output_root, args.full_index)
    if args.plan_only:
        print(json.dumps(plan, indent=2))
        return

    pending_numbers = {row["batch"] for row in plan["pending"]}
    jobs = [(number, str(source), str(output_root), args.full_index)
            for number, source in inputs if number in pending_numbers]
    results = []
    with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers) as executor:
        for result in executor.map(process_one, jobs):
            results.append(result)
            print(json.dumps(result, separators=(",", ":")), flush=True)
    by_number = {row["batch"]: row for row in results}
    for number, source in inputs:
        if number not in by_number:
            by_number[number] = summarize_completed(number, source, output_root)
    completed = [by_number[number] for number, _ in inputs]
    summary = {
        "selected": plan["selected"],
        "completed": len(completed),
        "newlyProcessed": len(results),
        "previouslyComplete": len(plan["skipped"]),
        "records": sum(row["records"] for row in completed),
        "events": sum(row["events"] for row in completed),
        "actions": sum(row["actions"] for row in completed),
        "hits": sum(row["hits"] for row in completed),
        "completeHitSnapshots": sum(row["completeHitSnapshots"] for row in completed),
        "fullIndex": args.full_index,
    }
    print(json.dumps({"summary": summary}, separators=(",", ":")))


if __name__ == "__main__":
    main()
