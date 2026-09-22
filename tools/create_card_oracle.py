"""Observe original BECreateCard at the card-manager boundary.

This is a synthetic original-runtime fixture, not gameplay evidence.  The
original protected PC Lua runs with explicit target-card and manager adapters.
"""
import ctypes as C
import json

from runtime_oracle import Oracle, ROOT


class CreateCardOracle(Oracle):
    def __init__(self, asset_overrides=None):
        super().__init__()
        asset_overrides = asset_overrides or {}
        L = self.state
        self.callbacks = []
        self.errors = []
        self.boolean = self.lib.lua_pushboolean
        self.boolean.argtypes = [C.c_void_p, C.c_int]
        self.kind = self.lib.lua_type
        self.kind.argtypes = [C.c_void_p, C.c_int]
        self.kind.restype = C.c_int
        self.tobool = self.lib.lua_toboolean
        self.tobool.argtypes = [C.c_void_p, C.c_int]
        self.tobool.restype = C.c_int
        self.nil = self.lib.lua_pushnil
        self.nil.argtypes = [C.c_void_p]
        self.pushstring = self.lib.lua_pushstring
        self.pushstring.argtypes = [C.c_void_p, C.c_char_p]
        self.rawseti = self.lib.lua_rawseti
        self.rawseti.argtypes = [C.c_void_p, C.c_int, C.c_longlong]
        self.rawlen = self.lib.lua_rawlen
        self.rawlen.argtypes = [C.c_void_p, C.c_int]
        self.rawlen.restype = C.c_size_t
        self.rawgeti = self.lib.lua_rawgeti
        self.rawgeti.argtypes = [C.c_void_p, C.c_int, C.c_longlong]
        self.rawgeti.restype = C.c_int
        self.absindex = self.lib.lua_absindex
        self.absindex.argtypes = [C.c_void_p, C.c_int]
        self.absindex.restype = C.c_int
        if "BattleConst" in asset_overrides:
            self.module("BattleConst", asset_overrides["BattleConst"]); self.setglobal(L, b"_oracle_bc")

        def new_class(state):
            self.table(state, 0, 16)
            self.table(state, 0, 1)
            self.method("DoEffect", lambda s: 0, state)
            return 2

        self.getglobal(L, b"_oracle_config_system")
        self.method("NewClass", new_class)
        self.top(L, 0)

        def require(state):
            name = self.string(state, 1, None)
            if name == b"System.System":
                self.getglobal(state, b"_oracle_config_system")
            elif name == b"Battle.BattleConst":
                self.getglobal(state, b"_oracle_bc")
            elif name == b"Battle.DbgEngine.Effect.BattleEffectServer":
                self.table(state, 0, 0)
            else:
                self.errors.append("Unexpected dependency: " + repr(name))
                self.nil(state)
            return 1

        self.callback(require)
        self.setglobal(L, b"require")
        self.module("BECreateCard", asset_overrides.get("BECreateCard"))
        self.setglobal(L, b"_create_card_module")
        if self.errors:
            raise RuntimeError(self.errors)

    def callback(self, function):
        wrapped = C.CFUNCTYPE(C.c_int, C.c_void_p)(function)
        self.callbacks.append(wrapped)
        self.pushclosure(self.state, wrapped, 0)

    def method(self, name, function, state=None):
        self.callback(function)
        self.setfield(state or self.state, -2, name.encode())

    def scalar(self, state, index):
        kind = self.kind(state, index)
        if kind == 0:
            return None
        if kind == 1:
            return bool(self.tobool(state, index))
        if kind == 3:
            return self.tonumber(state, index, None)
        if kind == 4:
            return self.string(state, index, None).decode()
        return "<non-scalar>"

    def field(self, state, index, name):
        index = self.absindex(state, index)
        self.getfield(state, index, name.encode())
        result = self.scalar(state, -1)
        self.top(state, -2)
        return result

    def list_scalars(self, state, index):
        index = self.absindex(state, index)
        result = []
        for position in range(1, int(self.rawlen(state, index)) + 1):
            self.rawgeti(state, index, position)
            result.append(self.scalar(state, -1))
            self.top(state, -2)
        return result

    def push_value(self, state, value):
        if value is None:
            self.nil(state)
        elif isinstance(value, dict):
            self.table(state, 0, len(value))
            for key, item in value.items():
                if key == "__camp":
                    self.method("GetCamp", lambda s, item=item: (self.number(s, item), 1)[1], state)
                    continue
                self.push_value(state, item)
                self.setfield(state, -2, str(key).encode())
        elif isinstance(value, list):
            self.table(state, len(value), 0)
            for position, item in enumerate(value, 1):
                self.push_value(state, item)
                self.rawseti(state, -2, position)
        elif isinstance(value, bool):
            self.boolean(state, value)
        elif isinstance(value, (int, float)):
            self.number(state, value)
        else:
            self.pushstring(state, str(value).encode())

    def evaluate(self, values):
        L = self.state
        self.top(L, 0)
        self.errors.clear()
        events = []

        self.table(L, 0, 2)
        self.method("Warn", lambda s: (events.append({"warn": self.scalar(s, 2)}), 0)[1])
        self.table(L, 0, 1)

        def add_new_card(state):
            cards = self.absindex(state, 2)
            config = self.absindex(state, 4)
            request = {
                "cards": [],
                "deck": self.scalar(state, 3),
                "config": {key: self.field(state, config, key) for key in (
                    "enternal", "show", "castRoleUid", "owner", "camp",
                    "performSkillId", "cardTypes", "targetPos")},
            }
            self.getfield(state, config, b"cardArgs")
            request["config"]["cardArgs"] = self.list_scalars(state, -1)
            self.top(state, -2)
            for position in range(1, int(self.rawlen(state, cards)) + 1):
                self.rawgeti(state, cards, position)
                request["cards"].append({"tid": self.field(state, -1, "tid"),
                                         "level": self.field(state, -1, "level")})
                self.top(state, -2)
            events.append({"addNewCard": request})
            self.table(state, len(request["cards"]), 0)
            for position, _ in enumerate(request["cards"], 1):
                self.table(state, 0, 1)
                self.number(state, 9000 + position)
                self.setfield(state, -2, b"uid")
                self.rawseti(state, -2, position)
            return 1

        self.method("AddNewCard", add_new_card)
        self.setfield(L, -2, b"cardMgr")
        self.setglobal(L, b"_create_engine")

        self.table(L, 0, 10)
        self.getglobal(L, b"_create_engine")
        self.setfield(L, -2, b"battleEngine")
        if values.get("cardDeck") is not None:
            self.push_value(L, values["cardDeck"])
            self.setfield(L, -2, b"cardDeck")
        self.table(L, len(values.get("params", [])), 0)
        for position, value in enumerate(values.get("params", []), 1):
            self.push_value(L, value)
            self.rawseti(L, -2, position)
        self.setfield(L, -2, b"params")
        self.table(L, 0, 1)
        self.number(L, values.get("castRoleUid", 77))
        self.setfield(L, -2, b"castRoleUid")
        camp = values.get("camp", 3)
        self.method("GetCamp", lambda s, camp=camp: (self.number(s, camp), 1)[1])
        self.setfield(L, -2, b"cmdServer")
        self.table(L, len(values.get("targets", [])), 0)
        for position, target in enumerate(values.get("targets", []), 1):
            self.table(L, 0, 7)
            self.table(L, 0, 1)
            self.number(L, target["id"])
            self.setfield(L, -2, b"ID")
            self.setfield(L, -2, b"configData")
            self.number(L, target.get("level", 1))
            self.setfield(L, -2, b"level")
            self.number(L, target.get("specialOwner", 0))
            self.setfield(L, -2, b"specialOwner")
            self.table(L, 0, 2)
            self.number(L, target.get("performSkillId", 0))
            self.setfield(L, -2, b"performSkillId")
            self.pushstring(L, target.get("cardTypes", "types").encode())
            self.setfield(L, -2, b"cardTypes")
            self.setfield(L, -2, b"data")
            self.table(L, len(target.get("createCardArgs", [])), 0)
            for arg_position, arg in enumerate(target.get("createCardArgs", []), 1):
                self.push_value(L, arg)
                self.rawseti(L, -2, arg_position)
            self.setfield(L, -2, b"createCardArgs")
            self.rawseti(L, -2, position)
        self.setfield(L, -2, b"targets")
        self.setglobal(L, b"_create_subject")

        self.getglobal(L, b"_create_card_module")
        self.getfield(L, -1, b"DoEffect")
        self.getglobal(L, b"_create_subject")
        self.check(self.call(L, 1, 1, 0, 0, None))
        returned = self.scalar(L, -1)
        self.top(L, 0)
        self.getglobal(L, b"_create_subject")
        self.getfield(L, -1, b"targets")
        output_targets = []
        for position in range(1, int(self.rawlen(L, -1)) + 1):
            self.rawgeti(L, -1, position)
            output_targets.append(self.field(L, -1, "uid"))
            self.top(L, -2)
        if self.errors:
            raise RuntimeError(self.errors)
        return {"returned": returned, "events": events, "outputTargetUids": output_targets}


CASES = [
    {"name": "unsupported-deck", "params": [{"cardDeck": "NoSuchDeck", "__camp": 3}], "targets": [{"id": 1001}]},
    {"name": "empty-targets", "params": [{"cardDeck": "HandDeck", "__camp": 3}], "targets": []},
    {"name": "default-copy-args", "params": [{"cardDeck": "HandDeck", "__camp": 3}, None, 2.2], "targets": [
        {"id": 1001, "level": 7, "specialOwner": 88, "performSkillId": 123,
         "cardTypes": "copied-types", "createCardArgs": [11, 22]}]},
    {"name": "explicit-args-hidden", "params": [{"cardDeck": "HandDeck", "__camp": 6}, None, 1, None, 0, 31, 32, 33],
     "castRoleUid": 44, "targets": [{"id": 1002, "level": 5}]},
    {"name": "explicit-args-shown", "params": [{"cardDeck": "HandDeck", "__camp": 3}, None, 1, None, 1, 41],
     "targets": [{"id": 1003}]},
    {"name": "multiple-target-cards", "params": [{"cardDeck": "DrawDeck", "__camp": 4}, None, 1, 9],
     "targets": [{"id": 1004, "level": 2}, {"id": 1005, "level": 3}]},
    {"name": "top-hand-placement", "params": [{"cardDeck": "HandDeck", "__camp": 3}, "TOP", 1],
     "targets": [{"id": 1006, "level": 4}]},
]


def main():
    oracle = CreateCardOracle()
    fixtures = [{"input": case, "expected": oracle.evaluate(case)} for case in CASES]
    output = ROOT / "tests/synthetic/original-create-card.json"
    output.write_text(json.dumps({
        "kind": "SYNTHETIC_ORIGINAL_RUNTIME",
        "build": "pc-res144-build51",
        "sourceHashes": {"BECreateCard": oracle.assets["BECreateCard.lua"]["sha256"]},
        "scope": "Original BECreateCard.DoEffect through AddNewCard with explicit target-card, command and manager adapters. Card-manager mutation is observed but replaced; no draw/hand limits, card execution, gameplay or holdout credit.",
        "fixtures": fixtures,
    }, indent=2) + "\n", encoding="utf-8", newline="\n")
    print("Generated", len(fixtures), "original create-card cases")


if __name__ == "__main__":
    main()
