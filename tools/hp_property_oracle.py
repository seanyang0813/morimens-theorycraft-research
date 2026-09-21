"""Execute original ordinary HP SubProperty chain with observational callbacks."""
import json
from target_runtime_oracle import TargetOracle, ROOT

class HpPropertyOracle(TargetOracle):
    def __init__(self, asset_overrides=None):
        asset_overrides = asset_overrides or {}
        super().__init__(asset_overrides)
        L=self.state
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util'}
            if name in known:self.getglobal(s,known[name])
            elif name in [b'Battle.Ecs.BattleComponent',b'Battle.DbgEngine.Event.BattleLogicEvent']:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        self.module('BattlePropertyServer',asset_overrides.get('BattlePropertyServer'));self.setglobal(L,b'_hp_property')
        if self.errors:raise RuntimeError(self.errors)
        self.getglobal(L,b'_hp_property')
        self.table(L,0,2)
        self.number(L,1);self.setfield(L,-2,b'uid')
        def owner_changed(s):
            self.events.append(dict(kind='owner',property=self.string(s,2,None).decode(),old=self.tonumber(s,3,None),new=self.tonumber(s,4,None)))
            return 0
        self.method('OnPropertyChanged',owner_changed);self.setfield(L,-2,b'owner')
        def send_changed(s):
            self.events.append(dict(kind='send',property=self.string(s,3,None).decode(),delta=self.tonumber(s,4,None),new=self.tonumber(s,5,None)))
            return 0
        self.method('SendOnPropertyChanged',send_changed);self.top(L,0)

    def evaluate(self,hp,request):
        L=self.state;self.events=[];self.top(L,0)
        self.getglobal(L,b'_hp_property');self.table(L,0,1)
        self.number(L,hp);self.setfield(L,-2,b'hp');self.setfield(L,-2,b'properties');self.top(L,0)
        self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'SubProperty');self.getglobal(L,b'_hp_property')
        self.getglobal(L,b'_oracle_bc');self.getfield(L,-1,b'BattleProperty');self.getfield(L,-1,b'hp');self.setglobal(L,b'_hp_key');self.top(L,-3);self.getglobal(L,b'_hp_key')
        self.number(L,request);self.table(L,0,0)
        self.check(self.call(L,4,1,0,0,None))
        after=self.tonumber(L,-1,None)
        return dict(hpAfter=after,hpLost=hp-after,callbacks=self.events)

if __name__=='__main__':
    o=HpPropertyOracle()
    cases=[(hp,request) for hp in [0,0.5,1,100] for request in [0,0.25,hp,hp+0.5]]
    out={'scope':'Original SubProperty, BeforeSub, GetSubPropertyValueFunc, AfterSub and RefreshMaxLimit for explicit nonnegative HP/request. Owner callback and SendOnPropertyChanged replaced by non-mutating spies; no constructor, event dispatch, BeHit or death handling.', 'sourceHash':o.assets['BattlePropertyServer.lua']['sha256'],'fixtures':[{'input':{'hp':hp,'request':request},'expected':o.evaluate(hp,request)} for hp,request in cases]}
    (ROOT/'tests/synthetic/original-hp-property.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
    print('Generated',len(cases),'HP subtraction cases')
