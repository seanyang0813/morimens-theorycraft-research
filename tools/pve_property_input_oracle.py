"""Original PvE role property routing/fallback using synthetic config and spawn spies."""
import ctypes as C
import json
from target_runtime_oracle import TargetOracle, ROOT

class PveInputOracle(TargetOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.rawseti=self.lib.lua_rawseti;self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawseti.restype=None
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        def require(s):
            name=self.string(s,1,None)
            if name==b'System.System':self.getglobal(s,b'_oracle_config_system')
            elif name==b'Battle.BattleConst':self.getglobal(s,b'_oracle_bc')
            elif name in [b'Battle.DbgEngine.GameplayBase',b'Battle.DbgEngine.Bout.BattleBoutMgrServer',b'Battle.DbgEngine.Card.BattleCardMgrServer',b'Battle.DbgEngine.AI.BattleAIMgrServer']:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('PVEGameplay');self.setglobal(L,b'_pve_class')

    def push(self,value):
        L=self.state
        if isinstance(value,dict):
            self.table(L,0,len(value))
            for key,item in value.items():
                self.push(item)
                if isinstance(key,int):self.rawseti(L,-2,key)
                else:self.setfield(L,-2,key.encode())
        elif isinstance(value,list):
            self.table(L,len(value),0)
            for i,item in enumerate(value,1):self.push(item);self.rawseti(L,-2,i)
        elif isinstance(value,str):self.pushstring(L,value.encode())
        else:self.number(L,value)

    def run(self,case):
        L=self.state;self.top(L,0);self.spawns=[]
        self.push({'battleInitData':{'copyProperties':case['player'],'playerLevel':90},'battleEngine':{'battleDT':{'Item':{},'AwakerConfig':{1:{'occupation_master':12.25,'occupation_master_final_per':25.25,'physique':100,'physique_per':0}},'BattleApi':{}}}})
        for name in ['LoadAwakerConfigProperties','CalcInitProperty','GetAwakerUpgradeConfig']:
            self.getglobal(L,b'_pve_class');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.getfield(L,-1,b'battleEngine');self.method('GenUid',lambda s:(self.number(s,1),1)[1]);self.getfield(L,-1,b'battleDT');self.getfield(L,-1,b'BattleApi')
        for name in ['occupation_master','occupation_master_final_per','physique','physique_per']:
            self.table(L,0,1);self.getglobal(L,b'_oracle_bc');self.getfield(L,-1,b'ApiType');self.getfield(L,-1,b'AWAKER_ATTR');self.setglobal(L,b'_pve_attr_enum');self.top(L,-3);self.getglobal(L,b'_pve_attr_enum');self.setfield(L,-2,b'ApiType');self.setfield(L,-2,name.encode())
        self.top(L,-3);self.table(L,0,2)
        def capture(kind):
            def callback(s):
                try:
                    result={'role':kind,'properties':{}};self.getfield(s,2,b'properties')
                    for key in ['occupation_master','occupation_master_final_per','occupation_master_final','hp','max_hp','physique','physique_per']:
                        self.getfield(s,-1,key.encode())
                        if self.kind(s,-1)==3:result['properties'][key]=self.tonumber(s,-1,None)
                        self.top(s,-2)
                    self.spawns.append(result)
                except Exception as error:self.errors.append(str(error))
                return 0
            return callback
        self.method('SpawnPlayer',capture('player'));self.method('SpawnAwaker',capture('awaker'));self.setfield(L,-2,b'roleMgr');self.top(L,-2);self.setglobal(L,b'_pve_self')
        self.getglobal(L,b'_pve_class');self.getfield(L,-1,b'SpawnCampRoles');self.getglobal(L,b'_pve_self');self.push([{'tid':1,'level':case['level'],'attrs':case['awaker']}]);self.check(self.call(L,2,0,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return self.spawns

if __name__=='__main__':
    o=PveInputOracle();fixtures=[]
    for level in [70,90]:
        for supplied in [None,0,44.5]:
            case={'level':level,'player':{'occupation_master':200.5,'occupation_master_final':901.25},'awaker':{'physique':100,'physique_per':0,'hp':0}}
            if supplied is not None:case['awaker']['occupation_master']=supplied
            expected=o.run(case)
            assert expected[0]['properties']==case['player']
            assert expected[1]['properties']['occupation_master']==(13 if supplied is None else supplied)
            assert expected[1]['properties']['hp']==0
            assert 'occupation_master_final' not in expected[1]['properties']
            fixtures.append({'input':case,'expected':expected})
    report={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original SpawnCampRoles -> LoadAwakerConfigProperties -> non-primary CalcInitProperty with synthetic configuration and spawn observers. Supplied primary/HP values avoid primary growth; no actual role construction, subsequent hooks, server assembly or gameplay.','sourceHash':o.assets['PVEGameplay.lua']['sha256'],'fixtures':fixtures}
    (ROOT/'research/evidence/pve-property-input-boundary.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Verified',len(fixtures),'original PvE input routing cases')
