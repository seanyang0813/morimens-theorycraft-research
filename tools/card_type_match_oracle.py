"""Exercise original BattleCardServer.CardTypeMatch with explicit card types.

This isolates the list-intersection method.  Card construction, property-driven type
changes and gameplay are outside the fixture scope.
"""
import ctypes as C
import itertools
import json

from target_runtime_oracle import TargetOracle, ROOT


class CardTypeMatchOracle(TargetOracle):
    def __init__(self, asset_overrides=None):
        super().__init__(asset_overrides)
        L = self.state
        self.rawseti = self.lib.lua_rawseti
        self.rawseti.argtypes = [C.c_void_p, C.c_int, C.c_int]
        self.rawseti.restype = None
        self.pushstring = self.lib.lua_pushstring
        self.pushstring.argtypes = [C.c_void_p, C.c_char_p]
        self.pushstring.restype = None
        self.tobool = self.lib.lua_toboolean
        self.tobool.argtypes = [C.c_void_p, C.c_int]
        self.tobool.restype = C.c_int
        self.rawlen = self.lib.lua_rawlen
        self.rawlen.argtypes = [C.c_void_p, C.c_int]
        self.rawlen.restype = C.c_size_t
        self.rawgeti = self.lib.lua_rawgeti
        self.rawgeti.argtypes = [C.c_void_p, C.c_int, C.c_int]
        self.rawgeti.restype = C.c_int

        def contains(state):
            wanted = self.string(state, 2, None)
            found = False
            for index in range(1, self.rawlen(state, 1) + 1):
                self.rawgeti(state, 1, index)
                found = found or self.string(state, -1, None) == wanted
                self.top(state, -2)
            self.boolean(state, found)
            return 1

        self.getglobal(L, b"table")
        self.method("contains", contains)
        self.top(L, 0)

        known = {
            b"System.System": b"_oracle_config_system",
            b"Battle.BattleConst": b"_oracle_bc",
            b"Battle.Util.BattleUtilServer": b"_oracle_util",
        }

        def require(state):
            name = self.string(state, 1, None)
            if name in known:
                self.getglobal(state, known[name])
            else:
                # CardTypeMatch does not inspect the other imported modules.
                self.table(state, 0, 0)
            return 1

        self.callback(require)
        self.setglobal(L, b"require")
        self.module("BattleCardServer", (asset_overrides or {}).get("BattleCardServer"))
        self.setglobal(L, b"_card_type_class")
        if self.errors:
            raise RuntimeError(self.errors)

    def push_list(self, state, values):
        self.table(state, len(values), 0)
        for index, value in enumerate(values, 1):
            self.pushstring(state, value.encode())
            self.rawseti(state, -2, index)

    def run(self, card_types, query):
        L = self.state
        self.top(L, 0)
        self.table(L, 0, 1)

        def get_type(state):
            self.push_list(state, card_types)
            return 1

        self.method("GetType", get_type)
        self.setglobal(L, b"_card_type_self")
        self.getglobal(L, b"_card_type_class")
        self.getfield(L, -1, b"CardTypeMatch")
        self.getglobal(L, b"_card_type_self")
        if isinstance(query, list):
            self.push_list(L, query)
        else:
            self.pushstring(L, query.encode())
        self.check(self.call(L, 2, 1, 0, 0, None))
        return bool(self.tobool(L, -1))


if __name__ == "__main__":
    oracle = CardTypeMatchOracle()
    card_sets = [
        [],
        ["Card_Strike"],
        ["Card_Skill", "Card_AttachPost"],
        ["Card_Extend", "Card_Extend"],
        ["Ulti_Skill"],
    ]
    queries = [
        "Card_Strike",
        "Card_Extend",
        ["Card_Skill", "Card_Defend", "Card_Extend", "Card_Strike"],
        [],
        ["Unknown", "Card_AttachPost"],
    ]
    fixtures = []
    for card_types, query in itertools.product(card_sets, queries):
        fixtures.append({
            "input": {"cardTypes": card_types, "query": query},
            "expected": oracle.run(card_types, query),
        })
    output = {
        "kind": "SYNTHETIC_ORIGINAL_RUNTIME",
        "build": "pc-res144-build51",
        "sourceHash": oracle.assets["BattleCardServer.lua"]["sha256"],
        "currentBuildHashStatus": "BYTE_IDENTICAL_PC_RES150_BUILD51",
        "scope": "Original BattleCardServer.CardTypeMatch over explicit stored card-type lists and scalar/list queries. No GetType derivation, card construction, properties, effects or gameplay.",
        "fixtures": fixtures,
    }
    path = ROOT / "tests/synthetic/original-card-type-match.json"
    path.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print("Generated", len(fixtures), "original CardTypeMatch cases")
