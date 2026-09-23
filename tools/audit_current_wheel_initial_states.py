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
DEFAULT_BUILD_CATALOG = ROOT / "website/dist/build-catalog.json"
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
        current_item_id = item_id
        current_item = current_items.get(item_id)
        if current_item is None:
            replacements = [(key, value) for key, value in current_items.items()
                            if value.get("SpIcon") == historical_item.get("SpIcon")]
            if len(replacements) == 1:
                current_item_id, current_item = replacements[0]
        current_state_id = str(current_item.get("State1")) if current_item else None
        current_state = current_states.get(current_state_id) if current_state_id else None
        item_attributes_equal = current_item is not None and all(
            lua_list(historical_item.get(field)) == lua_list(current_item.get(field))
            for field in ("WeaponMainAttribute", "WeaponSubAttribute")
        )
        if current_item is None:
            status = "HISTORICAL_ITEM_ABSENT"
        elif (
            (current_item_id == item_id and current_item.get("State1") != candidate["initialStateId"])
            or current_item.get("StateTarget1") != candidate["stateTarget"]
            or lua_list(current_item.get("StatePara")) != lua_list(candidate["stateParameters"])
            or PurePosixPath(current_item.get("SpIcon", "")).stem != wheel["assetId"]
        ):
            status = "ITEM_INITIAL_STATE_LINK_CHANGED"
        elif current_state is None:
            status = "LINKED_STATE_ABSENT"
        elif not item_attributes_equal:
            status = "ITEM_ATTRIBUTES_CHANGED"
        elif current_item_id != item_id and historical_state.get("ExistProperty") == current_state.get("ExistProperty"):
            status = "ITEM_REPLACED_EQUIVALENT_INITIAL_RULE"
        elif historical_state.get("ExistProperty") != current_state.get("ExistProperty"):
            status = "INITIAL_DIRECT_PROPERTY_CHANGED"
        else:
            status = "INITIAL_DIRECT_PROPERTY_UNCHANGED"
        rows.append({"wheelId": wheel["wheelId"], "itemId": int(item_id),
                     "historicalInitialStateId": int(state_id), "status": status,
                     "currentItemId": int(current_item_id) if current_item else None,
                     "currentInitialStateId": int(current_state_id) if current_state_id else None,
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
    parser.add_argument("--build-catalog", type=Path, default=DEFAULT_BUILD_CATALOG)
    parser.add_argument("--config-comparison", type=Path, default=DEFAULT_CONFIG_COMPARISON)
    parser.add_argument("--private-output", type=Path, default=DEFAULT_PRIVATE_OUTPUT)
    parser.add_argument("--public-output", type=Path, default=DEFAULT_PUBLIC_OUTPUT)
    args = parser.parse_args()
    sources = {name: getattr(args, name).resolve() for name in
               ("crosswalk", "historical_items", "current_items", "historical_states", "current_states", "build_catalog")}
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
    catalog = inputs["build_catalog"]
    catalog_wheels = {wheel["id"]: wheel for wheel in catalog["wheels"]}
    series = {(item["rarity"], item["mainstatKey"]): float(item["baseValue"].removesuffix("%"))
              for item in catalog["wheelMainstatScaling"]["series"]}
    subattribute_codes: dict[str, int] = {}
    for row in rows:
        wheel = catalog_wheels[row["wheelId"]]
        current_item = inputs["current_items"].get(str(row["currentItemId"]))
        if not current_item or current_item.get("Type") != "Weapon" or current_item.get("SubType") != "Weapon":
            raise ValueError("Historical Wheel has no current Weapon Item")
        subattribute = lua_list(current_item.get("WeaponSubAttribute"))
        if len(subattribute) != 2 or subattribute[1] != series[(wheel["rarity"], wheel["mainstatKey"])]:
            raise ValueError("Installed Wheel main-stat base differs from pinned catalog")
        code = subattribute[0]
        prior = subattribute_codes.setdefault(wheel["mainstatKey"], code)
        if code != prior:
            raise ValueError("Installed Wheel main-stat code mapping is ambiguous")
        row["catalogMainstatBaseMatches"] = True
    current_only = []
    for wheel in inputs["crosswalk"]["rows"]:
        if wheel["status"] == "UNIQUE":
            continue
        candidates = [(key, item) for key, item in inputs["current_items"].items()
                      if PurePosixPath(item.get("SpIcon", "")).stem == wheel["assetId"]]
        if len(candidates) != 1:
            continue
        current_item_id, current_item = candidates[0]
        public_wheel = catalog_wheels[wheel["wheelId"]]
        subattribute = lua_list(current_item.get("WeaponSubAttribute"))
        if (current_item.get("Type") != "Weapon" or current_item.get("SubType") != "Weapon"
                or len(subattribute) != 2
                or subattribute[0] != subattribute_codes[public_wheel["mainstatKey"]]
                or subattribute[1] != series[(public_wheel["rarity"], public_wheel["mainstatKey"])]
                or str(current_item.get("State1")) not in inputs["current_states"]):
            continue
        current_only.append({"wheelId": wheel["wheelId"], "currentItemId": int(current_item_id),
                             "currentInitialStateId": current_item["State1"],
                             "status": "CURRENT_ONLY_UNIQUE_ICON_MAINSTAT_BASE_MATCH"})
    if len(current_only) != 1 or len(subattribute_codes) != 8:
        raise ValueError("Unexpected current-only Wheel or main-stat code coverage")
    status_counts = {status: sum(row["status"] == status for row in rows) for status in (
        "INITIAL_DIRECT_PROPERTY_UNCHANGED", "INITIAL_DIRECT_PROPERTY_CHANGED",
        "ITEM_REPLACED_EQUIVALENT_INITIAL_RULE", "ITEM_ATTRIBUTES_CHANGED",
        "LINKED_STATE_ABSENT", "ITEM_INITIAL_STATE_LINK_CHANGED", "HISTORICAL_ITEM_ABSENT")}
    if len(rows) != 141 or status_counts != {
        "INITIAL_DIRECT_PROPERTY_UNCHANGED": 136, "INITIAL_DIRECT_PROPERTY_CHANGED": 3,
        "ITEM_REPLACED_EQUIVALENT_INITIAL_RULE": 2, "ITEM_ATTRIBUTES_CHANGED": 0,
        "LINKED_STATE_ABSENT": 0, "ITEM_INITIAL_STATE_LINK_CHANGED": 0,
        "HISTORICAL_ITEM_ABSENT": 0,
    }:
        raise ValueError(f"Unexpected installed Wheel mapping drift: {status_counts}")
    attribute_rows_equal = sum(row["itemAttributeRowsEqual"] for row in rows)
    if attribute_rows_equal != 141:
        raise ValueError(f"Unexpected installed Wheel Item attribute drift: {attribute_rows_equal}")
    status_by_wheel = {row["wheelId"]: row["status"] for row in [*rows,*current_only]}
    public_wheels = [{"wheelId": wheel["wheelId"],
                      "status": status_by_wheel.get(wheel["wheelId"], "HISTORICAL_CROSSWALK_UNRESOLVED")}
                     for wheel in inputs["crosswalk"]["rows"]]
    if len(public_wheels) != 146 or len({row["wheelId"] for row in public_wheels}) != 146 or sum(row["status"] == "HISTORICAL_CROSSWALK_UNRESOLVED" for row in public_wheels) != 4:
        raise ValueError("Unexpected historical Wheel identity coverage")
    private_report = {"schemaVersion": 1, "kind": "MORIMENS_PRIVATE_WHEEL_INITIAL_STATE_AUDIT",
                      "historicalBuild": "pc-res144-build51", "currentBuild": "pc-res151-build51",
                      "sourceHashes": {**{name: digest(path) for name, path in sources.items()},
                                       "config_comparison": digest(comparison_path)},
                      "rows": rows, "currentOnlyMappings": current_only}
    public_report = {"schemaVersion": 1, "kind": "MORIMENS_PC_RES151_WHEEL_INITIAL_STATE_COMPATIBILITY",
                     "analysisTrack": "mechanics", "status": "PARTIAL_COMPATIBILITY",
                     "historicalBuild": "pc-res144-build51", "currentBuild": "pc-res151-build51",
                     "sourceHashes": private_report["sourceHashes"],
                     "counts": {"historicalWheelIdentities": len(public_wheels),
                                "historicallyUniqueWheelLinks": len(rows), "currentItemRows": len(inputs["current_items"]),
                                "currentStateRows": len(inputs["current_states"]),
                                "unchangedItemAttributeRows": attribute_rows_equal,
                                "currentCatalogMainstatBaseMatches": len(rows)+len(current_only),
                                "CURRENT_ONLY_UNIQUE_ICON_MAINSTAT_BASE_MATCH": len(current_only),
                                "HISTORICAL_CROSSWALK_UNRESOLVED": 4, **status_counts},
                     "wheels": public_wheels,
                     "exceptions": [{"wheelId": row["wheelId"], "status": row["status"]}
                                    for row in rows if row["status"] != "INITIAL_DIRECT_PROPERTY_UNCHANGED"],
                     "currentOnlyMatches": [{"wheelId": row["wheelId"], "status": row["status"]} for row in current_only],
                     "scope": "Historical unique Wheel links checked against installed resource-151 Item and State tables by retained Item ID or unique exact full-icon replacement. Item main/sub-attribute, state parameter/target and direct-property equality are static source comparisons.",
                     "limitations": ["Two historical Item IDs were replaced by unique full-icon matches with equivalent Item attribute rows, state parameters, target and initial direct-property map; this does not independently verify equipped gameplay state.",
                                     "Three linked initial states changed direct-property expressions; historical expressions cannot be used for current calculations.",
                                     "One historically missing Wheel has a unique current exact-icon Weapon Item whose main-stat code and base agree with the source-derived mapping; its historical passive-rule comparison is unavailable.",
                                     "Four historically ambiguous Wheel crosswalks, other new items, enhancement scaling, attachment, triggers and gameplay effects are outside this audit.",
                                     "Static equality does not validate full Wheel execution, build legality, damage or an independent gameplay prediction."]}
    private_output.parent.mkdir(parents=True, exist_ok=True)
    public_output.parent.mkdir(parents=True, exist_ok=True)
    private_output.write_text(json.dumps(private_report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    public_output.write_text(json.dumps(public_report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"publicOutput": str(public_output.relative_to(ROOT)), "counts": public_report["counts"]}, indent=2))


if __name__ == "__main__":
    main()
