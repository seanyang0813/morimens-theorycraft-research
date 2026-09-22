"""Audit the SKeyDB Wheel-to-PC-client state boundary without publishing raw rows."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SKEYDB = ROOT / "research" / "raw" / "skeydb-source"
DEFAULT_ITEMS = ROOT / "research" / "observations" / "wheel-config-audit" / "Item.json"
DEFAULT_STATES = ROOT / "research" / "extracted" / "config" / "State.json"
DEFAULT_COMMANDS = ROOT / "research" / "extracted" / "config" / "Cmd.json"
PUBLIC_OUTPUT = ROOT / "research" / "evidence" / "wheel-state-crosswalk-audit.json"
PRIVATE_OUTPUT = ROOT / "research" / "observations" / "wheel-config-audit" / "crosswalk-audit.json"
CASE_WHEELS = {
    "wheel-0029": "Mouchette-associated: Doomsday Rampage",
    "wheel-0117": "Mouchette-associated: Light of Intellect",
    "wheel-0128": "Arachne-associated: Eternal Weave",
    "wheel-0132": "Arachne-associated: Rota Fortunae",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def icon_stem(value: object) -> str:
    return PurePosixPath(str(value or "").replace("\\", "/")).stem


def load_inputs(skeydb: Path, item_path: Path) -> tuple[list[dict], dict, dict, Path, Path]:
    wheels_path = skeydb / "src" / "data" / "public-v3" / "catalogs" / "wheels.json"
    assets_path = skeydb / "src" / "data" / "public-v3" / "indexes" / "assets.json"
    wheels_doc = json.loads(wheels_path.read_text(encoding="utf-8"))
    assets_doc = json.loads(assets_path.read_text(encoding="utf-8"))
    items = json.loads(item_path.read_text(encoding="utf-8"))
    return wheels_doc["records"], assets_doc["assets"], items, wheels_path, assets_path


def audit(skeydb: Path, item_path: Path, state_path: Path, command_path: Path) -> tuple[dict, dict]:
    wheels, assets, items, wheels_path, assets_path = load_inputs(skeydb, item_path)
    states = json.loads(state_path.read_text(encoding="utf-8"))
    commands = json.loads(command_path.read_text(encoding="utf-8"))
    asset_by_owner = {
        row["ownerId"]: row.get("assetId")
        for row in assets.values()
        if row.get("kind") == "wheel" and row.get("slot") == "icon"
    }
    weapon_rows = [row for row in items.values() if row.get("Type") == "Weapon"]
    by_icon: dict[str, list[dict]] = defaultdict(list)
    for row in weapon_rows:
        by_icon[icon_stem(row.get("SpIcon"))].append(row)

    private_rows = []
    public_cases = []
    counts = defaultdict(int)
    for wheel in wheels:
        wheel_id = wheel["id"]
        asset_id = asset_by_owner.get(wheel_id)
        candidates = by_icon.get(asset_id or "", [])
        status = "UNIQUE" if len(candidates) == 1 else "MISSING" if not candidates else "AMBIGUOUS"
        counts[status] += 1
        row = {
            "wheelId": wheel_id,
            "wheelName": wheel["name"],
            "assetId": asset_id,
            "status": status,
            "candidateCount": len(candidates),
            "candidates": [
                {
                    "itemId": candidate.get("ID"),
                    "initialStateId": candidate.get("State1"),
                    "stateTarget": candidate.get("StateTarget1"),
                    "stateParameters": candidate.get("StatePara"),
                }
                for candidate in candidates
            ],
        }
        private_rows.append(row)
        if wheel_id in CASE_WHEELS:
            if status != "UNIQUE":
                raise ValueError(f"Required case-study Wheel is not unique: {wheel_id}")
            candidate = candidates[0]
            public_cases.append(
                {
                    "wheelId": wheel_id,
                    "name": wheel["name"],
                    "caseRole": CASE_WHEELS[wheel_id],
                    "matchStatus": status,
                    "initialStateId": candidate.get("State1"),
                    "stateTarget": candidate.get("StateTarget1"),
                    "parameterSlotCount": len(candidate.get("StatePara") or {}),
                }
            )

    try:
        revision = subprocess.check_output(
            ["git", "-C", str(skeydb), "rev-parse", "HEAD"], text=True
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        revision = "unknown"

    summary = {
        "wheelCount": len(wheels),
        "wheelIconAssetCount": len(asset_by_owner),
        "clientWeaponRowCount": len(weapon_rows),
        "uniqueMatches": counts["UNIQUE"],
        "missingMatches": counts["MISSING"],
        "ambiguousMatches": counts["AMBIGUOUS"],
        "uniqueMatchesWithInitialState": sum(
            1 for row in private_rows if row["status"] == "UNIQUE" and row["candidates"][0]["initialStateId"] is not None
        ),
        "uniqueMatchesWithStateParameters": sum(
            1 for row in private_rows if row["status"] == "UNIQUE" and row["candidates"][0]["stateParameters"]
        ),
    }
    if summary != {
        "wheelCount": 146,
        "wheelIconAssetCount": 146,
        "clientWeaponRowCount": 181,
        "uniqueMatches": 141,
        "missingMatches": 1,
        "ambiguousMatches": 4,
        "uniqueMatchesWithInitialState": 141,
        "uniqueMatchesWithStateParameters": 141,
    }:
        raise ValueError(f"Unexpected Wheel crosswalk summary: {summary}")

    source = {
        "skeydbRevision": revision,
        "skeydbWheelCatalogSha256": sha256(wheels_path),
        "skeydbAssetIndexSha256": sha256(assets_path),
        "privateClientItemExportSha256": sha256(item_path),
        "privateClientStateExportSha256": sha256(state_path),
        "privateClientCommandExportSha256": sha256(command_path),
    }
    trigger_histogram = defaultdict(int)
    trigger_command_ids = []
    property_state_count = 0
    judgement_count = 0
    for row in private_rows:
        if row["status"] != "UNIQUE":
            continue
        state_id = str(row["candidates"][0]["initialStateId"])
        if state_id not in states:
            raise ValueError(f"Unique Wheel initial state is absent: {state_id}")
        state = states[state_id]
        command_ids = [
            str(int(value))
            for key, value in state.items()
            if re.fullmatch(r"TriggerCmd\d+", key) and isinstance(value, (int, float)) and value
        ]
        trigger_histogram[len(command_ids)] += 1
        trigger_command_ids.extend(command_ids)
        property_state_count += bool(state.get("ExistProperty"))
        judgement_count += sum(
            1 for key, value in state.items() if re.fullmatch(r"Judgement\d+", key) and value
        )
    missing_commands = sorted({command_id for command_id in trigger_command_ids if command_id not in commands})
    if missing_commands:
        raise ValueError(f"Initial-state trigger commands are absent: {missing_commands}")
    initial_state_graph = {
        "resolvedInitialStates": 141,
        "initialStatesWithDirectProperties": property_state_count,
        "triggerCommandReferences": len(trigger_command_ids),
        "uniqueTriggerCommands": len(set(trigger_command_ids)),
        "unresolvedTriggerCommands": len(missing_commands),
        "initialStateTriggerCountHistogram": {str(key): trigger_histogram[key] for key in sorted(trigger_histogram)},
        "judgementExpressionsPresent": judgement_count,
    }
    expected_graph = {
        "resolvedInitialStates": 141,
        "initialStatesWithDirectProperties": 63,
        "triggerCommandReferences": 229,
        "uniqueTriggerCommands": 190,
        "unresolvedTriggerCommands": 0,
        "initialStateTriggerCountHistogram": {"0": 4, "1": 75, "2": 38, "3": 18, "4": 6},
        "judgementExpressionsPresent": 104,
    }
    if initial_state_graph != expected_graph:
        raise ValueError(f"Unexpected initial-state graph summary: {initial_state_graph}")
    private = {"schemaVersion": 1, "source": source, "summary": summary, "initialStateGraph": initial_state_graph, "rows": private_rows}
    public = {
        "schemaVersion": 1,
        "kind": "MORIMENS_WHEEL_TO_CLIENT_STATE_CROSSWALK_AUDIT",
        "analysisTrack": "mechanics",
        "status": "STATIC_CATALOG_CROSSWALK",
        "source": source,
        "join": {
            "left": "SKeyDB public-v3 Wheel icon assetId",
            "right": "PC client Item Weapon SpIcon basename",
            "rule": "exact string equality after extracting the icon filename stem",
        },
        "summary": summary,
        "initialStateGraph": initial_state_graph,
        "caseStudyBoundary": public_cases,
        "claims": [
            "A unique icon join identifies a client Weapon row and its initial state-attachment boundary for 141 of 146 public Wheel identities.",
            "All 141 unique initial states resolve; together they reference 229 trigger commands across 190 unique command IDs, and every referenced command exists in the client command catalog.",
            "The four named Mouchette/Arachne case-study Wheels each have one unique client row with an initial state, target, and parameter slots.",
        ],
        "limitations": [
            "This is a static identity crosswalk. It does not execute the initial state, descendants, triggers, conditions, formulas, stacking, or refinement parameters.",
            "One public Wheel has no matching client icon and four have multiple client rows; those five are unresolved and must fail closed.",
            "Associated owner labels are discovery metadata, not proof that a Wheel is unique, equipped, legal, optimal, or active in a replay.",
            "Raw client rows, localized descriptions, parameter expressions, and ambiguous candidates remain private.",
            "This mechanics artifact makes no cheese, budget-scouting, theorycraft recommendation, gameplay-validation, or holdout claim.",
        ],
    }
    return private, public


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skeydb", type=Path, default=DEFAULT_SKEYDB)
    parser.add_argument("--items", type=Path, default=DEFAULT_ITEMS)
    parser.add_argument("--states", type=Path, default=DEFAULT_STATES)
    parser.add_argument("--commands", type=Path, default=DEFAULT_COMMANDS)
    parser.add_argument("--public-output", type=Path, default=PUBLIC_OUTPUT)
    parser.add_argument("--private-output", type=Path, default=PRIVATE_OUTPUT)
    args = parser.parse_args()
    private, public = audit(args.skeydb, args.items, args.states, args.commands)
    args.private_output.parent.mkdir(parents=True, exist_ok=True)
    args.public_output.parent.mkdir(parents=True, exist_ok=True)
    args.private_output.write_text(json.dumps(private, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    args.public_output.write_text(json.dumps(public, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.public_output), "summary": public["summary"]}, indent=2))


if __name__ == "__main__":
    main()
