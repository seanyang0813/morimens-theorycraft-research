"""Compare historical Wheel initial-state links with the installed Item/State tables.

The private source tables and per-Wheel audit stay under ignored observations.
The public output contains only counts, source hashes and sanitized Wheel IDs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CROSSWALK = ROOT / "research/observations/wheel-config-audit/crosswalk-audit.json"
DEFAULT_HISTORICAL_ITEMS = ROOT / "research/observations/wheel-config-audit/Item.json"
DEFAULT_CURRENT_ITEMS = ROOT / "research/observations/current-res151-build51/modules/Item.json"
DEFAULT_HISTORICAL_STATES = ROOT / "research/extracted/config/State.json"
DEFAULT_CURRENT_STATES = ROOT / "research/observations/current-res151-build51/modules/State.json"
DEFAULT_CONFIG_COMPARISON = ROOT / "research/evidence/pc-res150-to-res151-config-catalogs.json"
DEFAULT_PRIVATE_OUTPUT = ROOT / "research/observations/current-res151-build51/wheel-initial-state-audit.json"
DEFAULT_PUBLIC_OUTPUT = ROOT / "research/evidence/pc-res151-wheel-initial-state-compatibility.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def lua_list(value: object) -> list:
    if isinstance(value, list):
        return value
    if isinstance(value, dict) and set(value) == {str(i) for i in range(1, len(value) + 1)}:
        return [value[str(i)] for i in range(1, len(value) + 1)]
    raise ValueError("Expected a contiguous Lua list")


def audit(crosswalk: dict, historical_items: dict, current_items: dict,
          historical_states: dict, current_states: dict) -> list[dict]:
    rows = []
    for wheel in crosswalk["rows"]:
        if wheel["status"] != "UNIQUE":
            continue
        candidate = wheel["candidates"][0]
        item_id = str(candidate["itemId"])
        state_id = str(candidate["initialStateId"])
        historical_item = historical_items.get(item_id)
        historical_state = historical_states.get(state_id)
        if not historical_item or not historical_state:
            raise ValueError("Historical Wheel mapping lacks its source Item or State")
        expected = (
            historical_item.get("State1") == candidate["initialStateId"]
            and historical_item.get("StateTarget1") == candidate["stateTarget"]
            and lua_list(historical_item.get("StatePara")) == lua_list(candidate["stateParameters"])
            and PurePosixPath(historical_item.get("SpIcon", "")).stem == wheel["assetId"]
        )
        if not expected:
            raise ValueError("Historical Wheel mapping does not match its source Item")
        current_item = current_items.get(item_id)
        current_state = current_states.get(state_id)
        item_attributes_equal = current_item is not None and all(
            lua_list(historical_item.get(field)) == lua_list(current_item.get(field))
            for field in ("WeaponMainAttribute", "WeaponSubAttribute")
        )
        if current_item is None:
            status = "HISTORICAL_ITEM_ABSENT"
        elif (
            current_item.get("State1") != candidate["initialStateId"]
            or current_item.get("StateTarget1") != candidate["stateTarget"]
            or lua_list(current_item.get("StatePara")) != lua_list(candidate["stateParameters"])
            or PurePosixPath(current_item.get("SpIcon", "")).stem != wheel["assetId"]
        ):
            status = "ITEM_INITIAL_STATE_LINK_CHANGED"
        elif current_state is None:
            status = "LINKED_STATE_ABSENT"
        elif historical_state.get("ExistProperty") != current_state.get("ExistProperty"):
            status = "INITIAL_DIRECT_PROPERTY_CHANGED"
        else:
            status = "INITIAL_DIRECT_PROPERTY_UNCHANGED"
        rows.append({"wheelId": wheel["wheelId"], "itemId": int(item_id),
                     "historicalInitialStateId": int(state_id), "status": status,
                     "itemAttributeRowsEqual": item_attributes_equal,
                     "historicalDirectProperties": historical_state.get("ExistProperty", {}),
                     "currentDirectProperties": current_state.get("ExistProperty", {}) if current_state else None})
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--crosswalk", type=Path, default=DEFAULT_CROSSWALK)
    parser.add_argument("--historical-items", type=Path, default=DEFAULT_HISTORICAL_ITEMS)
    parser.add_argument("--current-items", type=Path, default=DEFAULT_CURRENT_ITEMS)
    parser.add_argument("--historical-states", type=Path, default=DEFAULT_HISTORICAL_STATES)
    parser.add_argument("--current-states", type=Path, default=DEFAULT_CURRENT_STATES)
    parser.add_argument("--config-comparison", type=Path, default=DEFAULT_CONFIG_COMPARISON)
    parser.add_argument("--private-output", type=Path, default=DEFAULT_PRIVATE_OUTPUT)
    parser.add_argument("--public-output", type=Path, default=DEFAULT_PUBLIC_OUTPUT)
    args = parser.parse_args()
    sources = {name: getattr(args, name).resolve() for name in
               ("crosswalk", "historical_items", "current_items", "historical_states", "current_states")}
    private_output, public_output = args.private_output.resolve(), args.public_output.resolve()
    if not private_output.is_relative_to(ROOT / "research/observations"):
        raise ValueError("Detailed Wheel audit must stay in ignored observations")
    if not public_output.is_relative_to(ROOT / "research/evidence"):
        raise ValueError("Public Wheel audit must stay in research evidence")
    if private_output.exists() or public_output.exists():
        raise FileExistsError("Refusing to overwrite a Wheel audit")
    inputs = {name: load(path) for name, path in sources.items()}
    comparison_path = args.config_comparison.resolve()
    comparison = load(comparison_path)
    state_comparison = next((row for row in comparison.get("tables", []) if row.get("name") == "State"), None)
    if comparison.get("afterBuild") != "pc-res151-build51" or not state_comparison or state_comparison.get("afterRawSha256") != digest(sources["current_states"]):
        raise ValueError("Current State export does not match the recognized resource-151 config catalog")
    rows = audit(inputs["crosswalk"], inputs["historical_items"], inputs["current_items"],
                 inputs["historical_states"], inputs["current_states"])
    status_counts = {status: sum(row["status"] == status for row in rows) for status in (
        "INITIAL_DIRECT_PROPERTY_UNCHANGED", "INITIAL_DIRECT_PROPERTY_CHANGED",
        "LINKED_STATE_ABSENT", "ITEM_INITIAL_STATE_LINK_CHANGED", "HISTORICAL_ITEM_ABSENT")}
    if len(rows) != 141 or status_counts != {
        "INITIAL_DIRECT_PROPERTY_UNCHANGED": 136, "INITIAL_DIRECT_PROPERTY_CHANGED": 3,
        "LINKED_STATE_ABSENT": 0, "ITEM_INITIAL_STATE_LINK_CHANGED": 0,
        "HISTORICAL_ITEM_ABSENT": 2,
    }:
        raise ValueError(f"Unexpected installed Wheel mapping drift: {status_counts}")
    attribute_rows_equal = sum(row["itemAttributeRowsEqual"] for row in rows)
    if attribute_rows_equal != 139:
        raise ValueError(f"Unexpected installed Wheel Item attribute drift: {attribute_rows_equal}")
    private_report = {"schemaVersion": 1, "kind": "MORIMENS_PRIVATE_WHEEL_INITIAL_STATE_AUDIT",
                      "historicalBuild": "pc-res144-build51", "currentBuild": "pc-res151-build51",
                      "sourceHashes": {**{name: digest(path) for name, path in sources.items()},
                                       "config_comparison": digest(comparison_path)},
                      "rows": rows}
    public_report = {"schemaVersion": 1, "kind": "MORIMENS_PC_RES151_WHEEL_INITIAL_STATE_COMPATIBILITY",
                     "analysisTrack": "mechanics", "status": "PARTIAL_COMPATIBILITY",
                     "historicalBuild": "pc-res144-build51", "currentBuild": "pc-res151-build51",
                     "sourceHashes": private_report["sourceHashes"],
                     "counts": {"historicallyUniqueWheelLinks": len(rows), "currentItemRows": len(inputs["current_items"]),
                                "currentStateRows": len(inputs["current_states"]),
                                "unchangedItemAttributeRows": attribute_rows_equal, **status_counts},
                     "exceptions": [{"wheelId": row["wheelId"], "status": row["status"]}
                                    for row in rows if row["status"] != "INITIAL_DIRECT_PROPERTY_UNCHANGED"],
                     "scope": "Historical unique Item-to-initial-State links checked against the installed resource-151 Item and State tables. Item main/sub-attribute and State direct-property field equality are static source comparisons.",
                     "limitations": ["Two historical Item identities are absent from the installed table; this does not prove their current replacement or removal from gameplay.",
                                     "Three linked initial states changed direct-property expressions; historical expressions cannot be used for current calculations.",
                                     "Five historically unresolved Wheel crosswalks, new items, enhancement/main-stat scaling, attachment, triggers and gameplay effects are outside this audit.",
                                     "Static equality does not validate full Wheel execution, build legality, damage or an independent gameplay prediction."]}
    private_output.parent.mkdir(parents=True, exist_ok=True)
    public_output.parent.mkdir(parents=True, exist_ok=True)
    private_output.write_text(json.dumps(private_report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    public_output.write_text(json.dumps(public_report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"publicOutput": str(public_output.relative_to(ROOT)), "counts": public_report["counts"]}, indent=2))


if __name__ == "__main__":
    main()
