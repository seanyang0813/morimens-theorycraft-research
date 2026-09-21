"""Create a private, identifier-free strategy summary from a decoded replay."""
from pathlib import Path
import argparse
import json

from replay_index import build_replay_index
from replay_strategy_summary import build_strategy_summary

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--label")
    parser.add_argument("--wave", type=int)
    parser.add_argument("--difficulty")
    parser.add_argument("--include-outcomes", action="store_true")
    args = parser.parse_args()

    source = args.input.resolve()
    output = args.output.resolve()
    if not source.is_file():
        raise ValueError("Decoded replay input does not exist")
    try:
        output.relative_to(ROOT / "research" / "observations")
    except ValueError as error:
        raise ValueError("Strategy summary output must stay inside research/observations") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite strategy summary")

    artifact = json.loads(source.read_text(encoding="utf-8"))
    protocol = json.loads((ROOT / "research/evidence/replay-protocol.json").read_text(encoding="utf-8"))
    index = build_replay_index(artifact, protocol)
    resources = artifact.get("decoded", {}).get("resourceRecords", {})
    summary = build_strategy_summary(
        index, resources, label=args.label, wave=args.wave,
        difficulty=args.difficulty, include_outcomes=args.include_outcomes,
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(output.relative_to(ROOT)), "actions": len(summary["sequence"]),
                      "outcomesIncluded": summary["outcomesIncluded"]}, indent=2))


if __name__ == "__main__":
    main()

