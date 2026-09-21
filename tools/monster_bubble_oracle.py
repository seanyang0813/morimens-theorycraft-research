"""Execute the original BEMonsterBubble body with explicit target/record adapters."""
import ctypes as C
import json

from target_runtime_oracle import TargetOracle, ROOT


class MonsterBubbleOracle(TargetOracle):
    def __init__(self):
        super().__init__()
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_void_p
        self.seti=self.lib.lua_seti;self.seti.argtypes=[C.c_void_p,C.c_int,C.c_ssize_t];self.seti.restype=None
        self.toboolean=self.lib.lua_toboolean;self.toboolean.argtypes=[C.c_void_p,C.c_int];self.toboolean.restype=C.c_int
        L=self.state;self.trace=[]
        self.table(L,0,3)
        self.method('DoEffect',lambda s:(self.trace.append('super'),0)[1])
        self.method('ctor',lambda s:0);self.method('Dispose',lambda s:0)
        self.setglobal(L,b'_bubble_super')

        def new_class(s):
            self.table(s,0,10);self.pushvalue(s,2);return 2
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',new_class);self.top(L,0)

        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Effect.BattleEffectServer':b'_bubble_super'}
            if name in known:self.getglobal(s,known[name])
            else:self.errors.append('Unexpected dependency: '+repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        self.module('BEMonsterBubble');self.setglobal(L,b'_bubble_class')
        if self.errors:raise RuntimeError(self.errors)

        self.getglobal(L,b'_oracle_bc');self.getfield(L,-1,b'RoleType');self.getfield(L,-1,b'Monster')
        self.monster_type=self.tonumber(L,-1,None);self.top(L,0)

    def evaluate(self,values):
        L=self.state;self.top(L,0);self.trace=[];record=[]
        self.table(L,0,4)
        self.table(L,2,0)
        if values['tipsId'] is not None:self.pushstring(L,values['tipsId'].encode());self.seti(L,-2,1)
        if values['showTime'] is not None:self.number(L,values['showTime']);self.seti(L,-2,2)
        self.setfield(L,-2,b'params')
        self.table(L,1,0)
        if values['targetPresent']:
            self.table(L,0,4);self.number(L,values['uid']);self.setfield(L,-2,b'uid')
            self.number(L,self.monster_type if values['roleTypeMonster'] else self.monster_type+1);self.setfield(L,-2,b'roleType')
            self.method('IsRoleType',lambda s:(self.boolean(s,values['isRoleTypeMonster']),1)[1]);self.seti(L,-2,1)
        self.setfield(L,-2,b'targets')
        self.table(L,0,1);self.table(L,0,1)
        def bubble(s):
            record.append({'uid':self.tonumber(s,2,None),'tipsId':self.string(s,3,None).decode(),'showTime':self.tonumber(s,4,None)});return 0
        self.method('OnMonsterBubble',bubble);self.setfield(L,-2,b'recordMgr');self.setfield(L,-2,b'battleEngine')
        self.setglobal(L,b'_bubble_self')
        self.getglobal(L,b'_bubble_class');self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_bubble_self')
        self.check(self.call(L,1,1,0,0,None));returned=bool(self.toboolean(L,-1));self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)
        return {'returned':returned,'superCalls':self.trace.count('super'),'records':record}


if __name__=='__main__':
    oracle=MonsterBubbleOracle();fixtures=[]
    cases=[
        {'tipsId':None,'showTime':8000,'targetPresent':True,'isRoleTypeMonster':True,'roleTypeMonster':True,'uid':77},
        {'tipsId':'Monster_Chapter8_08','showTime':8000,'targetPresent':False,'isRoleTypeMonster':True,'roleTypeMonster':True,'uid':77},
        {'tipsId':'Monster_Chapter8_08','showTime':8000,'targetPresent':True,'isRoleTypeMonster':False,'roleTypeMonster':True,'uid':77},
        {'tipsId':'Monster_Chapter8_08','showTime':8000,'targetPresent':True,'isRoleTypeMonster':True,'roleTypeMonster':False,'uid':77},
        {'tipsId':'Monster_Chapter8_08','showTime':None,'targetPresent':True,'isRoleTypeMonster':True,'roleTypeMonster':True,'uid':77},
        {'tipsId':'Monster_Chapter8_08','showTime':8000,'targetPresent':True,'isRoleTypeMonster':True,'roleTypeMonster':True,'uid':77},
    ]
    for case in cases:fixtures.append({'input':case,'expected':oracle.evaluate(case)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHash':oracle.assets['BEMonsterBubble.lua']['sha256'],'scope':'Original BEMonsterBubble.DoEffect with explicit params, target identity and record-manager observer. No scheduler, rendering client, gameplay or current-build runtime claim.','fixtures':fixtures}
    path=ROOT/'tests/synthetic/original-monster-bubble.json';path.write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8',newline='\n');print('Generated',len(fixtures),'monster-bubble cases')
