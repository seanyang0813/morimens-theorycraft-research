"""Original hit payload -> handler -> compiled state argument -> Arg1 lookup.

Direct calls and explicit adapters; not automatic dispatch or a battle scheduler.
"""
import json
from hit_trigger_bridge_oracle import ConnectedHitTriggerOracle
from state_owner_target_oracle import StateOwnerOracle
from runtime_oracle import ROOT

class ArgumentBridgeOracle(ConnectedHitTriggerOracle,StateOwnerOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.module('FuncTable');self.setglobal(L,b'_argument_functions')
        self.getglobal(L,b'string')
        def replace(s):
            try:
                text=self.string(s,1,None);old=self.string(s,2,None);new=self.string(s,3,None)
                self.pushstring(s,text.replace(old,new));return 1
            except Exception as error:self.errors.append(str(error));self.nil(s);return 1
        self.method('replace',replace);self.top(L,0)

    def argument(self,expression):
        L=self.state;self.top(L,0)
        self.getglobal(L,b'_target_parser');self.getfield(L,-1,b'GetGlobalValue')
        self.table(L,0,3);self.table(L,0,0);self.setfield(L,-2,b'skillArgs')
        self.pushstring(L,expression.encode());self.setfield(L,-2,b'configPara')
        def values(s):
            try:
                key=self.string(s,2,None)
                self.getglobal(s,b'_argument_functions');self.getfield(s,-1,key)
                self.table(s,0,1);self.getglobal(s,b'_original_trigger_payload');self.getfield(s,-1,b'triggerValue')
                self.setfield(s,-3,b'TriggerValue');self.top(s,-2)
                self.check(self.call(s,1,1,0,0,None))
                # Original expression value returned as the parser's dense list.
                self.table(s,1,0);self.pushvalue(s,-2);self.rawseti(s,-2,1);return 1
            except Exception as error:self.errors.append(str(error));self.table(s,0,0);return 1
        self.method('GetValueListByCmd',values)
        self.pushstring(L,b'Arg1');self.check(self.call(L,2,1,0,0,None))
        result=self.tonumber(L,-1,None)
        if self.errors:raise RuntimeError(self.errors)
        return result

if __name__=='__main__':
    o=ArgumentBridgeOracle();fixtures=[]
    state=json.loads((ROOT/'research/extracted/config/State.json').read_text(encoding='utf-8'))['80575']
    for category,handler in [('Passive','BSTAfterPassiveDamage'),('Fixed','BSTAfterFixedDamage')]:
        for damage in [1,3,10,101.25]:
            for block in [0,500]:
                for immune in [False,True]:
                    value=dict(damage=damage,damageType=category,dimensionFixPer=0,effectProperties={},hp=10000,block=block,immune=immune,puncture=False,preventEligible=False,retainHp=0,limit=0,usedLimit=0,deathResist=0)
                    hit=o.evaluate(value)
                    trigger=o.run_handler({'handler':handler,'mode':'None','eligible':True},payload_global=b'_effect_hit_result')
                    if trigger['trigger'] is None:raise RuntimeError('Expected matching trigger')
                    argument=o.argument(state['TriggerPara2'])
                    fixtures.append({'input':value,'hit':hit,'trigger':trigger,'argument':argument})
    names=['BEPassiveDamage','BEFixedDamage','BattleUnitBase','BattlePropertyServer','BSTAfterPassiveDamage','BSTAfterFixedDamage','BattleCmdParser','FuncTable','State']
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original effect/BeHit table passed unchanged to matching original handler; retained original Trigger payload feeds original State80575 TriggerPara2 closure, returned through original GetGlobalValue Arg1 fallback with empty skillArgs. GetValueListByCmd and string.replace are explicit adapters; no expression environment/cache, event dispatch, original state callback, command rows or gameplay.', 'sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in names},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-old-embers-argument-bridge.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original hit/trigger/state-argument bridge cases')
