"""Compare resource-144 and installed resource-150 target-eligibility catalogs."""
from pathlib import Path
import ctypes as C
import hashlib
import json

from runtime_oracle import Oracle, ROOT

BASE_STATE = ROOT / "research/extracted/config/State.json"
CURRENT_ROOT = ROOT / "research/observations/current-res150-build51/modules"
CURRENT_STATE = CURRENT_ROOT / "State.json"
BASE_CONSTANT = ROOT / "research/extracted/pc/downloaded/config/-7001733389984667866_Constant.lua"
BASE_API = ROOT / "research/extracted/pc/downloaded/config/-6894225089628909939_BattleApi.lua"
CURRENT_CONSTANT = CURRENT_ROOT / "Constant.lua"
CURRENT_API = CURRENT_ROOT / "BattleApi.lua"
OUTPUT = ROOT / "research/evidence/pc-res150-target-eligibility-catalog.json"

API_PROPERTIES = [
    "damage_per2monster_boss", "damage_per2monster_elite", "damage_per2monster_normal",
    "damage_per2monster_grade1", "damage_per2monster_grade2", "damage_per2enemy_has_weak",
    "damage_per2enemy_has_vulnerable", "damage_per2enemy_has_posion", "damage_per2enemy_has_frail",
    "damage_per2petrify_resist", "damage_per2enemy_has_sculptor", "damage_per2enemy_has_mutated",
    "damage_per2enemy_has_snow", "damage_per2enemy_has_blood", "damage_per2enemy_has_special1",
    "damage_per2buff_enemy", "damage_per2debuff_enemy", "damage_per2block_barrier",
    "card_damage_per2block_barrier",
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class TableReader:
    LUA_TNIL, LUA_TBOOLEAN, LUA_TNUMBER, LUA_TSTRING, LUA_TTABLE = 0, 1, 3, 4, 5

    def __init__(self):
        self.oracle = Oracle()
        lib, pointer, integer = self.oracle.lib, C.c_void_p, C.c_int
        self.gettop = lib.lua_gettop
        self.gettop.restype, self.gettop.argtypes = integer, [pointer]
        self.pushnil = lib.lua_pushnil
        self.pushnil.restype, self.pushnil.argtypes = None, [pointer]
        self.next = lib.lua_next
        self.next.restype, self.next.argtypes = integer, [pointer, integer]
        self.kind = lib.lua_type
        self.kind.restype, self.kind.argtypes = integer, [pointer, integer]
        self.boolean = lib.lua_toboolean
        self.boolean.restype, self.boolean.argtypes = integer, [pointer, integer]

    def absolute(self, index):
        return index if index > 0 else self.gettop(self.oracle.state) + index + 1

    def value(self, index, depth=0):
        if depth > 8:
            raise ValueError("Unexpectedly deep config table")
        state, kind = self.oracle.state, self.kind(self.oracle.state, index)
        if kind == self.LUA_TNIL:
            return None
        if kind == self.LUA_TBOOLEAN:
            return bool(self.boolean(state, index))
        if kind == self.LUA_TNUMBER:
            value = self.oracle.tonumber(state, index, None)
            return int(value) if value.is_integer() else value
        if kind == self.LUA_TSTRING:
            value = self.oracle.string(state, index, None)
            return value.decode("utf-8", "surrogateescape")
        if kind != self.LUA_TTABLE:
            raise ValueError(f"Unsupported Lua config value type {kind}")
        absolute, result = self.absolute(index), {}
        self.pushnil(state)
        while self.next(state, absolute):
            key = self.value(-2, depth + 1)
            result[str(key)] = self.value(-1, depth + 1)
            self.oracle.top(state, -2)
        numeric = sorted(int(key) for key in result if key.isdigit() and int(key) > 0)
        if len(numeric) == len(result) and numeric == list(range(1, len(result) + 1)):
            return [result[str(index)] for index in numeric]
        return result

    def field(self, module_name, path, field):
        state = self.oracle.state
        self.oracle.top(state, 0)
        self.oracle.module(module_name, {"output": str(path.relative_to(ROOT))})
        self.oracle.getfield(state, -1, field.encode())
        return self.value(-1)


def main():
    for path in [BASE_STATE, CURRENT_STATE, BASE_CONSTANT, CURRENT_CONSTANT, BASE_API, CURRENT_API]:
        if not path.is_file():
            raise FileNotFoundError(path)
    baseline = json.loads(BASE_STATE.read_text(encoding="utf-8"))
    current = json.loads(CURRENT_STATE.read_text(encoding="utf-8"))
    shared = sorted(set(baseline) & set(current), key=int)
    classification_changes = [
        {"stateId": int(state_id), "baseline": baseline[state_id].get("IsBuff"), "current": current[state_id].get("IsBuff")}
        for state_id in shared if baseline[state_id].get("IsBuff") != current[state_id].get("IsBuff")
    ]
    classification = {None: "none", "TRUE": "buff", "FALSE": "debuff"}
    current_state_types = {state_id: classification[row.get("IsBuff")] for state_id, row in current.items()}
    reader = TableReader()
    constant = {
        "baseline": reader.field("Constant", BASE_CONSTANT, "DamagePer2HasState"),
        "current": reader.field("Constant", CURRENT_CONSTANT, "DamagePer2HasState"),
    }
    api = {}
    for prop in API_PROPERTIES:
        baseline_row = reader.field("BattleApi", BASE_API, prop)
        current_row = reader.field("BattleApi", CURRENT_API, prop)
        api[prop] = {"baselineData": baseline_row.get("Data"), "currentData": current_row.get("Data"), "matches": baseline_row.get("Data") == current_row.get("Data")}
    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_PC_TARGET_ELIGIBILITY_CATALOG_COMPARISON",
        "baselineBuild": "pc-res144-build51",
        "currentBuild": "pc-res150-build51",
        "sourceHashes": {name: sha(path) for name, path in {
            "baselineState": BASE_STATE, "currentState": CURRENT_STATE,
            "baselineConstant": BASE_CONSTANT, "currentConstant": CURRENT_CONSTANT,
            "baselineBattleApi": BASE_API, "currentBattleApi": CURRENT_API,
        }.items()},
        "stateClassification": {
            "baselineRows": len(baseline), "currentRows": len(current), "sharedRows": len(shared),
            "newCurrentRows": len(set(current) - set(baseline)), "missingCurrentRows": len(set(baseline) - set(current)),
            "sharedClassificationChanges": classification_changes,
        },
        "currentStateTypes": current_state_types,
        "damagePer2HasState": {**constant, "matches": constant["baseline"] == constant["current"]},
        "battleApiData": api,
        "status": "EXACT_MATCH_FOR_SHARED_STATE_CLASSIFICATION_AND_TARGET_MAPPINGS" if not classification_changes and constant["baseline"] == constant["current"] and all(row["matches"] for row in api.values()) else "DIFFERENCE_FOUND",
        "scope": "Complete IsBuff comparison for shared State rows plus exact current-bytecode reads of DamagePer2HasState and selected BattleApi.Data target mappings. New current State rows are classified from the installed table; replay state ownership and lifecycle remain separate.",
        "limitations": ["Catalog and bytecode data only; no gameplay or holdout credit", "A target state must exist in the selected build catalog before classification"],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "sharedStateRows": len(shared), "newCurrentRows": report["stateClassification"]["newCurrentRows"], "output": str(OUTPUT.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
