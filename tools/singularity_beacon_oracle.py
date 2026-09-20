"""Original eligibility expression with explicit card/state getter adapters."""
import ctypes as C
import json
from singularity_layer_oracle import SingularityLayerOracle, ROOT

class BeaconOracle(SingularityLayerOracle):
    def __init__(self):
        super().__init__()
        self.states=json.loads((ROOT/'research/extracted/config/State.json').read_text(encoding='utf-8'))
        self.expression=self.states['126900']['Judgement4']
        self.pushstring=self.lib.lua_pushstring
        self.pushstring.argtypes=[C.c_void_p,C.c_char_p]
        self.tobool=self.lib.lua_toboolean
        self.tobool.argtypes=[C.c_void_p,C.c_int]
        self.callbacks=[]

    def method(self,name,fn):
        callback=C.CFUNCTYPE(C.c_int,C.c_void_p)(fn)
        self.callbacks.append(callback)
        self.pushclosure(self.state,callback,0)
        self.setfield(self.state,-2,name.encode())

    def eligible(self,case):
        L=self.state
        self.top(L,0)
        self.getglobal(L,b'_realm_expressions')
        self.getfield(L,-1,self.expression.encode())
        self.table(L,0,6)
        for name in ['Card_Strike','Card_Defend','Card_Skill','Card_Extend']:
            self.pushstring(L,name.encode());self.setfield(L,-2,name.encode())
        self.table(L,0,2)
        def match(s):
            self.number(s,int(self.string(s,1,None).decode() in case['cardTypes']));return 1
        def card_state(s):
            key=int(self.tonumber(s,1,None))
            if key!=126895:raise ValueError(key)
            self.number(s,case['existingBeaconLayers']);return 1
        self.method('CardTypeMatch',match)
        self.method('GetStateLayer',card_state)
        self.setfield(L,-2,b'CurCard')
        self.table(L,0,1)
        def player_state(s):
            key=int(self.tonumber(s,1,None))
            self.number(s,{3867:case['shuttleUses'],133395:case['extraShuttles']}[key]);return 1
        self.method('GetStateLayer',player_state)
        self.setfield(L,-2,b'PlayerRole')
        self.check(self.call(L,1,1,0,0,None))
        return bool(self.tobool(L,-1))

if __name__=='__main__':
    o=BeaconOracle()
    skills=json.loads((ROOT/'research/extracted/config/Skill.json').read_text(encoding='utf-8'))
    fixtures=[]
    for sid in [122485,122486,126484,122483]:
        for beacon,uses,extra in [(0,0,0),(0,1,0),(0,1,1),(26,0,0),(26,1,1),(0,0,1)]:
            case=dict(cardTypes=list(skills[str(sid)]['Type'].values()),existingBeaconLayers=beacon,shuttleUses=uses,extraShuttles=extra,finalRealmMastery=72)
            eligible=o.eligible(case)
            fixtures.append(dict(skillId=sid,input=case,expected=dict(eligible=eligible,temporaryBeaconLayers=o.evaluate(72)['beacon'] if eligible else 0,admissionMarker=eligible)))
    out=dict(scope='Original State126900 Judgement4 expression with explicit getters and actual Skill.Type tags; layer amount from original Cmd134388 expression. Assumes before-use event already dispatched. No attached-action event routing or after-use commands.',sourceHash=o.assets['FuncTable.lua']['sha256'],expression=o.expression,fixtures=fixtures)
    (ROOT/'tests/synthetic/original-singularity-beacon.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original-runtime Beacon eligibility cases')
