"""Audit the resource-153 catalog fields used by the narrow replay adapter.

Skill and Cmd routing is taken from the replay's embedded rows, not these local
tables. Only target-state classification, BattleApi and one Constant key need
local catalog carry-forward for this boundary. Client code equality is checked
against the published module comparison.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from compare_pc_config_catalogs import normalize


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "research/evidence"
BEFORE = ROOT / "research/observations/current-res151-build51/modules"
AFTER = ROOT / "research/observations/current-res153-build51/modules"
OUTPUT = EVIDENCE / "pc-res151-to-res153-replay-adapter-dependencies.json"
MODULES = (
    "BattleConst.lua", "BattleUtilServer.lua", "BattleCmdServer.lua",
    "BattleUnitBase.lua", "BattlePropertyServer.lua", "BEActiveDamage.lua",
)
STATE_CLASS = {None: "none", "TRUE": "buff", "FALSE": "debuff"}


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    if OUTPUT.exists():
        raise FileExistsError("Refusing to overwrite resource-153 dependency audit")
    carry_path = EVIDENCE / "pc-res151-to-res153-combat-carryforward.json"
    catalog_path = EVIDENCE / "pc-res151-to-res153-config-catalogs.json"
    carry, catalogs = load(carry_path), load(catalog_path)
    if carry.get("beforeBuild") != "pc-res151-build51" or carry.get("afterBuild") != "pc-res153-build51" or carry.get("status") != "TRACKED_COMBAT_MODULES_IDENTICAL":
        raise ValueError("Resource-151 to resource-153 module comparison required")
    module_rows = {row["name"]: row for row in carry["modules"]}
    if any(module_rows.get(name, {}).get("status") != "IDENTICAL" for name in MODULES):
        raise ValueError("A replay-adapter code module changed")
    catalog_rows = {row["name"]: row for row in catalogs["tables"]}
    if catalogs.get("beforeBuild") != carry["beforeBuild"] or catalogs.get("afterBuild") != carry["afterBuild"] or not catalog_rows["BattleApi"]["luaSemanticEquivalent"]:
        raise ValueError("BattleApi or build attribution is incompatible")

    old_state_path, new_state_path = BEFORE / "State.json", AFTER / "State.json"
    old_states, new_states = load(old_state_path), load(new_state_path)
    if sha(old_state_path) != catalog_rows["State"]["beforeRawSha256"] or sha(new_state_path) != catalog_rows["State"]["afterRawSha256"]:
        raise ValueError("Private State files do not match the published catalog comparison")
    if set(old_states) - set(new_states):
        raise ValueError("A previously classified state was removed")
    if any(row.get("IsBuff") not in STATE_CLASS for row in new_states.values()):
        raise ValueError("Unrecognized target-state classification")
    changed_classes = sorted(int(key) for key in old_states if old_states[key].get("IsBuff") != new_states[key].get("IsBuff"))
    if changed_classes:
        raise ValueError(f"Existing state classification changed for {len(changed_classes)} IDs")
    new_state_ids = sorted(set(new_states) - set(old_states), key=int)

    old_constant_path, new_constant_path = BEFORE / "Constant.json", AFTER / "Constant.json"
    old_constants, new_constants = load(old_constant_path), load(new_constant_path)
    if sha(old_constant_path) != catalog_rows["Constant"]["beforeRawSha256"] or sha(new_constant_path) != catalog_rows["Constant"]["afterRawSha256"]:
        raise ValueError("Private Constant files do not match the published catalog comparison")
    key = "DamagePer2HasState"
    if key not in old_constants or key not in new_constants or normalize(old_constants[key], empty_table_marker=True) != normalize(new_constants[key], empty_table_marker=True):
        raise ValueError("Target-state damage-property mapping changed")

    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_REPLAY_ADAPTER_CATALOG_DEPENDENCY_AUDIT",
        "beforeBuild": carry["beforeBuild"],
        "afterBuild": carry["afterBuild"],
        "status": "SELECTED_DEPENDENCIES_COMPATIBLE",
        "sourceEvidence": {
            "moduleCarryforward": {"path": str(carry_path.relative_to(ROOT)).replace('\\', '/'), "sha256": sha(carry_path)},
            "catalogComparison": {"path": str(catalog_path.relative_to(ROOT)).replace('\\', '/'), "sha256": sha(catalog_path)},
        },
        "moduleDependencies": [{"name": name, "sha256": module_rows[name]["after"][0]["sha256"]} for name in MODULES],
        "stateClassification": {
            "beforeRows": len(old_states), "afterRows": len(new_states),
            "sharedClassificationChanges": 0,
            "addedRows": len(new_state_ids),
            "newTypeCounts": {kind: sum(new_states[key].get("IsBuff") == value for key in new_state_ids) for value, kind in STATE_CLASS.items()},
            "beforeRawSha256": sha(old_state_path), "afterRawSha256": sha(new_state_path),
        },
        "battleApiLuaSemanticallyEquivalent": True,
        "constantDamagePer2HasStateLuaSemanticallyEquivalent": True,
        "routing": "Skill, Cmd, MonsterConfig and AwakerConfig must be taken from replay-embedded rows for each candidate; local resource-151 Skill/Cmd equality is not claimed.",
        "scope": "Catalog and selected code dependencies of complete-live-property ordinary Active replay damage; no local constructor, command scheduling or target prediction.",
        "limitations": [
            "This audit alone does not enable resource-153 execution or frozen predictions.",
            "Embedded row presence and identity must be checked on each replay.",
            "No current-build gameplay validation, prediction chronology or holdout credit follows.",
        ],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "sharedClassificationChanges": 0, "addedStates": len(new_state_ids)}))


if __name__ == "__main__":
    main()
