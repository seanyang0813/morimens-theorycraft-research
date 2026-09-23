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
    paths = {name: args.modules / f"{name}.json" for name in ("Skill", "Cmd", "State", "AwakerConfig")}
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
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_EXPLICIT_GUARANTEED_CRIT_SKILL_CATALOG",
        "sourceSha256": {name: sha256(path) for name, path in paths.items()},
        "certainCritStateIds": sorted(certain_states),
        "skillsWhoseDescriptionSaysGuaranteedCritical": routes,
        "limitations": [
            "Text search covers explicit guaranteed-critical skill descriptions only; it is not an exhaustive route search.",
            "Command counts describe only the first command list and do not execute conditions, nested commands, state triggers or generated cards.",
            "No character ownership, stage availability, combat damage or replay outcome is established.",
        ],
        "publicationCredit": False,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"skills": len(routes), "certainCritStates": len(certain_states), "output": str(args.output)}))


if __name__ == "__main__":
    main()
