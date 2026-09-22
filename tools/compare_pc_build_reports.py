"""Compare two public PC combat-build reports without reopening game bundles."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compare_reports(before: dict, after: dict, before_hash: str, after_hash: str) -> dict:
    for value in (before, after):
        if value.get("kind") != "MORIMENS_PC_COMBAT_BUILD_COMPARISON":
            raise ValueError("PC combat-build comparison reports required")
    before_modules = {row.get("name"): row.get("current") for row in before.get("combatModules", [])}
    after_modules = {row.get("name"): row.get("current") for row in after.get("combatModules", [])}
    if None in before_modules or None in after_modules or set(before_modules) != set(after_modules) or not before_modules:
        raise ValueError("Build reports must cover the same named combat modules")
    modules = [
        {"name": name, "status": "IDENTICAL" if before_modules[name] == after_modules[name] else "CHANGED",
         "before": before_modules[name], "after": after_modules[name]}
        for name in sorted(before_modules)
    ]
    before_build, after_build = before.get("currentBuild"), after.get("currentBuild")
    if not isinstance(before_build, str) or not isinstance(after_build, str) or before_build == after_build:
        raise ValueError("Distinct named current builds required")
    return {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_COMBAT_BUILD_CARRYFORWARD",
        "beforeBuild": before_build,
        "afterBuild": after_build,
        "status": "TRACKED_COMBAT_MODULES_IDENTICAL" if all(row["status"] == "IDENTICAL" for row in modules) else "REVALIDATION_REQUIRED",
        "sourceHashes": {"beforeReport": before_hash, "afterReport": after_hash},
        "moduleCount": len(modules),
        "modules": modules,
        "scope": "Hash-only comparison of the combat TextAssets tracked by both public build reports.",
        "limitations": [
            "Equality transfers only evidence whose complete runtime dependency set is covered by these modules",
            "Catalog and untracked dependency changes require separate review",
            "This report does not establish gameplay accuracy or identify the engine build of a historical replay",
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--before", required=True, type=Path)
    parser.add_argument("--after", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    try:
        output.relative_to(ROOT / "research" / "evidence")
    except ValueError as error:
        raise ValueError("Carry-forward output must stay inside research/evidence") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite build carry-forward report")
    before_path, after_path = args.before.resolve(), args.after.resolve()
    report = compare_reports(
        json.loads(before_path.read_text(encoding="utf-8")),
        json.loads(after_path.read_text(encoding="utf-8")),
        sha(before_path), sha(after_path),
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(output.relative_to(ROOT)), "status": report["status"], "moduleCount": report["moduleCount"]}))


if __name__ == "__main__":
    main()
