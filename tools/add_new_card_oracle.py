"""Execute original BattleCardMgrServer.AddNewCard with manager adapters.

The protected PC method is retained. Card construction, record/event sinks and
randomness are observable substitutes so the deck-mutation boundary can be
tested without starting a battle.
"""
import ctypes as C
import json

from runtime_oracle import Oracle, ROOT


class AddNewCardOracle(Oracle):
    def __init__(self, asset_overrides=None):
        super().__init__()
        asset_overrides = asset_overrides or {}
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
        if "BattleConst" in asset_overrides:
            self.module("BattleConst", asset_overrides["BattleConst"]); self.setglobal(L, b"_oracle_bc")

        self.table(L, 0, 3)
        for name in ("ctor", "Dispose"):
            self.method(name, lambda s: 0)
        self.setglobal(L, b"_add_card_super")

        def new_class(state):
            self.table(state, 0, 100)
            self.getglobal(state, b"_add_card_super")
            return 2

        self.getglobal(L, b"_oracle_config_system")
        self.method("NewClass", new_class)
        self.top(L, 0)

        self.module("BattleLogicEvent", asset_overrides.get("BattleLogicEvent"))
        self.setglobal(L, b"_add_card_logic_event")
        self.getglobal(L, b"table")
        self.method("tostring", lambda s: (self.pushstring(s, b"<synthetic-list>"), 1)[1])
        self.top(L, 0)

        def card_factory(state):
            try:
                info = self.absindex(state, 2)
                uid = self.next_uid; self.next_uid += 1
                deck = self.field(state, info, "deck")
                card = {key: self.field(state, info, key) for key in ("tid", "level", "cardArgs", "runes", "show", "enternal", "camp", "owner", "performSkillId", "cardTypes")}
                card.update(uid=uid, deck=deck)
                self.created.append(card)
                self.table(state, 0, 16)
                for key, value in (("uid", uid), ("tid", card["tid"]), ("level", card["level"]), ("deck", deck)):
                    self.push_value(state, value); self.setfield(state, -2, key.encode())
                def serialize(s, card=card):
                    self.table(s, 0, 4)
                    for key in ("uid", "tid", "level", "deck"):
                        self.push_value(s, card[key]); self.setfield(s, -2, key.encode())
                    return 1
                self.method("Serialize", serialize, state)
                self.method("SetupHandKeeperData", lambda s, uid=uid: (self.trace.append({"setupHandKeeper": uid, "param": self.scalar(s, 2), "caster": self.scalar(s, 3)}), 0)[1], state)
                return 1
            except Exception as error:
                self.errors.append(str(error)); self.nil(state); return 1

        self.callback(card_factory)
        self.setglobal(L, b"_add_card_factory")
        known = {
            b"System.System": b"_oracle_config_system",
            b"Battle.BattleConst": b"_oracle_bc",
            b"Battle.DbgEngine.Card.BattleCardServer": b"_add_card_factory",
            b"Battle.DbgEngine.Event.BattleLogicEvent": b"_add_card_logic_event",
            b"Battle.Util.BattleUtilServer": b"_oracle_util",
        }
        empty = {b"Battle.DbgEngine.Cmd.Expression.BattleCmdCardListExp", b"Battle.Ecs.BattleEngineComponent"}
        def require(state):
            name = self.string(state, 1, None)
            if name in known: self.getglobal(state, known[name])
            elif name in empty: self.table(state, 0, 0)
            else: self.errors.append("Unexpected dependency: " + repr(name)); self.nil(state)
            return 1
        self.callback(require); self.setglobal(L, b"require")
        self.module("BattleCardMgrServer", asset_overrides.get("BattleCardMgrServer")); self.setglobal(L, b"_add_card_class")
        if self.errors: raise RuntimeError(self.errors)

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

    def push_value(self, state, value):
        if value is None: self.nil(state)
        elif isinstance(value, bool): self.boolean(state, value)
        elif isinstance(value, (int, float)): self.number(state, value)
        elif isinstance(value, list):
            self.table(state, len(value), 0)
            for position, item in enumerate(value, 1): self.push_value(state, item); self.rawseti(state, -2, position)
        else: self.pushstring(state, str(value).encode())

    def array(self, state, index, field=None):
        index = self.absindex(state, index); result = []
        for position in range(1, int(self.rawlen(state, index)) + 1):
            self.rawgeti(state, index, position)
            result.append(self.field(state, -1, field) if field else self.scalar(state, -1))
            self.top(state, -2)
        return result

    def run(self, values):
        L = self.state; self.top(L, 0); self.errors.clear(); self.trace=[]; self.created=[]; self.next_uid=values.get("uidStart", 9001)
        deck = values["deck"]

        self.table(L, 0, 16)
        self.table(L, 0, 3)
        self.table(L, 0, 1); self.method("GetIsExtraBout", lambda s: (self.boolean(s, values.get("extraBout", False)), 1)[1]); self.setfield(L, -2, b"boutMgr")
        self.table(L, 0, 1); self.method("random", lambda s: (self.number(s, values.get("randomPosition", 1)), 1)[1]); self.setfield(L, -2, b"rand")
        self.table(L, 0, 2)
        def on_add(state):
            self.trace.append({"onAddNewCard": {"uids": self.array(state, 2, "uid"), "deck": self.scalar(state, 3), "show": self.scalar(state, 4), "camp": self.scalar(state, 5)}}); return 0
        def on_change(state):
            self.trace.append({"onChangeCardListDeck": {"uids": self.array(state, 2), "oldDeck": self.scalar(state, 3), "newDeck": self.scalar(state, 4), "reason": self.scalar(state, 6), "camp": self.scalar(state, 7), "show": self.scalar(state, 8)}}); return 0
        self.method("OnAddNewCard", on_add); self.method("OnChangeCardListDeck", on_change); self.setfield(L, -2, b"recordMgr")
        self.method("LogBattleWithTab", lambda s: 0); self.method("Debug", lambda s: 0)
        def create_event(state):
            data=self.absindex(state,3);self.trace.append({"cardDeckChange":{"event":self.scalar(state,2),"cardUid":self.field(state,data,"cardUid"),"oldDeck":self.field(state,data,"oldDeck"),"newDeck":self.field(state,data,"newDeck"),"castRoleUid":self.field(state,data,"castRoleUid"),"enternal":self.field(state,data,"enternal")}});return 0
        self.method("CreateEventEffect", create_event); self.setglobal(L, b"_add_card_engine")

        self.table(L, 0, 12)
        self.getglobal(L, b"_add_card_engine"); self.setfield(L, -2, b"battleEngine")
        self.method("GetMaxHandDeckNum", lambda s: (self.number(s, values.get("maxHand", 99)), 1)[1])
        self.method("GetMaxDeckNum", lambda s: (self.number(s, values.get("maxDeck", 99)), 1)[1])
        self.table(L, 0, 3)
        self.table(L, 0, 20)
        for name in ("NoneDeck","DrawDeck","HandDeck","HideDeck","GraveyardDeck","ConsumedDeck","UsingDeck","AwakeDeck","SwallowDeck","DimensionDeck","MonsterDimensionDeck"):
            self.table(L, 0, 0)
            if name == deck:
                for position in range(1, values.get("existing", 0)+1): self.number(L, 100+position); self.rawseti(L, -2, position)
            self.setfield(L, -2, name.encode())
        self.setfield(L, -2, b"cardData")
        self.table(L, 0, 0); self.setfield(L, -2, b"allCardMap")
        self.table(L, 0, 0); self.setfield(L, -2, b"enternalCards")
        self.setfield(L, -2, b"data")
        self.getglobal(L,b"_add_card_class");self.getfield(L,-1,b"AddNewCard");self.setfield(L,-3,b"AddNewCard");self.top(L,-2)
        self.setglobal(L, b"_add_card_subject")

        self.getglobal(L,b"_add_card_subject");self.getfield(L,-1,b"AddNewCard");self.getglobal(L,b"_add_card_subject")
        self.table(L,len(values["cardInfos"]),0)
        for position, info in enumerate(values["cardInfos"],1):
            if isinstance(info,(int,float)): self.number(L,info)
            else:
                self.table(L,0,2);self.number(L,info["tid"]);self.setfield(L,-2,b"tid");self.number(L,info.get("level",1));self.setfield(L,-2,b"level")
            self.rawseti(L,-2,position)
        self.pushstring(L,deck.encode())
        config=values.get("config",{});self.table(L,0,len(config))
        for key,item in config.items():self.push_value(L,item);self.setfield(L,-2,key.encode())
        self.check(self.call(L,4,1,0,0,None))
        returned=self.array(L,-1,"uid");self.top(L,0)
        self.getglobal(L,b"_add_card_subject");self.getfield(L,-1,b"data");self.getfield(L,-1,b"cardData")
        decks={}
        for name in ("NoneDeck","DrawDeck","HandDeck","DimensionDeck"):
            self.getfield(L,-1,name.encode());decks[name]=self.array(L,-1);self.top(L,-2)
        self.top(L,0);self.getglobal(L,b"_add_card_subject");self.getfield(L,-1,b"data");self.getfield(L,-1,b"enternalCards");enternal=self.array(L,-1)
        if self.errors:raise RuntimeError(self.errors)
        return {"returnedUids":returned,"created":self.created,"decks":decks,"enternalCardUids":enternal,"trace":self.trace}


CASES=[
 {"name":"draw-default-bottom","deck":"DrawDeck","existing":1,"cardInfos":[{"tid":1001,"level":7}],"config":{"camp":3,"owner":88,"castRoleUid":77,"show":True}},
 {"name":"numeric-card-info","deck":"DrawDeck","existing":0,"cardInfos":[1002],"config":{"camp":3,"show":False}},
 {"name":"hand-at-cap","deck":"HandDeck","existing":1,"maxHand":1,"cardInfos":[{"tid":1003,"level":2}],"config":{"camp":3,"show":True}},
 {"name":"dimension-extra-bout","deck":"DimensionDeck","extraBout":True,"cardInfos":[{"tid":1004,"level":2}],"config":{"camp":3,"show":True}},
 {"name":"top-two-eternal","deck":"DrawDeck","existing":1,"cardInfos":[{"tid":1005,"level":3},{"tid":1006,"level":4}],"config":{"camp":4,"castRoleUid":66,"show":True,"enternal":1,"targetPos":"TOP"}},
]


def main():
    oracle=AddNewCardOracle();fixtures=[{"input":case,"expected":oracle.run(case)} for case in CASES]
    output=ROOT/"tests/synthetic/original-add-new-card.json"
    output.write_text(json.dumps({"kind":"SYNTHETIC_ORIGINAL_RUNTIME","build":"pc-res144-build51","sourceHashes":{"BattleCardMgrServer":oracle.assets["BattleCardMgrServer.lua"]["sha256"]},"scope":"Original BattleCardMgrServer.AddNewCard with explicit card-factory, deck, capacity, record, event and RNG adapters. Card construction internals, listeners, gameplay and holdout validation are excluded.","fixtures":fixtures},indent=2)+"\n",encoding="utf-8",newline="\n")
    print("Generated",len(fixtures),"original AddNewCard cases")


if __name__=="__main__":main()
