"""Connect original GenerateEffectObj to original BattleEffectMgrServer.CreateEffect."""
import ctypes as C
import json

from target_runtime_oracle import TargetOracle, ROOT


class CommandEffectConstructionOracle(TargetOracle):
    def __init__(self,asset_overrides=None):
        asset_overrides=asset_overrides or {};super().__init__(asset_overrides);L=self.state
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_char_p
        self.rawequal=self.lib.lua_rawequal;self.rawequal.argtypes=[C.c_void_p,C.c_int,C.c_int];self.rawequal.restype=C.c_int
        self.length=self.lib.lua_rawlen;self.length.argtypes=[C.c_void_p,C.c_int];self.length.restype=C.c_size_t
        self.rawset=self.lib.lua_rawseti;self.rawset.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawset.restype=None
        self.getglobal(L,b'string')
        def split(s):
            values=self.string(s,1,None).decode().split(self.string(s,2,None).decode());self.table(s,len(values),0)
            for index,value in enumerate(values,1):self.pushstring(s,value.encode());self.rawset(s,-2,index)
            return 1
        def startswith(s):self.boolean(s,self.string(s,1,None).startswith(self.string(s,2,None)));return 1
        self.method('split',split);self.method('startswith',startswith);self.top(L,0)
        def effect_class(s):
            def field(name,kind='number'):
                self.getfield(s,2,name.encode());value=(bool(self.tobool(s,-1)) if kind=='bool' else (self.string(s,-1,None).decode() if kind=='string' and self.string(s,-1,None) else self.tonumber(s,-1,None) if self.kind(s,-1)==3 else None));self.top(s,-2);return value
            self.getfield(s,2,b'cmdServer');self.getglobal(s,b'_construction_command');command_identity=bool(self.rawequal(s,-1,-2));self.top(s,-3)
            self.getfield(s,2,b'cmdCfg');self.getglobal(s,b'_construction_row');row_identity=bool(self.rawequal(s,-1,-2));self.top(s,-3)
            self.constructed.append({'effectType':field('effectType','string'),'fixArg':field('fixArg','string'),'cmdIndex':field('cmdIndex'),'beforeDelay':field('BeforeDelay'),'castRoleUid':field('castRoleUid'),'skipPhase':field('skipPhase','bool'),'isFromCmd':field('isFromCmd','bool'),'interruptCmdCond':field('interruptCmdCond','string'),'commandIdentity':command_identity,'rowIdentity':row_identity})
            self.table(s,0,2)
            def pre(state):self.preTriggers+=1;return 0
            self.method('PreTrigger',pre);return 1
        self.effect_class_cb=C.CFUNCTYPE(C.c_int,C.c_void_p)(effect_class);self.callbacks.append(self.effect_class_cb)
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc'}
            if name in known:self.getglobal(s,known[name])
            elif name.startswith(b'Battle.DbgEngine.Effect.BEProbe'):self.pushclosure(s,self.effect_class_cb,0)
            elif name in (b'Battle.DbgEngine.Event.BattleLogicEvent',b'Battle.Ecs.BattleEngineComponent',b'Battle.DbgEngine.Effect.BattleEffectServer'):self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleEffectMgrServer',asset_overrides.get('BattleEffectMgrServer'));self.setglobal(L,b'_construction_manager_class')
        if self.errors:raise RuntimeError(self.errors)

    def run_construction(self,v):
        L=self.state;self.top(L,0);self.constructed=[];self.preTriggers=0;self.warnings=[];self.errors.clear()
        self.table(L,0,3);self.getglobal(L,b'_construction_manager_class');self.getfield(L,-1,b'CreateEffect');self.setfield(L,-3,b'CreateEffect');self.top(L,-2);self.table(L,0,0);self.setfield(L,-2,b'effectList');self.setglobal(L,b'_construction_manager')
        self.table(L,0,5);self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'GenerateEffectObj');self.setfield(L,-3,b'GenerateEffectObj');self.top(L,-2);self.number(L,9);self.setfield(L,-2,b'castRoleUid');self.setglobal(L,b'_construction_command')
        self.table(L,0,5);self.getglobal(L,b'_construction_manager');self.setfield(L,-2,b'effectMgr');self.setglobal(L,b'_construction_engine')
        self.table(L,0,1)
        if v['apiType']=='cmd':self.getglobal(L,b'_oracle_bc');self.getfield(L,-1,b'ApiType');self.getfield(L,-1,b'CMD');self.setfield(L,-4,b'ApiType');self.top(L,-3)
        else:self.number(L,-999);self.setfield(L,-2,b'ApiType')
        self.setglobal(L,b'_construction_api_cfg')
        self.table(L,0,1);self.getglobal(L,b'_construction_api_cfg');self.setfield(L,-2,v['type'].encode());self.setglobal(L,b'_construction_api')
        self.table(L,0,1);self.getglobal(L,b'_construction_api');self.setfield(L,-2,b'BattleApi');self.setglobal(L,b'_construction_dt')
        def warn(s):
            value=self.string(s,3,None);self.warnings.append(value.decode() if value else None);return 0
        self.getglobal(L,b'_construction_engine');self.getglobal(L,b'_construction_dt');self.setfield(L,-2,b'battleDT');self.method('Warn',warn);self.setglobal(L,b'_construction_engine')
        self.getglobal(L,b'_construction_manager');self.getglobal(L,b'_construction_engine');self.setfield(L,-2,b'battleEngine');self.top(L,0)
        self.getglobal(L,b'_construction_command');self.getglobal(L,b'_construction_engine');self.setfield(L,-2,b'battleEngine');self.top(L,0)
        self.table(L,0,3);self.pushstring(L,v['type'].encode());self.setfield(L,-2,b'Type');self.number(L,44);self.setfield(L,-2,b'rowId')
        if v['interrupt'] is not None:self.pushstring(L,v['interrupt'].encode());self.setfield(L,-2,b'InterruptCmdCond')
        self.setglobal(L,b'_construction_row')
        self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'GenerateEffectObj');self.getglobal(L,b'_construction_command');self.getglobal(L,b'_construction_row');self.number(L,v['delay']);self.boolean(L,v['skipPhase']);self.number(L,v['index']);self.check(self.call(L,5,1,0,0,None));returned=self.kind(L,-1)==5;self.top(L,0)
        self.getglobal(L,b'_construction_manager');self.getfield(L,-1,b'effectList');manager_count=self.length(L,-1);self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)
        return {'returnedEffect':returned,'managerEffectCount':manager_count,'constructed':self.constructed,'preTriggers':self.preTriggers,'warnings':self.warnings}


CASES=[
 {'name':'basic','type':'BEProbe','apiType':'cmd','delay':.25,'skipPhase':False,'index':1,'interrupt':None},
 {'name':'fixed-argument','type':'BEProbe.Fixed','apiType':'cmd','delay':0,'skipPhase':True,'index':2,'interrupt':'Arg1>0'},
 {'name':'non-be-command','type':'PlainEffect','apiType':'cmd','delay':1,'skipPhase':False,'index':3,'interrupt':None},
 {'name':'non-command-api','type':'BEProbe','apiType':'other','delay':1,'skipPhase':False,'index':4,'interrupt':None},
]


def main():
    oracle=CommandEffectConstructionOracle();fixtures=[{'input':row,'expected':oracle.run_construction(row)} for row in CASES]
    output=ROOT/'tests/synthetic/original-command-effect-construction.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in ('BattleCmdServer','BattleEffectMgrServer')},'scope':'Original GenerateEffectObj connected to original BattleEffectMgrServer.CreateEffect. Synthetic callable BEProbe class observes the complete effect configuration and creates an inert object. Covers CMD/non-CMD, BE/non-BE and fixed-argument routing. No real effect class, PreTrigger, scheduling, damage, gameplay or holdout.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n');print('Generated',len(fixtures),'command-effect construction cases')


if __name__=='__main__':main()
