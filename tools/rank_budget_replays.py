"""Find a Pareto frontier of low-investment clears from private summaries."""
from pathlib import Path
import argparse
import json

ROOT = Path(__file__).resolve().parents[1]

FIELDS = (
    "characterLevelSum", "highestCharacterLevel", "maxLevelCharacterCount",
    "potencyLevelSum", "highestPotencyLevel", "slotLevelSum",
)


def dominates(left, right):
    comparable = [(left.get(key), right.get(key)) for key in FIELDS]
    comparable = [(a, b) for a, b in comparable if isinstance(a, (int, float)) and isinstance(b, (int, float))]
    return bool(comparable) and all(a <= b for a, b in comparable) and any(a < b for a, b in comparable)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--summary", action="append", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    try:
        output.relative_to(ROOT / "research" / "observations")
    except ValueError as error:
        raise ValueError("Budget report output must stay inside research/observations") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite budget report")

    rows = []
    for path in args.summary:
        summary = json.loads(path.read_text(encoding="utf-8"))
        if summary.get("kind") != "MORIMENS_PRIVATE_STRATEGY_SUMMARY":
            raise ValueError(f"Unsupported summary: {path}")
        rows.append({
            "source": f"{path.parent.name}/{path.name}",
            "label": summary.get("label"),
            "wave": summary.get("wave"),
            "difficulty": summary.get("difficulty"),
            "investmentSignals": summary.get("investmentSignals") or {},
            "roster": summary.get("roster") or [],
            "counts": summary.get("counts") or {},
        })

    frontier = [row for row in rows if not any(dominates(other["investmentSignals"], row["investmentSignals"])
                                                for other in rows if other is not row)]
    frontier.sort(key=lambda row: tuple(row["investmentSignals"].get(key, float("inf")) for key in FIELDS))
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PRIVATE_BUDGET_FRONTIER",
        "method": "Pareto frontier; no invented weighted investment score",
        "comparedFields": list(FIELDS),
        "candidateCount": len(rows),
        "frontierCount": len(frontier),
        "frontier": frontier,
        "limitations": [
            "Inputs must already represent comparable clears of the same stage, wave and difficulty",
            "Wheel enhancement is not present in the replay role payload and requires a separate source",
            "Low investment is a scouting signal, not evidence of a mechanical exploit",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"candidateCount": len(rows), "frontierCount": len(frontier), "output": str(output.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
