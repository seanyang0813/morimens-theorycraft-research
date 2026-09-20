"""Original numeric combat-property mutation with callback observers."""
import ctypes as C
import itertools
import json
from hp_property_oracle import HpPropertyOracle, ROOT

PROPERTIES=['basic_damage_per','be_damage_per','be_damage_per2','be_damage_per3','vulnerable_per','weak_per','frail_per','crit','crit_per_from_ulti','crit_per_from_strikecard','card_crit','crit_damage','card_crit_damage','crit_damage_from_strikecard','crit_damage_from_ulti']

class CombatPropertyOracle(HpPropertyOracle):
    def __init__(self):
        super().__init__()
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_void_p
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int

    def change(self,v):
        L=self.state;self.top(L,0);self.events=[]
        self.getglobal(L,b'_hp_property');self.table(L,0,3)
        for name,value in [(v['property'],v['before']),('i_crit_per',v['critScale']),('i_crit_damage_per',v['critDamageScale'])]:
            self.number(L,value);self.setfield(L,-2,name.encode())
        self.setfield(L,-2,b'properties');self.top(L,0)
        self.table(L,0,1)
        if v['castValue'] is not None:self.number(L,v['castValue']);self.setfield(L,-2,b'castValue')
        self.setglobal(L,b'_combat_extra')
        self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'ChangeProperty');self.getglobal(L,b'_hp_property')
        self.pushstring(L,v['property'].encode());self.number(L,v['delta']);self.getglobal(L,b'_combat_extra');self.check(self.call(L,4,1,0,0,None))
        result=None if self.kind(L,-1)==0 else self.tonumber(L,-1,None)
        self.top(L,0);self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,v['property'].encode());after=self.tonumber(L,-1,None)
        self.top(L,0);self.getglobal(L,b'_combat_extra');self.getfield(L,-1,b'castValue');cast=self.tonumber(L,-1,None)
        if self.errors:raise RuntimeError(self.errors)
        return {'after':after,'returned':result,'castValue':cast,'callbacks':self.events}

if __name__=='__main__':
    o=CombatPropertyOracle();fixtures=[]
    for prop,before,delta,scale,cast in itertools.product(PROPERTIES,[-2.2,0,30],[0,.4,2.2,-.4,-50],[-150,0,25],[None,0]):
        v=dict(property=prop,before=before,delta=delta,critScale=scale,critDamageScale=scale,castValue=cast)
        fixtures.append({'input':v,'expected':o.change(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattlePropertyServer','BattleConst']},'scope':'Original ChangeProperty, positive/negative branches, pre/post helpers and original property/category rules for 15 explicit non-resource combat properties. Existing numeric properties, supplied crit amplification, owner/send callbacks observed. No state construction, callback dispatch, resource/mastery/HP mutation or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-combat-property-mutation.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original combat property mutation cases')
