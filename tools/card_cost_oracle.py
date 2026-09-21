"""Original card cost precedence with explicitly resolved modifier adapters."""
import ctypes as C
import json
from target_runtime_oracle import TargetOracle, ROOT

class CardCostOracle(TargetOracle):
    def __init__(self,asset_overrides=None):
        asset_overrides=asset_overrides or {}
        super().__init__(asset_overrides);L=self.state
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_char_p
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util'}
            if name in known:self.getglobal(s,known[name])
            elif name in [b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.Cmd.BattleCmdServer',b'Battle.DbgEngine.Event.BattleLogicEvent',b'Battle.DbgEngine.BattlePropertyServer',b'Battle.DbgEngine.DataCenter.BattleCardData',b'Battle.DbgEngine.Cmd.BattleCmdParser']:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleCardServer',asset_overrides.get('BattleCardServer'));self.setglobal(L,b'_cost_card')

    def push(self,s,value):
        if value is None:self.nil(s)
        elif isinstance(value,str):self.pushstring(s,value.encode())
        else:self.number(s,value)

    def run(self,v):
        L=self.state;self.top(L,0);self.table(L,0,15)
        for name in ['GetFixedCost','GetBaseCost','GetUseCost','IsNoCost','GetVariableCostMode','IsXCost','ResolveVariableConsumeCost']:
            self.getglobal(L,b'_cost_card');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        def prop(s):
            key=self.string(s,2,None).decode()
            value=v['originCost'] if key=='card_origin_cost' else v['fixedSwitches'].get(key)
            self.push(s,value);return 1
        self.method('GetProperty',prop)
        for name,key in [('GetCfgCost','cfgCost'),('GetCostDelta','delta'),('GetCostHarmonize','harmonize'),('GetHandKeeperCost','keeperCost')]:
            def value(s,key=key):
                try:self.push(s,v[key]);return 1
                except Exception as error:self.errors.append(str(error));self.nil(s);return 1
            self.method(name,value)
        self.method('CardTypeMatch',lambda s:(self.boolean(s,v['keeper']),1)[1])
        self.table(L,0,1);self.method('IsPVP',lambda s:(self.boolean(s,v['pvp']),1)[1]);self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_cost_self')
        result={}
        for name,key in [('GetBaseCost','baseCost'),('GetUseCost','useCost'),('ResolveVariableConsumeCost','variableConsumeCost')]:
            self.getglobal(L,b'_cost_self');self.getfield(L,-1,name.encode());self.getglobal(L,b'_cost_self')
            if key=='variableConsumeCost':self.number(L,v['energy'])
            self.check(self.call(L,2 if key=='variableConsumeCost' else 1,1,0,0,None));result[key]=None if self.kind(L,-1)==0 else self.tonumber(L,-1,None);self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)
        return result

if __name__=='__main__':
    o=CardCostOracle();fixtures=[]
    variants=[{}, {'fixedSwitches':{'card_fixed_cost0':1,'card_fixed_cost3':1}}, {'fixedSwitches':{'card_fixed_cost2':1}}, {'keeper':True,'keeperCost':4}, {'pvp':True}, {'delta':-9,'harmonize':-1}]
    for cfg in [None,0,'2','X','X3','X0']:
        for energy in [0,2,5]:
            for variant in variants:
                v=dict(cfgCost=cfg,energy=energy,originCost=2,delta=1,harmonize=0.5,fixedSwitches={},keeper=False,keeperCost=None,pvp=False);v.update(variant)
                fixtures.append({'input':v,'expected':o.run(v)})
    report={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original GetBaseCost/GetUseCost/GetFixedCost and variable parser/consume resolver. Config cost, origin, total delta/harmonize, keeper match/cost and PvP decision supplied. No modifier derivation, cost payment, play eligibility or gameplay.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleCardServer','BattleConst','BattleUtilServer']},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-card-cost.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original card cost cases')
