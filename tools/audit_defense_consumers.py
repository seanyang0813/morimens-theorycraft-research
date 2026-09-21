"""Trace source-DEF expressions into command effect categories for two PC builds."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEF_EXPRESSION = re.compile(r"\bBattleDefForce\b|\bDefForce\b|\b(?:CmdCaster|TargetCmdOwner|UpperTarget)\.def\b")
ARG_REFERENCE = re.compile(r"(?<![A-Za-z0-9_])Arg(\d+)(?![A-Za-z0-9_])")
DAMAGE_EFFECTS = {"BEActiveDamage", "BEPassiveDamage", "BEFixedDamage", "BEPureDamage", "BETentacleAttack"}


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def split_arguments(expression: str):
    values, start, depth, quote, escaped = [], 0, 0, None, False
    for index, char in enumerate(expression):
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
        elif char in "'\"":
            quote = char
        elif char in "([{":
            depth += 1
        elif char in ")]}":
            depth -= 1
            if depth < 0:
                raise ValueError("Unbalanced skill expression")
        elif char == "," and depth == 0:
            values.append(expression[start:index].strip())
            start = index + 1
    if quote or depth:
        raise ValueError("Unbalanced skill expression")
    values.append(expression[start:].strip())
    return values


def variants(value):
    if isinstance(value, str):
        return [("default", value)]
    if isinstance(value, dict):
        return [(str(key), item) for key, item in value.items() if isinstance(item, str)]
    return []


def command_variants(value, skill_variant):
    if isinstance(value, int):
        return [("default", value)]
    if not isinstance(value, dict):
        return []
    if skill_variant in value and isinstance(value[skill_variant], int):
        return [(skill_variant, value[skill_variant])]
    return [(str(key), item) for key, item in value.items() if isinstance(item, int)]


def rows(value):
    if isinstance(value, list):
        return [(str(index + 1), row) for index, row in enumerate(value)]
    if isinstance(value, dict):
        return [(str(key), row) for key, row in value.items()]
    return []


def display_name(row):
    value = row.get("Name") if isinstance(row, dict) else None
    return value.split("|", 1)[-1] if isinstance(value, str) else None


def usage(effect_type):
    if effect_type in DAMAGE_EFFECTS:
        return "damage"
    if effect_type and effect_type.startswith("BEGainBlock"):
        return "shield"
    if effect_type == "BEHeal":
        return "heal"
    if effect_type in {"BEAddState", "BERemoveState", "BESubStateLayer"}:
        return "state"
    if effect_type == "BESummonMonster":
        return "summon"
    return "other"


def audit_build(build, directory: Path):
    paths = {name: directory / f"{name}.json" for name in ("Skill", "Cmd", "BattleApi", "AwakerConfig", "State")}
    data = {name: json.loads(path.read_text(encoding="utf-8")) for name, path in paths.items()}
    formula = data["BattleApi"].get("BattleDefForce", {}).get("Data")
    if formula != "math.ceil(TargetCmdOwner.def*(1 + TargetCmdOwner.def_per/100))":
        raise ValueError(f"Unexpected BattleDefForce formula for {build}")
    routes, skills_with_defense = [], set()
    for skill_id, skill in data["Skill"].items():
        for skill_variant, expression in variants(skill.get("Para")):
            defense_arguments = {
                index + 1 for index, item in enumerate(split_arguments(expression)) if DEF_EXPRESSION.search(item)
            }
            if not defense_arguments:
                continue
            skills_with_defense.add(skill_id)
            for command_variant, command_id in command_variants(skill.get("CmdList"), skill_variant):
                command = data["Cmd"].get(str(command_id), {})
                for row_id, row in rows(command.get("data_list")):
                    if not isinstance(row, dict):
                        continue
                    parameter = str(row.get("Para", ""))
                    consumed = sorted({int(item) for item in ARG_REFERENCE.findall(parameter)} & defense_arguments)
                    direct = bool(DEF_EXPRESSION.search(parameter))
                    if not consumed and not direct:
                        continue
                    awakener_id = skill.get("AwakerID")
                    route = {
                        "skillId": int(skill_id) if str(skill_id).isdigit() else skill_id,
                        "skillName": display_name(skill),
                        "awakenerId": awakener_id,
                        "awakenerName": display_name(data["AwakerConfig"].get(str(awakener_id), {})),
                        "skillVariant": skill_variant,
                        "commandId": command_id,
                        "commandVariant": command_variant,
                        "commandRow": int(row_id) if row_id.isdigit() else row_id,
                        "effectType": row.get("Type"),
                        "usage": usage(row.get("Type")),
                        "defenseArgumentIndexes": consumed,
                        "directDefenseRead": direct,
                    }
                    if row.get("Type") == "BEAddState":
                        parameters = split_arguments(parameter)
                        state_id = int(parameters[0]) if parameters and parameters[0].isdigit() else None
                        state = data["State"].get(str(state_id), {}) if state_id is not None else {}
                        properties = state.get("ExistProperty") if isinstance(state.get("ExistProperty"), dict) else {}
                        route.update({
                            "stateId": state_id,
                            "statePropertyKeys": sorted(properties),
                        })
                    routes.append(route)
    routes.sort(key=lambda row: (str(row["skillId"]), row["skillVariant"], row["commandId"], str(row["commandRow"])))

    direct_damage_rows = []
    for command_id, command in data["Cmd"].items():
        for row_id, row in rows(command.get("data_list")):
            if isinstance(row, dict) and row.get("Type") in DAMAGE_EFFECTS and DEF_EXPRESSION.search(str(row.get("Para", ""))):
                direct_damage_rows.append({"commandId": command_id, "commandRow": row_id, "effectType": row.get("Type")})
    effect_counts = Counter(row["effectType"] or "UNSPECIFIED" for row in routes)
    usage_counts = Counter(row["usage"] for row in routes)
    state_routes = [row for row in routes if row["effectType"] == "BEAddState"]
    literal_state_routes = [row for row in state_routes if row.get("stateId") is not None]
    property_counts = Counter(key for row in literal_state_routes for key in row.get("statePropertyKeys", []))
    damage_property_keys = {"damage_plus", "tentacle_dmg", "be_damage_plus"}
    damage_property_routes = [row for row in literal_state_routes if damage_property_keys.intersection(row.get("statePropertyKeys", []))]
    return {
        "build": build,
        "sourceHashes": {name: sha256(path) for name, path in paths.items()},
        "battleDefForceOperation": "ceil(source DEF × (1 + source DEF% / 100))",
        "defenseDerivedSkills": len(skills_with_defense),
        "consumerRoutes": len(routes),
        "effectTypeCounts": dict(sorted(effect_counts.items())),
        "usageCounts": dict(sorted(usage_counts.items())),
        "damageRoutes": [row for row in routes if row["usage"] == "damage"],
        "directDamageRowsWithDefenseExpression": direct_damage_rows,
        "stateConsumerSummary": {
            "addStateRoutes": len(state_routes),
            "literalStateIdRoutes": len(literal_state_routes),
            "uniqueLiteralStateIds": len({row["stateId"] for row in literal_state_routes}),
            "propertyRouteCounts": dict(sorted(property_counts.items())),
            "indirectDamagePropertyRoutes": len(damage_property_routes),
            "indirectDamagePropertyStateIds": sorted({row["stateId"] for row in damage_property_routes}),
        },
    }


def build_report(baseline_dir: Path, current_dir: Path):
    baseline = audit_build("pc-res144-build51", baseline_dir)
    current = audit_build("pc-res150-build51", current_dir)
    route_identity = baseline["damageRoutes"] == current["damageRoutes"]
    indirect_damage_identity = baseline["stateConsumerSummary"]["indirectDamagePropertyStateIds"] == current["stateConsumerSummary"]["indirectDamagePropertyStateIds"] and baseline["stateConsumerSummary"]["indirectDamagePropertyRoutes"] == current["stateConsumerSummary"]["indirectDamagePropertyRoutes"]
    return {
        "schemaVersion": 1,
        "kind": "MORIMENS_DEFENSE_CONSUMER_AUDIT",
        "analysisTrack": "mechanics",
        "status": "STATIC_CONSUMER_INVENTORY",
        "builds": [baseline, current],
        "crossBuild": {"damageRoutesIdentical": route_identity, "indirectDamageStateSummaryIdentical": indirect_damage_identity},
        "conclusions": {
            "universalTargetDefenseMitigationFound": False,
            "sourceDefenseCanEnterDamageBase": bool(baseline["damageRoutes"] or current["damageRoutes"]),
            "sourceDefenseCanFeedDamageModifyingStates": bool(baseline["stateConsumerSummary"]["indirectDamagePropertyRoutes"] or current["stateConsumerSummary"]["indirectDamagePropertyRoutes"]),
            "damageRouteCountPerBuild": {baseline["build"]: len(baseline["damageRoutes"]), current["build"]: len(current["damageRoutes"])},
            "interpretation": "BattleDefForce is a source-stat expression. Its appearance in a skill argument does not establish target DEF mitigation.",
        },
        "limitations": [
            "Static Skill-to-Cmd argument lineage only; conditions, progression selection and effect execution are not evaluated",
            "No claim that unfinished or inaccessible catalog skills are player-usable",
            "Indirect state/status mechanics may read DEF after the inspected command route",
            "Absence of a universal divisor is limited to the traced Active final-target and BeHit code plus this catalog inventory",
            "No Android combat bundles, gameplay validation or holdout credit",
        ],
        "trackBoundary": "Mechanics-reconstruction evidence only. It does not classify cheese, compare build investment, recommend a theorycraft sequence or supply verification credit.",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline-dir", type=Path, default=ROOT / "research" / "extracted" / "config")
    parser.add_argument("--current-dir", type=Path, default=ROOT / "research" / "observations" / "current-res150-build51" / "modules")
    parser.add_argument("--output", type=Path, default=ROOT / "research" / "evidence" / "defense-consumer-audit.json")
    args = parser.parse_args()
    report = build_report(args.baseline_dir, args.current_dir)
    output = args.output.resolve()
    evidence_root = (ROOT / "research" / "evidence").resolve()
    try:
        output.relative_to(evidence_root)
    except ValueError as error:
        raise ValueError("Output must stay inside research/evidence") from error
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({
        "output": str(output.relative_to(ROOT)),
        "builds": [{"build": row["build"], "consumerRoutes": row["consumerRoutes"], "damageRoutes": len(row["damageRoutes"])} for row in report["builds"]],
        "damageRoutesIdentical": report["crossBuild"]["damageRoutesIdentical"],
    }, indent=2))


if __name__ == "__main__":
    main()
