"""Catalog explicit guaranteed-critical skill routes in a copied client build.

This is a source-data audit, not a simulator or gameplay validation. It reads
only the selected Skill, Cmd, State and AwakerConfig tables and prints no
account or replay identifiers.
"""

import argparse
import hashlib
import json
from pathlib import Path


def label(value):
    return str(value or "").split("|", 1)[-1]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--modules", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    paths = {name: args.modules / f"{name}.json" for name in ("Skill", "Cmd", "State", "AwakerConfig", "RelicConfig")}
    tables = {name: json.loads(path.read_text(encoding="utf-8")) for name, path in paths.items()}

    certain_states = {
        int(state_id)
        for state_id, row in tables["State"].items()
        if row.get("ExistProperty", {}).get("certain_crit") == 1
    }
    routes = []
    for skill_id, skill in tables["Skill"].items():
        if "必定暴击" not in str(skill.get("Desc", "")):
            continue
        cmd_id = skill.get("CmdList")
        command = tables["Cmd"].get(str(cmd_id), {})
        rows = command.get("data_list", [])
        owners = [
            {"characterId": int(character_id), "character": label(character.get("Name")), "school": character.get("School")}
            for character_id, character in tables["AwakerConfig"].items()
            if int(skill_id) in character.get("SkillList", [])
        ]
        routes.append(
            {
                "skillId": int(skill_id),
                "skill": label(skill.get("Name")),
                "owners": owners,
                "commandId": cmd_id,
                "guaranteedCriticalStateIdsReferenced": sorted(
                    state_id for state_id in certain_states if any(
                        str(state_id) in str(row.get("Para", "")).split(",")
                        for row in rows
                    )
                ),
                "directDamageRowCount": sum(str(row.get("Type", "")).startswith("BEActiveDamage") for row in rows),
                "nestedCommandRowCount": sum(row.get("Type") == "BEExecuteCmd" for row in rows),
            }
        )
    routes.sort(key=lambda row: row["skillId"])
    relic_routes = []
    for relic_id, relic in tables["RelicConfig"].items():
        if not any(phrase in str(relic.get("Desc", "")) for phrase in ("必定暴击", "必然暴击")):
            continue
        initial_states = relic.get("State1", [])
        if isinstance(initial_states, dict):
            initial_states = [initial_states[key] for key in sorted(initial_states, key=int)]
        if not isinstance(initial_states, list) or not all(isinstance(value, int) for value in initial_states):
            raise ValueError(f"Relic {relic_id} has unsupported initial state list")
        trigger_commands = sorted({
            value
            for state_id in initial_states
            for key, value in tables["State"].get(str(state_id), {}).items()
            if key.startswith("TriggerCmd") and isinstance(value, int)
        })
        initial_critical_properties = {
            str(state_id): {
                key: value
                for key, value in tables["State"].get(str(state_id), {}).get("ExistProperty", {}).items()
                if "crit" in key
            }
            for state_id in initial_states
        }
        certain_grants = sorted({
            state_id
            for command_id in trigger_commands
            for row in tables["Cmd"].get(str(command_id), {}).get("data_list", [])
            if row.get("Type") == "BEAddState"
            for state_id in certain_states
            if str(row.get("Para", "")).split(",", 1)[0] == str(state_id)
        })
        relic_routes.append({
            "relicId": int(relic_id),
            "relic": label(relic.get("Name")),
            "unlockLevel": relic.get("UnlockLevel"),
            "stageChapter": relic.get("StageChapter"),
            "initialStateIds": initial_states,
            "initialCriticalProperties": {key: value for key, value in initial_critical_properties.items() if value},
            "triggerCommandIds": trigger_commands,
            "grantedCertainCritStateIds": certain_grants,
        })
    relic_routes.sort(key=lambda row: row["relicId"])
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_EXPLICIT_GUARANTEED_CRIT_SKILL_CATALOG",
        "sourceSha256": {name: sha256(path) for name, path in paths.items()},
        "certainCritStateIds": sorted(certain_states),
        "skillsWhoseDescriptionSaysGuaranteedCritical": routes,
        "relicsWhoseDescriptionSaysGuaranteedCritical": relic_routes,
        "limitations": [
            "Text search covers explicit guaranteed-critical skill and relic descriptions only; it is not an exhaustive route search.",
            "Command counts describe only the first command list and do not execute conditions, nested commands, state triggers or generated cards.",
            "Relic grants are static one-level links from initial state through trigger command, without trigger ordering or acquisition proof.",
            "No character ownership, stage availability, combat damage or replay outcome is established.",
        ],
        "publicationCredit": False,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"skills": len(routes), "relics": len(relic_routes), "certainCritStates": len(certain_states), "output": str(args.output)}))


if __name__ == "__main__":
    main()
