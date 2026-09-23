"""Publish value-free equality checks for a narrow Mouchette/Arachne row set."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from compare_pc_config_catalogs import normalize


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "research/observations/current-res151-build51/modules"
NEW = ROOT / "research/observations/current-res153-build51/modules"
OUTPUT = ROOT / "research/evidence/pc-res153-mouchette-arachne-selected-rows.json"
IDS = {
    "Skill": (122483, 122484, 123159, 126484),
    "Cmd": (122499, 123160, 133367, 134282, 134385, 134386),
    "State": (122504, 123703, 124656, 123165, 123307, 134383, 134382, 70350, 133368),
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    if OUTPUT.exists():
        raise FileExistsError("Refusing to overwrite selected-row audit")
    tables = []
    for name, ids in IDS.items():
        before_path, after_path = BASE / f"{name}.json", NEW / f"{name}.json"
        before = json.loads(before_path.read_text(encoding="utf-8"))
        after = json.loads(after_path.read_text(encoding="utf-8"))
        rows = []
        for row_id in ids:
            key = str(row_id)
            if key not in before or key not in after:
                raise ValueError(f"Missing selected {name} ID {key}")
            equal = normalize(before[key], empty_table_marker=True) == normalize(after[key], empty_table_marker=True)
            if not equal:
                raise ValueError(f"Selected {name} ID {key} changed")
            rows.append({"id": row_id, "luaSemanticallyEquivalent": True})
        tables.append({"name": name, "beforeRawSha256": sha(before_path), "afterRawSha256": sha(after_path), "rows": rows})
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_SELECTED_ROW_CARRYFORWARD",
        "beforeBuild": "pc-res151-build51",
        "afterBuild": "pc-res153-build51",
        "status": "SELECTED_ROWS_LUA_SEMANTICALLY_EQUIVALENT",
        "selectedRowCount": sum(len(table["rows"]) for table in tables),
        "tables": tables,
        "scope": "Only named Mouchette/Arachne Skill, Cmd and State rows. Proprietary values are omitted.",
        "limitations": [
            "Nested command, state, item, actor, target and team dependency graphs are not closed by this selected-row check",
            "This is neither current-build replay-adapter compatibility nor gameplay validation",
        ],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "selectedRowCount": report["selectedRowCount"]}))


if __name__ == "__main__":
    main()
