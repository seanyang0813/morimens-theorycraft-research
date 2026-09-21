"""Attribute private replay catalogs to pinned PC builds without publishing identifiers."""
from pathlib import Path
import argparse
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
CATALOGS = ("Cmd", "Skill")


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize(value):
    if isinstance(value, list):
        return [normalize(item) for item in value]
    if isinstance(value, dict):
        # BaseSortID is transport/order metadata absent from one catalog form.
        mapped = {str(key): normalize(item) for key, item in value.items() if key != "BaseSortID"}
        keys = list(mapped)
        if keys and all(key.isdigit() and int(key) > 0 for key in keys):
            indexes = sorted(map(int, keys))
            if indexes == list(range(1, len(indexes) + 1)):
                return [mapped[str(index)] for index in indexes]
        return {key: mapped[key] for key in sorted(mapped)}
    return value


def classify(counts):
    if counts["unmatchedRows"]:
        return "UNMATCHED_OR_INTERMEDIATE_CATALOG"
    if counts["baselineExclusiveRows"] and not counts["currentExclusiveRows"]:
        return "PC_RES144_BUILD51_CATALOG_MATCH"
    if counts["currentExclusiveRows"] and not counts["baselineExclusiveRows"]:
        return "PC_RES150_BUILD51_CATALOG_MATCH"
    if not counts["baselineExclusiveRows"] and not counts["currentExclusiveRows"]:
        return "AMBIGUOUS_SHARED_ROWS_ONLY"
    return "MIXED_CATALOG_ROWS"


def compare_replay(path, baseline, current):
    artifact = json.loads(path.read_text(encoding="utf-8"))
    resources = artifact.get("decoded", {}).get("resourceRecords", {})
    counts = {"comparableRows": 0, "sharedRows": 0, "baselineExclusiveRows": 0,
              "currentExclusiveRows": 0, "unmatchedRows": 0}
    by_catalog = {}
    for name in CATALOGS:
        embedded = resources.get(name)
        if not isinstance(embedded, dict):
            raise ValueError(f"{path}: embedded {name} catalog required")
        local = dict.fromkeys(counts, 0)
        for row_id, row in embedded.items():
            observed = normalize(row)
            matches_baseline = observed == normalize(baseline[name].get(str(row_id)))
            matches_current = observed == normalize(current[name].get(str(row_id)))
            local["comparableRows"] += 1
            if matches_baseline and matches_current:
                local["sharedRows"] += 1
            elif matches_baseline:
                local["baselineExclusiveRows"] += 1
            elif matches_current:
                local["currentExclusiveRows"] += 1
            else:
                local["unmatchedRows"] += 1
        by_catalog[name] = local
        for key in counts:
            counts[key] += local[key]
    return {**counts, "classification": classify(counts), "catalogs": by_catalog}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--replay-root", type=Path, default=ROOT / "research/observations")
    parser.add_argument("--current-root", type=Path, default=ROOT / "research/observations/current-res150-build51/modules")
    parser.add_argument("--output", type=Path, default=ROOT / "research/evidence/replay-catalog-build-attribution.json")
    args = parser.parse_args()
    baseline_paths = {name: ROOT / f"research/extracted/config/{name}.json" for name in CATALOGS}
    current_paths = {name: args.current_root.resolve() / f"{name}.json" for name in CATALOGS}
    baseline = {name: json.loads(path.read_text(encoding="utf-8")) for name, path in baseline_paths.items()}
    current = {name: json.loads(path.read_text(encoding="utf-8")) for name, path in current_paths.items()}
    rows = []
    for path in sorted(args.replay_root.resolve().glob("replay-batch-*/decoded.json")):
        rows.append({"observationId": path.parent.name, **compare_replay(path, baseline, current)})
    summary = {}
    for row in rows:
        key = row["classification"]
        summary[key] = summary.get(key, 0) + 1
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_REPLAY_CATALOG_BUILD_ATTRIBUTION",
        "builds": ["pc-res144-build51", "pc-res150-build51"],
        "sourceHashes": {
            build: {name: sha256(paths[name]) for name in CATALOGS}
            for build, paths in (("pc-res144-build51", baseline_paths), ("pc-res150-build51", current_paths))
        },
        "method": "Exact normalized comparison of every replay-embedded Cmd and Skill row against both complete pinned catalogs. Numeric-key Lua tables become arrays and BaseSortID transport/order metadata is excluded.",
        "summary": summary,
        "replays": rows,
        "privacy": "Only anonymous batch labels and aggregate comparison counts are published; no player, account, replay, battle or instance identifiers.",
        "limitations": [
            "Catalog attribution identifies the resource data used by the replay, not the engine bytecode build by itself",
            "Rows shared by both builds provide no discriminating evidence",
            "Unmatched rows are not forced to either pinned build",
            "Retrospective attribution does not create a blind prediction or holdout",
        ],
    }
    output = args.output.resolve()
    try:
        output.relative_to(ROOT / "research/evidence")
    except ValueError as error:
        raise ValueError("Output must stay inside research/evidence") from error
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"replays": len(rows), "summary": summary, "output": str(output.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
