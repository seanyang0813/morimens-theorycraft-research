"""Original BESubStateLayer -> BattleStateServer.SubLayer; lifecycle/property spies."""
import json
from state_callback_oracle import StateCallbackOracle, ROOT
class SubLayerOracle(StateCallbackOracle):
    def __init__(self):
        super().__init__();L=self.state
        def noop(s):return 0
        self.getglobal(L,b'_oracle_config_system')
        def newclass(s):self.table(s,0,0);self.table(s,0,1);self.callback(noop);self.setfield(s,-2,b'DoEffect');return 2
        self.callback(newclass);self.setfield(L,-2,b'NewClass');self.top(L,0)
        def require(s):
            name=self.string(s,1,None)
            if name==b'System.System':self.getglobal(s,b'_oracle_config_system')
            elif name==b'Battle.DbgEngine.Effect.BattleEffectServer':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BESubStateLayer');self.setglobal(L,b'_sub_layer_effect')
    def run(self,v):
        L=self.state;self.top(L,0);self.trace=[]
        self.table(L,0,9);self.number(L,88);self.setfield(L,-2,b'uid');self.number(L,80575);self.setfield(L,-2,b'stateId')
        self.table(L,0,1);self.number(L,7);self.setfield(L,-2,b'uid');self.setfield(L,-2,b'owner')
        self.table(L,0,1);self.number(L,v['layers']);self.setfield(L,-2,b'layer');self.setfield(L,-2,b'data')
        self.getglobal(L,b'_state_callback');self.getfield(L,-1,b'SubLayer');self.setfield(L,-3,b'SubLayer');self.top(L,-2)
        def args(s):self.table(s,0,0);self.table(s,0,0);return 2
        def update(s):self.trace.append({'event':'propertyDelta','value':self.tonumber(s,2,None)});return 0
        def record(s):self.trace.append({'event':'record'});return 0
        def log(s):self.trace.append({'event':'log'});return 0
        def end(s):self.trace.append({'event':'lifeEnd'});return 0
        self.method('GetArgs',args);self.method('UpdatePropertyWhenLayerChanges',update);self.method('LogBattleLayer',log);self.method('LifeEnd',end)
        self.table(L,0,2)
        def noop(s):return 0
        self.method('DebugS',noop);self.table(L,0,1);self.method('OnChangeStateLayer',record);self.setfield(L,-2,b'recordMgr');self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_sub_target_state')
        self.table(L,0,3);self.table(L,2,0);self.integer(L,80575);self.rawseti(L,-2,1)
        if v['amount'] is not None:self.number(L,v['amount']);self.rawseti(L,-2,2)
        self.setfield(L,-2,b'params');self.table(L,0,0);self.setfield(L,-2,b'cmdServer')
        self.table(L,1,0);self.table(L,0,0);self.rawseti(L,-2,1);self.setfield(L,-2,b'targets')
        self.table(L,0,1);self.table(L,0,1)
        def lookup(s):
            if v['exists']:self.getglobal(s,b'_sub_target_state')
            else:self.nil(s)
            return 1
        self.method('GetState',lookup);self.setfield(L,-2,b'stateMgr');self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_sub_effect_self')
        self.getglobal(L,b'_sub_layer_effect');self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_sub_effect_self');self.check(self.call(L,1,1,0,0,None))
        self.top(L,0);self.getglobal(L,b'_sub_target_state');self.getfield(L,-1,b'data');self.getfield(L,-1,b'layer');after=self.tonumber(L,-1,None)
        if self.errors:raise RuntimeError(self.errors)
        return {'layersAfter':after,'trace':self.trace}
if __name__=='__main__':
    o=SubLayerOracle();cases=[{'layers':layers,'amount':amount,'exists':exists} for layers in [0,2,10] for amount in [None,0,0.25,2.5,-2.5,20] for exists in [False,True]]
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original effect DoEffect and original state SubLayer. Base effect no-op; target/state lookup supplied; property update, record, logging and LifeEnd are spies. No origin state or caster-layer attribution map. Does not execute actual state removal, events or gameplay.',
        'sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BESubStateLayer','BattleStateServer']},'fixtures':[{'input':v,'expected':o.run(v)} for v in cases]}
    (ROOT/'tests/synthetic/original-sub-state-layer.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(cases),'connected original stack-subtraction cases')
