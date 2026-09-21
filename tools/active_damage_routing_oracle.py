"""Original BEActiveDamage repetition routing with observed child-effect creation."""
import ctypes as C
import itertools
import json

from active_damage_binding_oracle import ActiveBindingOracle, ROOT


class ActiveRoutingOracle(ActiveBindingOracle):
    def __init__(self, asset_overrides=None):
        super().__init__(asset_overrides)
        self.rawgeti = self.lib.lua_rawgeti
        self.rawgeti.argtypes = [C.c_void_p, C.c_int, C.c_longlong]
        self.rawgeti.restype = C.c_int

    def _target_list(self, state, targets):
        self.table(state, len(targets), 0)
        for index, row in enumerate(targets, 1):
            self.table(state, 0, 2)
            self.number(state, row["uid"]);self.setfield(state, -2, b"uid")
            dead = row["dead"]
            self.method("IsDead", lambda s, dead=dead: (self.boolean(s, dead), 1)[1])
            self.rawseti(state, -2, index)

    def run_route(self, values):
        L = self.state;self.top(L, 0);self.errors.clear();events=[]
        self.table(L, 0, 12)
        self.number(L, values["total"]);self.setfield(L, -2, b"totalEffectTimes")
        self.number(L, values["left"]);self.setfield(L, -2, b"leftEffectTimes")
        self.number(L, 88);self.setfield(L, -2, b"uid")
        self._target_list(L, values["targets"]);self.setfield(L, -2, b"targets")
        self.table(L, 0, 2);self.boolean(L, values["skipPhase"]);self.setfield(L, -2, b"skipPhase")
        self.table(L, 0, 1);self.number(L, 99);self.setfield(L, -2, b"Target");self.setfield(L, -2, b"cmdCfg")
        self.setfield(L, -2, b"effectConfig")
        self.table(L, 0, 2);self.number(L, 9);self.setfield(L, -2, b"castRoleUid")
        def regenerate(s):
            events.append("GenerateTargetsExp")
            self.table(s, 0, 1)
            def get_targets(state):self._target_list(state, values["regeneratedTargets"]);return 1
            self.method("GetTargetList", get_targets);return 1
        self.method("GenerateTargetsExp", regenerate);self.setfield(L, -2, b"cmdServer")
        self.method("IsSingleTarget", lambda s:(self.boolean(s, values["singleTarget"]),1)[1])
        self.setglobal(L, b"_routing_subject")

        self.table(L, 0, 6)
        def get_obj(s):
            if not values["ownerPresent"]:self.nil(s);return 1
            self.table(s, 0, 2)
            self.method("IsRoleType", lambda state:(self.boolean(state, values["ownerMonster"]),1)[1])
            self.method("IsDead", lambda state:(self.boolean(state, values["ownerDead"]),1)[1]);return 1
        self.method("GetObj", get_obj)
        self.table(L, 0, 2)
        self.method("GetConstant", lambda s:(self.number(s, values["delay"]),1)[1])
        self.setfield(L, -2, b"battleDT")
        def pass_time(s):events.append({"delay": self.tonumber(s, 2, None)});return 0
        self.method("AddPassTime", pass_time)
        self.table(L, 0, 1)
        def create_effect(s):
            try:
                self.getfield(s, 2, b"funcArgs");self.rawgeti(s, -1, 1);self.getfield(s, -1, b"uid")
                uid=self.tonumber(s, -1, None);self.top(s, -4)
                events.append({"createFor": uid})
            except Exception as error:self.errors.append(str(error))
            self.table(s, 0, 0);return 1
        self.method("CreateEffect", create_effect);self.setfield(L, -2, b"effectMgr")
        self.setglobal(L, b"_routing_engine")
        self.getglobal(L, b"_routing_subject");self.getglobal(L, b"_routing_engine");self.setfield(L, -2, b"battleEngine");self.top(L, 0)

        self.getglobal(L, b"_binding_active");self.getfield(L, -1, b"__DoMultiEffect")
        self.getglobal(L, b"_routing_subject")
        self.check(self.call(L, 1, 1, 0, 0, None))
        returned = bool(self.lib.lua_toboolean(L, -1));self.top(L, 0)
        self.getglobal(L, b"_routing_subject");self.getfield(L, -1, b"leftEffectTimes")
        left = self.tonumber(L, -1, None)
        if self.errors:raise RuntimeError(self.errors)
        return {"returned": returned, "leftAfter": left, "events": events}


def cases():
    base={"ownerPresent":True,"ownerMonster":False,"ownerDead":False,"skipPhase":False,
          "total":3,"left":3,"delay":0.25,"singleTarget":False,
          "targets":[{"uid":1,"dead":False},{"uid":2,"dead":False}],
          "regeneratedTargets":[{"uid":3,"dead":False}]}
    rows=[]
    for present,monster,dead in itertools.product((False,True),repeat=3):
        rows.append({**base,"ownerPresent":present,"ownerMonster":monster,"ownerDead":dead})
    for skip,left in itertools.product((False,True),(3,2)):
        rows.append({**base,"skipPhase":skip,"left":left})
    rows.extend([
        {**base,"singleTarget":True,"targets":[{"uid":1,"dead":True}]},
        {**base,"singleTarget":True,"targets":[{"uid":1,"dead":False}]},
        {**base,"singleTarget":False,"targets":[{"uid":1,"dead":True}]},
        {**base,"targets":[]},
    ])
    return rows


def main():
    oracle=ActiveRoutingOracle()
    fixtures=[{"input":row,"expected":oracle.run_route(row)} for row in cases()]
    output=ROOT/"tests/synthetic/original-active-damage-routing.json"
    output.write_text(json.dumps({"kind":"SYNTHETIC_ORIGINAL_RUNTIME","build":"pc-res144-build51",
        "sourceHashes":{"BEActiveDamage":oracle.assets["BEActiveDamage.lua"]["sha256"]},
        "scope":"Original __DoMultiEffect owner stop, delay, dead single-target retarget and child-effect creation. Explicit targets and adapters; no child execution, formula, HP, scheduler traversal or gameplay.",
        "fixtures":fixtures},indent=2)+"\n",encoding="utf-8",newline="\n")
    print("Generated",len(fixtures),"original Active routing cases")


if __name__=="__main__":main()
