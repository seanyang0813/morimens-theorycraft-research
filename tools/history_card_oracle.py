"""Execute the original copied-history selector with synthetic card histories.

The protected BattleCardMgrServer.GetBoutHistoryCard method is retained. Card
reconstruction and state lookup are narrow observers so the history traversal,
type filters, duplicate rule and excluded-state branch can be tested directly.
"""
import ctypes as C
import json

from runtime_oracle import Oracle, ROOT


class HistoryCardOracle(Oracle):
    def __init__(self):
        super().__init__()
        L = self.state
        self.callbacks, self.errors = [], []
        self.kind = self.lib.lua_type; self.kind.argtypes = [C.c_void_p, C.c_int]; self.kind.restype = C.c_int
        self.tobool = self.lib.lua_toboolean; self.tobool.argtypes = [C.c_void_p, C.c_int]; self.tobool.restype = C.c_int
        self.boolean = self.lib.lua_pushboolean; self.boolean.argtypes = [C.c_void_p, C.c_int]
        self.nil = self.lib.lua_pushnil; self.nil.argtypes = [C.c_void_p]
        self.pushstring = self.lib.lua_pushstring; self.pushstring.argtypes = [C.c_void_p, C.c_char_p]
        self.rawseti = self.lib.lua_rawseti; self.rawseti.argtypes = [C.c_void_p, C.c_int, C.c_longlong]
        self.rawgeti = self.lib.lua_rawgeti; self.rawgeti.argtypes = [C.c_void_p, C.c_int, C.c_longlong]; self.rawgeti.restype = C.c_int
        self.rawlen = self.lib.lua_rawlen; self.rawlen.argtypes = [C.c_void_p, C.c_int]; self.rawlen.restype = C.c_size_t
        self.absindex = self.lib.lua_absindex; self.absindex.argtypes = [C.c_void_p, C.c_int]; self.absindex.restype = C.c_int

        self.table(L, 0, 3)
        for name in ("ctor", "Dispose"):
            self.method(name, lambda state: 0)
        self.method("ctorData", lambda state: (self.table(state, 0, 0), 1)[1])
        self.setglobal(L, b"_history_super")

        def new_class(state):
            self.table(state, 0, 100)
            self.getglobal(state, b"_history_super")
            return 2

        self.getglobal(L, b"_oracle_config_system")
        self.method("NewClass", new_class)
        self.top(L, 0)

        known = {
            b"System.System": b"_oracle_config_system",
            b"Battle.BattleConst": b"_oracle_bc",
            b"Battle.Util.BattleUtilServer": b"_oracle_util",
        }
        empty = {
            b"Battle.DbgEngine.Card.BattleCardServer",
            b"Battle.DbgEngine.Event.BattleLogicEvent",
            b"Battle.DbgEngine.Cmd.Expression.BattleCmdCardListExp",
            b"Battle.Ecs.BattleEngineComponent",
        }

        def require(state):
            name = self.string(state, 1, None)
            if name in known:
                self.getglobal(state, known[name])
            elif name in empty:
                self.table(state, 0, 0)
            else:
                self.errors.append("Unexpected dependency: " + repr(name)); self.nil(state)
            return 1

        self.callback(require); self.setglobal(L, b"require")
        self.module("BattleCardMgrServer"); self.setglobal(L, b"_history_class")
        if self.errors:
            raise RuntimeError(self.errors)

    def callback(self, function):
        wrapped = C.CFUNCTYPE(C.c_int, C.c_void_p)(function)
        self.callbacks.append(wrapped); self.pushclosure(self.state, wrapped, 0)

    def method(self, name, function, state=None):
        self.callback(function); self.setfield(state or self.state, -2, name.encode())

    def scalar(self, state, index):
        kind = self.kind(state, index)
        if kind == 0: return None
        if kind == 1: return bool(self.tobool(state, index))
        if kind == 3: return self.tonumber(state, index, None)
        if kind == 4: return self.string(state, index, None).decode()
        return "<table>"

    def field(self, state, index, name):
        index = self.absindex(state, index); self.getfield(state, index, name.encode())
        value = self.scalar(state, -1); self.top(state, -2); return value

    def list_scalars(self, state, index):
        if self.kind(state, index) != 5: return []
        index = self.absindex(state, index); result = []
        for position in range(1, int(self.rawlen(state, index)) + 1):
            self.rawgeti(state, index, position); result.append(self.scalar(state, -1)); self.top(state, -2)
        return result

    def push_value(self, state, value):
        if value is None: self.nil(state)
        elif isinstance(value, bool): self.boolean(state, value)
        elif isinstance(value, (int, float)): self.number(state, value)
        elif isinstance(value, str): self.pushstring(state, value.encode())
        elif isinstance(value, list):
            self.table(state, len(value), 0)
            for position, item in enumerate(value, 1): self.push_value(state, item); self.rawseti(state, -2, position)
        else: raise TypeError(value)

    def push_card(self, state, card):
        self.table(state, 0, 8)
        for name in ("uid", "tid"):
            self.number(state, card[name]); self.setfield(state, -2, name.encode())
        card_types = set(card["types"])

        def match(target_state, card_types=card_types):
            requested = self.list_scalars(target_state, 2)
            if not requested:
                scalar = self.scalar(target_state, 2)
                requested = [] if scalar in (None, 0, False) else [scalar]
            self.boolean(target_state, any(item in card_types for item in requested)); return 1

        self.method("CardTypeMatch", match, state)

    def run(self, values):
        L = self.state; self.top(L, 0); self.errors.clear(); self.state_checks = []
        states_by_uid = {card["uid"]: set(card.get("states", [])) for bout in values["history"] for card in bout}

        self.table(L, 0, 4)
        self.table(L, 0, 4)
        self.table(L, 0, 1)

        def has_state(state):
            uid = int(self.tonumber(state, 2, None)); excluded = [int(item) for item in self.list_scalars(state, 3)]
            matched = any(item in states_by_uid.get(uid, set()) for item in excluded)
            self.state_checks.append({"uid": uid, "excluded": excluded, "matched": matched})
            self.boolean(state, matched); return 1

        self.method("HasStateByStateIds", has_state); self.setfield(L, -2, b"stateMgr")
        self.method("Error", lambda state: 0); self.setfield(L, -2, b"battleEngine")
        self.table(L, 0, 2)
        self.table(L, len(values["history"]), 0)
        for bout_index, bout in enumerate(values["history"], 1):
            self.table(L, len(bout), 0)
            for card_index, card in enumerate(bout, 1): self.push_card(L, card); self.rawseti(L, -2, card_index)
            self.rawseti(L, -2, bout_index)
        self.setfield(L, -2, b"copy_history")
        self.setfield(L, -2, b"data")
        self.getglobal(L, b"_history_class")
        for name in ("CheckHistoryCardParam", "GetBoutHistoryCard"):
            self.getfield(L, -1, name.encode()); self.setfield(L, -3, name.encode())
        self.top(L, -2)
        self.method("GetHistoryCard", lambda state: (self.pushvalue(state, 2), 1)[1])
        self.setglobal(L, b"_history_subject")

        self.getglobal(L, b"_history_subject"); self.getfield(L, -1, b"GetBoutHistoryCard"); self.getglobal(L, b"_history_subject")
        self.number(L, 2)
        self.push_value(L, values["cardTypes"]); self.number(L, values["endNum"]); self.number(L, values["beginNum"]); self.number(L, values["needNum"]); self.number(L, values["skipSameID"])
        self.push_value(L, values.get("exceptCardTypes", 0)); self.push_value(L, values.get("exceptStateTids", 0))
        self.check(self.call(L, 9, 1, 0, 0, None))
        selected = []
        for position in range(1, int(self.rawlen(L, -1)) + 1):
            self.rawgeti(L, -1, position); selected.append(int(self.field(L, -1, "uid"))); self.top(L, -2)
        if self.errors: raise RuntimeError(self.errors)
        return {"selectedUids": selected, "stateChecks": self.state_checks}


BASE = {"cardTypes": ["Card_Strike"], "endNum": 0, "beginNum": 99, "needNum": 1, "skipSameID": 0, "exceptCardTypes": 0, "exceptStateTids": [123811, 124733]}
CASES = [
    {"name": "newest-unmarked-strike", **BASE, "history": [[{"uid": 1, "tid": 101, "types": ["Card_Strike"], "states": []}], [{"uid": 2, "tid": 102, "types": ["Card_Strike"], "states": []}]]},
    {"name": "skip-newest-human-explosion", **BASE, "history": [[{"uid": 1, "tid": 101, "types": ["Card_Strike"], "states": []}], [{"uid": 2, "tid": 102, "types": ["Card_Strike"], "states": [123811]}]]},
    {"name": "skip-newest-pursuit", **BASE, "history": [[{"uid": 1, "tid": 101, "types": ["Card_Strike"], "states": []}], [{"uid": 2, "tid": 102, "types": ["Card_Strike"], "states": [124733]}]]},
    {"name": "skip-nonstrike", **BASE, "history": [[{"uid": 1, "tid": 101, "types": ["Card_Strike"], "states": []}], [{"uid": 2, "tid": 102, "types": ["Card_Skill"], "states": []}]]},
    {"name": "all-excluded-empty", **BASE, "history": [[{"uid": 1, "tid": 101, "types": ["Card_Strike"], "states": [123811]}], [{"uid": 2, "tid": 102, "types": ["Card_Strike"], "states": [124733]}]]},
    {"name": "skip-excluded-type", **BASE, "exceptCardTypes": ["Card_Skill"], "history": [[{"uid": 1, "tid": 101, "types": ["Card_Strike"], "states": []}], [{"uid": 2, "tid": 102, "types": ["Card_Strike", "Card_Skill"], "states": []}]]},
    {"name": "skip-duplicate-id", **BASE, "needNum": 2, "skipSameID": 1, "history": [[{"uid": 1, "tid": 100, "types": ["Card_Strike"], "states": []}, {"uid": 2, "tid": 101, "types": ["Card_Strike"], "states": []}, {"uid": 3, "tid": 101, "types": ["Card_Strike"], "states": []}]]},
]


def main():
    oracle = HistoryCardOracle(); fixtures = [{"input": case, "expected": oracle.run(case)} for case in CASES]
    output = ROOT / "tests/synthetic/original-history-card-selection.json"
    output.write_text(json.dumps({"kind": "SYNTHETIC_ORIGINAL_RUNTIME", "build": "pc-res144-build51", "sourceHashes": {"BattleCardMgrServer": oracle.assets["BattleCardMgrServer.lua"]["sha256"]}, "scope": "Original GetBoutHistoryCard traversal, type matching and excluded-state filtering with synthetic reconstructed-card/state observers; no gameplay or holdout validation.", "fixtures": fixtures}, indent=2) + "\n", encoding="utf-8", newline="\n")
    print("Generated", len(fixtures), "original history-card cases")


if __name__ == "__main__": main()
