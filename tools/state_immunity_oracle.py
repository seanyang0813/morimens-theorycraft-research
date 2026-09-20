"""Original state immunity method with explicit property/state-ID mappings."""
import itertools
import json
from card_state_multiplier_oracle import CardStateOracle, ROOT

class StateImmunityOracle(CardStateOracle):
    def immunity(self,v):
        L=self.state;self.top(L,0);reads=[];tips=[]
        self.getglobal(L,b'_oracle_bc');self.table(L,1,0);self.pushstring(L,b'immue_state_probe');self.rawset(L,-2,1);self.setfield(L,-2,b'PropertyImmueState');self.top(L,0)
        self.table(L,0,2);self.number(L,7);self.setfield(L,-2,b'uid')
        def prop(s):
            name=self.string(s,2,None).decode();reads.append(name);self.number(s,v['properties'][name]);return 1
        self.method('GetProperty',prop);self.setglobal(L,b'_immunity_target')
        self.table(L,0,2)
        def tip(s):tips.append(self.tonumber(s,3,None) or None);return 0
        self.method('__ShowTips',tip);self.table(L,0,2)
        self.table(L,0,2);self.table(L,0,1);self.table(L,0,1)
        if v['buffType']!='none':self.pushstring(L,b'TRUE' if v['buffType']=='buff' else b'FALSE');self.setfield(L,-2,b'IsBuff')
        self.rawset(L,-2,2669);self.setfield(L,-2,b'State')
        self.table(L,0,1);self.table(L,0,1);self.pushstring(L,b'ids');self.setfield(L,-2,b'Data');self.setfield(L,-2,b'immue_state_probe');self.setfield(L,-2,b'BattleApi');self.setfield(L,-2,b'battleDT')
        def ids(s):
            for n in v['ids']:self.number(s,n)
            return len(v['ids'])
        def expr(s):self.callback(ids);return 1
        self.method('GetCmdFunc',expr);self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_immunity_subject')
        self.getglobal(L,b'_add_parent');self.getfield(L,-1,b'CheckImmue');self.getglobal(L,b'_immunity_subject');self.getglobal(L,b'_immunity_target');self.number(L,2669);self.check(self.call(L,3,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return {'immune':bool(self.boolean_read(L,-1)),'reads':reads,'tipStateIds':tips}
if __name__=='__main__':
    o=StateImmunityOracle();fixtures=[]
    for kind,buff,debuff,both,specific,ids in itertools.product(['none','buff','debuff'],[0,1],[0,1],[0,1],[0,1],[[],[7],[7,2669]]):
        v={'buffType':kind,'properties':dict(immue_buff=buff,immue_debuff=debuff,immue_both_buff=both,immue_state_probe=specific),'ids':ids};fixtures.append({'input':v,'expected':o.immunity(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BEAddStateParent','BattleConst']},'scope':'144 original CheckImmue cases. Original buff-type constants; supplied state config/property getters and synthetic specific-state mapping/expression, tip observer. No automatic property derivation, original expression lookup, enclosing AddState or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-state-immunity.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original state immunity cases')
