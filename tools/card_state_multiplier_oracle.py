"""Original card state-layer multipliers with explicit synthetic property mappings."""
import ctypes as C
import json
from add_state_request_oracle import AddStateOracle, ROOT

class CardStateOracle(AddStateOracle):
    def __init__(self):
        super().__init__()
        self.pushstring=self.lib.lua_pushstring
        self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_void_p

    def run_card(self,v,fixed):
        L=self.state;self.top(L,0);events=[]
        family='CardFixedStateLayerPer' if fixed else 'StateLayerPerByCard'
        mapping='CardFixedStateLayerPerWithAwakerN2' if fixed else 'CardStateLayerPerWithAwakerN2'
        self.getglobal(L,b'_oracle_bc')
        self.table(L,1,0);self.pushstring(L,b'test_card_per');self.rawset(L,-2,1);self.setfield(L,-2,family.encode())
        self.table(L,0,1);self.pushstring(L,b'test_n2_per');self.setfield(L,-2,b'test_card_per');self.setfield(L,-2,mapping.encode());self.top(L,0)
        self.table(L,0,1)
        def caster_prop(s):events.append('casterProperty');self.number(s,v['n2']);return 1
        self.method('GetProperty',caster_prop);self.setglobal(L,b'_mult_caster')
        self.table(L,0,2)
        def matches(s):self.boolean(s,v['instruction']);return 1
        def card_prop(s):events.append('cardProperty');self.number(s,v['property']);return 1
        self.method('CardTypeMatch',matches);self.method('GetProperty',card_prop);self.setglobal(L,b'_mult_card')
        self.table(L,0,3)
        def get_card(s):
            if v['card']:self.getglobal(s,b'_mult_card')
            else:self.nil(s)
            return 1
        self.method('GetCardForStateLayerPer',get_card)
        self.table(L,0,1)
        def get_caster(s):
            if v['caster']:self.getglobal(s,b'_mult_caster')
            else:self.nil(s)
            return 1
        self.method('GetCaster',get_caster);self.setfield(L,-2,b'cmdServer')
        self.table(L,0,2)
        self.table(L,0,1);self.table(L,0,1);self.table(L,0,1)
        self.pushstring(L,b'explicit-state-mapping');self.setfield(L,-2,b'Data')
        self.setfield(L,-2,b'test_card_per');self.setfield(L,-2,b'BattleApi');self.setfield(L,-2,b'battleDT')
        def expression(s):
            for state_id in v['ids']:self.number(s,state_id)
            return len(v['ids'])
        def get_func(s):self.callback(expression);return 1
        self.method('GetCmdFunc',get_func);self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_mult_subject')
        self.getglobal(L,b'_add_parent');self.getfield(L,-1,('ApplyCardFixedStateLayerPer' if fixed else 'ApplyCardStateLayerPer').encode())
        self.getglobal(L,b'_mult_subject');self.number(L,v['layer']);self.number(L,2669)
        self.check(self.call(L,3,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return {'layer':self.tonumber(L,-1,None),'reads':events}

if __name__=='__main__':
    o=CardStateOracle();fixtures=[]
    for fixed in [False,True]:
        for card,caster,instruction in [(False,True,True),(True,False,True),(True,True,False),(True,True,True)]:
            for ids in [[],[7],[2669],[2669,2669]]:
                for layer,prop,n2 in [(2.2,50,25),(3,-100,50),(0,20,30),(-2,40,-10)]:
                    v={'fixed':fixed,'card':card,'caster':caster,'instruction':instruction,'ids':ids,'layer':layer,'property':prop,'n2':n2}
                    fixtures.append({'input':v,'expected':o.run_card(v,fixed)})
    out={'build':'pc-res144-build51','kind':'SYNTHETIC_ORIGINAL_RUNTIME','sourceHashes':{'BEAddStateParent':o.assets['BEAddStateParent.lua']['sha256']},'scope':'Original card and fixed-card multiplier methods. Synthetic BC property family and state mapping; supplied card selection, card type, caster presence and properties. No full layer pipeline, rounding, state creation or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-card-state-multipliers.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original card state multiplier cases')
