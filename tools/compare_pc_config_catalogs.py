"""Compare two private PC config exports without publishing their rows.

Lua tables can serialize as either JSON objects with one-based numeric keys or
JSON arrays.  Empty Lua tables are also ambiguous: the JSON exporter may emit
either ``{}`` or ``[]``.  This report distinguishes those representation
changes from changes to gameplay values.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TABLES = ("Skill", "Cmd", "State", "BattleApi", "Constant")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize(value, *, empty_table_marker: bool = False):
    # Lua 5.3 represents integral and floating-point numbers separately, but
    # equality and the combat expressions treat 1 and 1.0 as the same value.
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, list):
        if empty_table_marker and not value:
            return {"$emptyLuaTable": True}
        return [normalize(item, empty_table_marker=empty_table_marker) for item in value]
    if isinstance(value, dict):
        mapped = {
            str(key): normalize(item, empty_table_marker=empty_table_marker)
            for key, item in value.items()
            if key != "BaseSortID"
        }
        if empty_table_marker and not mapped:
            return {"$emptyLuaTable": True}
        keys = list(mapped)
        if keys and all(key.isdigit() and int(key) > 0 for key in keys):
            indexes = sorted(map(int, keys))
            if indexes == list(range(1, len(indexes) + 1)):
                return [mapped[str(index)] for index in indexes]
        return {key: mapped[key] for key in sorted(mapped)}
    return value


def canonical_hash(value) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def compare_table(before_path: Path, after_path: Path, name: str) -> dict:
    before = json.loads(before_path.read_text(encoding="utf-8"))
    after = json.loads(after_path.read_text(encoding="utf-8"))
    if not isinstance(before, dict) or not isinstance(after, dict):
        raise ValueError(f"{name} must decode to an ID-keyed table")
    before_ids, after_ids = set(before), set(after)
    shared = before_ids & after_ids
    normalized_before, normalized_after = normalize(before), normalize(after)
    semantic_before = normalize(before, empty_table_marker=True)
    semantic_after = normalize(after, empty_table_marker=True)
    normalized_changed = sum(normalize(before[key]) != normalize(after[key]) for key in shared)
    semantic_changed = sum(
        normalize(before[key], empty_table_marker=True)
        != normalize(after[key], empty_table_marker=True)
        for key in shared
    )
    return {
        "name": name,
        "beforeRawSha256": sha256(before_path),
        "afterRawSha256": sha256(after_path),
        "beforeCanonicalSha256": canonical_hash(semantic_before),
        "afterCanonicalSha256": canonical_hash(semantic_after),
        "beforeRows": len(before),
        "afterRows": len(after),
        "addedRows": len(after_ids - before_ids),
        "removedRows": len(before_ids - after_ids),
        "normalizedChangedSharedRows": normalized_changed,
        "luaSemanticChangedSharedRows": semantic_changed,
        "representationOnlyChangedRows": normalized_changed - semantic_changed,
        "luaSemanticEquivalent": semantic_before == semantic_after,
        "normalization": {
            "ignoredFields": ["BaseSortID"],
            "oneBasedNumericTablesBecomeArrays": True,
            "emptyObjectAndArrayBothRepresentEmptyLuaTable": True,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--before-dir", required=True, type=Path)
    parser.add_argument("--after-dir", required=True, type=Path)
    parser.add_argument("--before-build", required=True)
    parser.add_argument("--after-build", required=True)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    before_dir, after_dir, output = args.before_dir.resolve(), args.after_dir.resolve(), args.output.resolve()
    for directory in (before_dir, after_dir):
        try:
            directory.relative_to(ROOT / "research" / "observations")
        except ValueError as error:
            raise ValueError("Config inputs must remain in private observations storage") from error
    try:
        output.relative_to(ROOT / "research" / "evidence")
    except ValueError as error:
        raise ValueError("Comparison output must stay in public evidence storage") from error
    if output.exists():
        raise FileExistsError("Refusing to overwrite config compatibility evidence")
    tables = [
        compare_table(before_dir / f"{name}.json", after_dir / f"{name}.json", name)
        for name in TABLES
    ]
    semantic_equivalent = all(row["luaSemanticEquivalent"] for row in tables)
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_CONFIG_CATALOG_COMPARISON",
        "beforeBuild": args.before_build,
        "afterBuild": args.after_build,
        "status": "LUA_SEMANTICALLY_EQUIVALENT" if semantic_equivalent else "GAMEPLAY_DATA_REVIEW_REQUIRED",
        "tables": tables,
        "summary": {
            "tableCount": len(tables),
            "luaSemanticallyEquivalentTables": sum(row["luaSemanticEquivalent"] for row in tables),
            "addedRows": sum(row["addedRows"] for row in tables),
            "removedRows": sum(row["removedRows"] for row in tables),
            "luaSemanticChangedSharedRows": sum(row["luaSemanticChangedSharedRows"] for row in tables),
            "representationOnlyChangedRows": sum(row["representationOnlyChangedRows"] for row in tables),
        },
        "scope": "Hash-only comparison of five privately exported config tables used by the narrow replay damage adapter. No table rows or values are published.",
        "limitations": [
            "Lua-semantic catalog equality does not prove equality of untracked code modules or other config tables",
            "This report provides no gameplay validation or holdout credit",
            "Compatibility must be composed with an explicit runtime dependency inventory before enabling the newer build's calculation path",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(output.relative_to(ROOT)), "status": report["status"], "summary": report["summary"]}, indent=2))


if __name__ == "__main__":
    main()
