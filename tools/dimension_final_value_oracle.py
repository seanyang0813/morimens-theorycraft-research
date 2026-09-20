"""Original CalFinalVal -> GetDimensionFixPer with explicit role/player adapters."""
import itertools
import json
from passive_runtime_oracle import PassiveOracle, ROOT

class DimensionOracle(PassiveOracle):
    def calculate(self,v):
        L=self.state;self.top(L,0);trace=[]
        self.table(L,0,3);self.getglobal(L,b'_passive_base');self.getfield(L,-1,b'GetDimensionFixPer');self.setfield(L,-3,b'GetDimensionFixPer');self.top(L,-2)
        self.table(L,0,1)
        if v['hasCasterUid']:self.number(L,7);self.setfield(L,-2,b'castRoleUid')
        self.setfield(L,-2,b'cmdServer');self.table(L,0,1)
        def getobj(s):
            trace.append('getCaster')
            if not v['hasRole']:self.nil(s);return 1
            self.table(s,0,2);self.getglobal(s,b'_oracle_bc');self.getfield(s,-1,b'BattleCamp');self.getfield(s,-1,b'Camp1' if v['friendly'] else b'Camp2');self.setfield(s,-4,b'camp');self.top(s,-3)
            def player(t):
                trace.append('getPlayer')
                if not v['hasPlayer']:self.nil(t);return 1
                self.table(t,0,1)
                def prop(u):trace.append('dimensionProperty');self.number(u,v['percent']);return 1
                self.method('GetProperty',prop);return 1
            self.method('GetPlayer',player);return 1
        self.method('GetObj',getobj);self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_dimension_subject')
        self.getglobal(L,b'_passive_base');self.getfield(L,-1,b'CalFinalVal');self.getglobal(L,b'_dimension_subject');self.number(L,v['value']);code=self.call(L,2,1,0,0,None)
        if self.errors:raise RuntimeError(self.errors)
        return {'error':True,'trace':trace} if code else {'value':self.tonumber(L,-1,None),'trace':trace}

if __name__=='__main__':
    o=DimensionOracle();fixtures=[]
    for value,uid,role,friendly,player,percent in itertools.product([-1.2,0,2.2],[False,True],[False,True],[False,True],[False,True],[-150,0,50]):
        v=dict(value=value,hasCasterUid=uid,hasRole=role,friendly=friendly,hasPlayer=player,percent=percent);fixtures.append({'input':v,'expected':o.calculate(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleEffectServer':o.assets['BattleEffectServer.lua']['sha256']},'scope':'144 original CalFinalVal -> GetDimensionFixPer cases with supplied caster UID, role camp/player existence and player property getter. Includes original errors when a positive value resolves no player. No automatic role/property derivation, state pipeline integration or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-dimension-final-value.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original dimension final-value cases')
