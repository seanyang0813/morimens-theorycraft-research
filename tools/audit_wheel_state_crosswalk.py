"""Audit the SKeyDB Wheel-to-PC-client state boundary without publishing raw rows."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from collections import Counter, defaultdict, deque
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SKEYDB = ROOT / "research" / "raw" / "skeydb-source"
DEFAULT_ITEMS = ROOT / "research" / "observations" / "wheel-config-audit" / "Item.json"
DEFAULT_STATES = ROOT / "research" / "extracted" / "config" / "State.json"
DEFAULT_COMMANDS = ROOT / "research" / "extracted" / "config" / "Cmd.json"
PUBLIC_OUTPUT = ROOT / "research" / "evidence" / "wheel-state-crosswalk-audit.json"
CAPABILITY_OUTPUT = ROOT / "research" / "evidence" / "wheel-mechanics-capability-catalog.json"
PRIVATE_OUTPUT = ROOT / "research" / "observations" / "wheel-config-audit" / "crosswalk-audit.json"
CASE_WHEELS = {
    "wheel-0029": "Mouchette-associated: Doomsday Rampage",
    "wheel-0117": "Mouchette-associated: Light of Intellect",
    "wheel-0128": "Arachne-associated: Eternal Weave",
    "wheel-0132": "Arachne-associated: Rota Fortunae",
}
EFFECT_CATEGORIES = {
    "BEAddState": "state",
    "BERemoveState": "state",
    "BETriggerState": "state",
    "BESubStateLayer": "state",
    "BEActiveDamage": "damage",
    "BEPassiveDamage": "damage",
    "BEGainBlock": "block",
    "BEPassiveBlock": "block",
    "BEChangeAttr.block": "block",
    "BEHeal": "healing",
    "BEPassiveHeal": "healing",
    "BEChangeAttr.hp": "healing",
    "BEChangeMaxHp": "healing",
    "BEPVERebirth": "healing",
    "BEChangeAttr.death_resist": "healing",
    "BEGainUltiEnergy": "ultimate-energy",
    "BEChangeAttr.ulti_energy": "ultimate-energy",
    "BEChangeKeeperEnergy": "keeper-energy",
    "BEGainKeeperEnergy": "keeper-energy",
    "BECreateCard": "card",
    "BEMoveCard": "card",
    "BEDrawCard": "card",
    "BEDestroyCard": "card",
    "BEChangeEnergy": "action-energy",
    "BEScarletBloodChange": "character-resource",
    "BEChangeMoney": "run-resource",
    "BEChangeMaxTentacleCount": "character-resource",
    "BEChangeTentacleCount": "character-resource",
    "BEExecuteCmd": "command-dispatch",
    "BERunKeeperSkillCmd": "command-dispatch",
    "BESetTempArg": "command-context",
    "BEDisplayFloatingText": "presentation",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def icon_stem(value: object) -> str:
    return PurePosixPath(str(value or "").replace("\\", "/")).stem


def potential_state_graph(root_ids: set[str], states: dict, commands: dict) -> dict:
    """Follow literal BEAddState targets; this is connectivity, not execution."""
    queue = deque((state_id, 0) for state_id in sorted(root_ids))
    seen: set[str] = set()
    depths: dict[str, int] = {}
    command_ids: list[str] = []
    edges: list[tuple[str, str]] = []
    dynamic_add_state_rows = 0
    effect_types: Counter[str] = Counter()
    effect_row_occurrences = 0
    while queue:
        state_id, depth = queue.popleft()
        if state_id in seen:
            continue
        seen.add(state_id)
        depths[state_id] = depth
        state = states.get(state_id)
        if state is None:
            raise ValueError(f"Potential Wheel graph state is absent: {state_id}")
        for key, value in state.items():
            if not (re.fullmatch(r"TriggerCmd\d+", key) and isinstance(value, (int, float)) and value):
                continue
            command_id = str(int(value))
            if command_id not in commands:
                raise ValueError(f"Potential Wheel graph command is absent: {command_id}")
            command_ids.append(command_id)
            for row in (commands[command_id].get("data_list") or {}).values():
                effect_row_occurrences += 1
                effect_type = str(row.get("Type"))
                effect_types[effect_type] += 1
                if effect_type != "BEAddState":
                    continue
                match = re.match(r"^\s*(\d+)(?:\s*,|\s*$)", str(row.get("Para")))
                if not match or match.group(1) not in states:
                    dynamic_add_state_rows += 1
                    continue
                child_id = match.group(1)
                edges.append((state_id, child_id))
                queue.append((child_id, depth + 1))

    adjacency: dict[str, set[str]] = defaultdict(set)
    for source, target in set(edges):
        adjacency[source].add(target)
    indexes: dict[str, int] = {}
    lowlinks: dict[str, int] = {}
    stack: list[str] = []
    on_stack: set[str] = set()
    components: list[list[str]] = []

    def strong_connect(state_id: str) -> None:
        indexes[state_id] = lowlinks[state_id] = len(indexes)
        stack.append(state_id)
        on_stack.add(state_id)
        for child_id in sorted(adjacency[state_id]):
            if child_id not in indexes:
                strong_connect(child_id)
                lowlinks[state_id] = min(lowlinks[state_id], lowlinks[child_id])
            elif child_id in on_stack:
                lowlinks[state_id] = min(lowlinks[state_id], indexes[child_id])
        if lowlinks[state_id] != indexes[state_id]:
            return
        component = []
        while True:
            child_id = stack.pop()
            on_stack.remove(child_id)
            component.append(child_id)
            if child_id == state_id:
                break
        components.append(component)

    for state_id in sorted(seen):
        if state_id not in indexes:
            strong_connect(state_id)
    cycles = [
        component
        for component in components
        if len(component) > 1 or (len(component) == 1 and component[0] in adjacency[component[0]])
    ]
    return {
        "rootInitialStates": len(root_ids),
        "potentiallyLinkedStates": len(seen),
        "maximumLiteralAddStateDepth": max(depths.values()),
        "stateDepthHistogram": {str(key): value for key, value in sorted(Counter(depths.values()).items())},
        "statesWithDirectProperties": sum(bool(states[state_id].get("ExistProperty")) for state_id in seen),
        "triggerCommandReferences": len(command_ids),
        "uniqueTriggerCommands": len(set(command_ids)),
        "effectRowOccurrences": effect_row_occurrences,
        "effectTypeCount": len(effect_types),
        "effectRowTypeHistogram": dict(sorted(effect_types.items(), key=lambda item: (-item[1], item[0]))),
        "literalAddStateEdges": len(edges),
        "uniqueLiteralAddStateEdges": len(set(edges)),
        "dynamicAddStateRows": dynamic_add_state_rows,
        "cyclicComponents": len(cycles),
        "statesInCyclicComponents": sum(len(component) for component in cycles),
        "largestCyclicComponent": max((len(component) for component in cycles), default=0),
    }


def load_inputs(skeydb: Path, item_path: Path) -> tuple[list[dict], dict, dict, Path, Path]:
    wheels_path = skeydb / "src" / "data" / "public-v3" / "catalogs" / "wheels.json"
    assets_path = skeydb / "src" / "data" / "public-v3" / "indexes" / "assets.json"
    wheels_doc = json.loads(wheels_path.read_text(encoding="utf-8"))
    assets_doc = json.loads(assets_path.read_text(encoding="utf-8"))
    items = json.loads(item_path.read_text(encoding="utf-8"))
    return wheels_doc["records"], assets_doc["assets"], items, wheels_path, assets_path


def audit(skeydb: Path, item_path: Path, state_path: Path, command_path: Path) -> tuple[dict, dict, dict]:
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
    graph = potential_state_graph(
        {
            str(row["candidates"][0]["initialStateId"])
            for row in private_rows
            if row["status"] == "UNIQUE"
        },
        states,
        commands,
    )
    expected_graph_summary = {
        "rootInitialStates": 141,
        "potentiallyLinkedStates": 353,
        "maximumLiteralAddStateDepth": 3,
        "stateDepthHistogram": {"0": 141, "1": 176, "2": 35, "3": 1},
        "statesWithDirectProperties": 126,
        "triggerCommandReferences": 323,
        "uniqueTriggerCommands": 260,
        "effectRowOccurrences": 589,
        "effectTypeCount": 32,
        "literalAddStateEdges": 332,
        "uniqueLiteralAddStateEdges": 298,
        "dynamicAddStateRows": 9,
        "cyclicComponents": 3,
        "statesInCyclicComponents": 5,
        "largestCyclicComponent": 2,
    }
    for key, value in expected_graph_summary.items():
        if graph.get(key) != value:
            raise ValueError(f"Unexpected potential Wheel graph {key}: {graph.get(key)}")
    private = {"schemaVersion": 1, "source": source, "summary": summary, "initialStateGraph": initial_state_graph, "potentialStateGraph": graph, "rows": private_rows}
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
        "potentialStateGraph": graph,
        "caseStudyBoundary": public_cases,
        "claims": [
            "A unique icon join identifies a client Weapon row and its initial state-attachment boundary for 141 of 146 public Wheel identities.",
            "All 141 unique initial states resolve; together they reference 229 trigger commands across 190 unique command IDs, and every referenced command exists in the client command catalog.",
            "Following only literal BEAddState links expands those roots into a bounded static graph of 353 states and 260 unique trigger commands; this is potential connectivity, not proof that a branch executes.",
            "The four named Mouchette/Arachne case-study Wheels each have one unique client row with an initial state, target, and parameter slots.",
        ],
        "limitations": [
            "This is a static identity crosswalk. It does not execute the initial state, descendants, triggers, conditions, formulas, stacking, or refinement parameters.",
            "Static expansion includes conditional and mutually exclusive rows. Cycles are reported structurally and must not be interpreted as repeated execution.",
            "One public Wheel has no matching client icon and four have multiple client rows; those five are unresolved and must fail closed.",
            "Associated owner labels are discovery metadata, not proof that a Wheel is unique, equipped, legal, optimal, or active in a replay.",
            "Raw client rows, localized descriptions, parameter expressions, and ambiguous candidates remain private.",
            "This mechanics artifact makes no cheese, budget-scouting, theorycraft recommendation, gameplay-validation, or holdout claim.",
        ],
    }
    unknown_effect_types = sorted(set(graph["effectRowTypeHistogram"]) - set(EFFECT_CATEGORIES))
    if unknown_effect_types:
        raise ValueError(f"Unclassified Wheel effect types: {unknown_effect_types}")
    capability_rows = []
    for row in private_rows:
        capability = {
            "wheelId": row["wheelId"],
            "name": row["wheelName"],
            "crosswalkStatus": row["status"],
        }
        if row["status"] == "UNIQUE":
            state_id = str(row["candidates"][0]["initialStateId"])
            state = states[state_id]
            wheel_graph = potential_state_graph({state_id}, states, commands)
            effect_types = list(wheel_graph["effectRowTypeHistogram"])
            capability.update(
                {
                    "initialStateHasDirectProperties": bool(state.get("ExistProperty")),
                    "initialTriggerCount": sum(
                        1
                        for key, value in state.items()
                        if re.fullmatch(r"TriggerCmd\d+", key) and isinstance(value, (int, float)) and value
                    ),
                    "potentiallyLinkedStates": wheel_graph["potentiallyLinkedStates"],
                    "effectTypes": effect_types,
                    "mechanicCategories": sorted({EFFECT_CATEGORIES[value] for value in effect_types}),
                    "dynamicAddStateRows": wheel_graph["dynamicAddStateRows"],
                    "hasStaticCycle": wheel_graph["cyclicComponents"] > 0,
                }
            )
        capability_rows.append(capability)
    capability_catalog = {
        "schemaVersion": 1,
        "kind": "MORIMENS_WHEEL_STATIC_MECHANICS_CAPABILITY_CATALOG",
        "analysisTrack": "mechanics",
        "status": "STATIC_MECHANICS_FINGERPRINTS",
        "sourceAudit": "research/evidence/wheel-state-crosswalk-audit.json",
        "summary": {
            "wheelCount": len(capability_rows),
            "uniqueMechanicsFingerprints": sum(row["crosswalkStatus"] == "UNIQUE" for row in capability_rows),
            "unresolvedFingerprints": sum(row["crosswalkStatus"] != "UNIQUE" for row in capability_rows),
            "mechanicCategoryCount": len(set(EFFECT_CATEGORIES.values())),
        },
        "wheels": capability_rows,
        "limitations": [
            "Categories and effect types describe a static potential graph; they do not prove activation, magnitude, target, timing, legality, stacking, or gameplay behavior.",
            "Conditional and mutually exclusive rows are included. Dynamic state identities and cycles are reported without executing them.",
            "The catalog contains no client descriptions, parameter expressions, judgement expressions, or localized text.",
            "This mechanics artifact is discovery metadata only and makes no cheese, budget-scouting, theorycraft recommendation, optimality, gameplay-validation, or holdout claim.",
        ],
    }
    return private, public, capability_catalog


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skeydb", type=Path, default=DEFAULT_SKEYDB)
    parser.add_argument("--items", type=Path, default=DEFAULT_ITEMS)
    parser.add_argument("--states", type=Path, default=DEFAULT_STATES)
    parser.add_argument("--commands", type=Path, default=DEFAULT_COMMANDS)
    parser.add_argument("--public-output", type=Path, default=PUBLIC_OUTPUT)
    parser.add_argument("--capability-output", type=Path, default=CAPABILITY_OUTPUT)
    parser.add_argument("--private-output", type=Path, default=PRIVATE_OUTPUT)
    args = parser.parse_args()
    private, public, capability_catalog = audit(args.skeydb, args.items, args.states, args.commands)
    args.private_output.parent.mkdir(parents=True, exist_ok=True)
    args.public_output.parent.mkdir(parents=True, exist_ok=True)
    args.capability_output.parent.mkdir(parents=True, exist_ok=True)
    args.private_output.write_text(json.dumps(private, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    args.public_output.write_text(json.dumps(public, indent=2) + "\n", encoding="utf-8")
    args.capability_output.write_text(json.dumps(capability_catalog, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.public_output), "capabilityOutput": str(args.capability_output), "summary": public["summary"]}, indent=2))


if __name__ == "__main__":
    main()
