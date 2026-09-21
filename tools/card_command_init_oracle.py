"""Execute original BattleCardServer.InitCmdServer with constructor observers."""
import ctypes as C
import json

from target_runtime_oracle import TargetOracle, ROOT


class CardCommandInitOracle(TargetOracle):
    def __init__(self,asset_overrides=None):
        asset_overrides=asset_overrides or {};super().__init__(asset_overrides);L=self.state
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
        self.absindex=self.lib.lua_absindex;self.absindex.argtypes=[C.c_void_p,C.c_int];self.absindex.restype=C.c_int
        self.rawlen=self.lib.lua_rawlen;self.rawlen.argtypes=[C.c_void_p,C.c_int];self.rawlen.restype=C.c_size_t
        self.rawgeti=self.lib.lua_rawgeti;self.rawgeti.argtypes=[C.c_void_p,C.c_int,C.c_int64];self.rawgeti.restype=C.c_int
        self.rawseti=self.lib.lua_rawseti;self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_int64]
        self.getglobal(L,b'table')
        def deepclone(s):
            source=self.absindex(s,1);self.table(s,int(self.rawlen(s,source)),0)
            for i in range(1,int(self.rawlen(s,source))+1):self.rawgeti(s,source,i);self.rawseti(s,-2,i)
            return 1
        self.method('deepclone',deepclone);self.top(L,0)
        def factory(s):
            config=self.absindex(s,2);row={key:self._field(s,config,key) for key in ('skillLevel','skillConfigId','cmdId','cardUid','isPreCmd','castRoleUid')}
            self.getfield(s,config,b'createCardArgs');row['createCardArgs']=self._array(s,-1);self.top(s,-2);self.requests.append(row)
            self.table(s,0,2);self.number(s,len(self.requests));self.setfield(s,-2,b'marker')
            self.callback(lambda state:(self.trace.append('GetSkillArgs'),0)[1]);self.setfield(s,-2,b'GetSkillArgs');return 1
        self.callback(factory);self.setglobal(L,b'_cmd_init_factory')
        empty={b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.Event.BattleLogicEvent',b'Battle.DbgEngine.BattlePropertyServer',b'Battle.DbgEngine.DataCenter.BattleCardData',b'Battle.DbgEngine.Cmd.BattleCmdParser'}
        known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util',b'Battle.DbgEngine.Cmd.BattleCmdServer':b'_cmd_init_factory'}
        def require(s):
            name=self.string(s,1,None)
            if name in known:self.getglobal(s,known[name])
            elif name in empty:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleCardServer',asset_overrides.get('BattleCardServer'));self.setglobal(L,b'_cmd_init_class')
        if self.errors:raise RuntimeError(self.errors)

    def _field(self,L,index,name):
        index=self.absindex(L,index);self.getfield(L,index,name.encode());kind=self.kind(L,-1);value=None if kind==0 else bool(self.tobool(L,-1)) if kind==1 else self.tonumber(L,-1,None) if kind==3 else self.string(L,-1,None).decode() if kind==4 else '<table>';self.top(L,-2);return value
    def _array(self,L,index):
        index=self.absindex(L,index);out=[]
        for i in range(1,int(self.rawlen(L,index))+1):self.rawgeti(L,index,i);out.append(self.tonumber(L,-1,None));self.top(L,-2)
        return out

    def run_init(self,v):
        L=self.state;self.top(L,0);self.errors.clear();self.requests=[];self.trace=[]
        self.table(L,0,10);self.table(L,0,1);self.number(L,v['tid']);self.setfield(L,-2,b'tid');self.setfield(L,-2,b'data');self.table(L,0,1);self.number(L,v['ownerUid']);self.setfield(L,-2,b'uid');self.setfield(L,-2,b'owner');self.number(L,v['uid']);self.setfield(L,-2,b'uid');self.number(L,v['level']);self.setfield(L,-2,b'level');self.table(L,0,0);self.setfield(L,-2,b'battleEngine')
        self.table(L,len(v['createCardArgs']),0)
        for i,value in enumerate(v['createCardArgs'],1):self.number(L,value);self.rawseti(L,-2,i)
        self.setfield(L,-2,b'createCardArgs')
        self.method('GetPreCmdId',lambda s:(self.number(s,v['preCmdId']),1)[1] if v['preCmdId'] is not None else (self.nil(s),1)[1]);self.method('GetCmdId',lambda s:(self.number(s,v['cmdId']),1)[1])
        self.getglobal(L,b'_cmd_init_class');self.getfield(L,-1,b'InitCmdServer');self.setfield(L,-3,b'InitCmdServer');self.top(L,-2);self.setglobal(L,b'_cmd_init_subject')
        self.getglobal(L,b'_cmd_init_subject');self.getfield(L,-1,b'InitCmdServer');self.getglobal(L,b'_cmd_init_subject');self.check(self.call(L,1,0,0,0,None))
        self.getglobal(L,b'_cmd_init_subject');pre=self._field(L,-1,'preCmdServer');main=self._field(L,-1,'cmdServer')
        if self.errors:raise RuntimeError(self.errors)
        return {'requests':self.requests,'preServerPresent':pre=='<table>','mainServerPresent':main=='<table>','trace':self.trace}


BASE={'tid':1001,'ownerUid':88,'uid':9001,'level':7,'preCmdId':None,'cmdId':5001,'createCardArgs':[11,22]}
CASES=[{'name':'main-only',**BASE},{'name':'pre-and-main',**BASE,'preCmdId':4001},{'name':'empty-args',**BASE,'createCardArgs':[]},{'name':'zero-pre-is-present',**BASE,'preCmdId':0}]


def main():
    oracle=CardCommandInitOracle();fixtures=[{'input':case,'expected':oracle.run_init(case)} for case in CASES]
    output=ROOT/'tests/synthetic/original-card-command-init.json';output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleCardServer':oracle.assets['BattleCardServer.lua']['sha256']},'scope':'Original BattleCardServer.InitCmdServer with observed BattleCmdServer constructor requests and GetSkillArgs call. No command constructor internals, execution, gameplay or holdout validation.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n');print('Generated',len(fixtures),'original card command-init cases')


if __name__=='__main__':main()
