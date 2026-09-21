"""Original BeHit through original property mutation; downstream hooks are spies."""
import ctypes as C
import json
from hp_property_oracle import HpPropertyOracle, ROOT

class BeHitHpOracle(HpPropertyOracle):
    def __init__(self, asset_overrides=None):
        asset_overrides = asset_overrides or {}
        super().__init__(asset_overrides);L=self.state
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p]
        known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util',b'Battle.DbgEngine.Cmd.BattleCmdServer':b'_oracle_cmd',b'Battle.DbgEngine.BattlePropertyServer':b'_hp_property',b'Battle.Util.BattleUnitUtil':b'_behit_util'}
        empty={b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.Event.BattleLogicEvent',b'Battle.DbgEngine.DataCenter.BattleRoleData',b'Battle.DbgEngine.Role.Component.TagManagerComp'}
        def require(s):
            name=self.string(s,1,None)
            if name in known:self.getglobal(s,known[name])
            elif name in empty:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        self.module('BattleUnitUtil');self.setglobal(L,b'_behit_util')
        self.module('BattleUnitBase');self.setglobal(L,b'_behit_unit')
        if self.errors:raise RuntimeError(self.errors)
        self.getglobal(L,b'_behit_unit');self.number(L,7);self.setfield(L,-2,b'uid')
        self.getglobal(L,b'_hp_property');self.setfield(L,-2,b'property')
        def noop(s):return 0
        def logname(s):self.pushstring(s,b'Synthetic target');return 1
        self.method('GetBattleLogName',logname)
        self.method('TryChangeToBeHitState',noop)
        self.method('DoDamageEvent',noop)
        self.table(L,0,3)
        def caster(s):
            if getattr(self,'caster_exists',True):self.getglobal(s,b'_behit_unit')
            else:self.nil(s)
            return 1
        self.method('GetObj',caster);self.method('LogBattleWithTab',noop)
        self.table(L,0,1);self.method('OnBeHit',noop);self.setfield(L,-2,b'recordMgr')
        self.setfield(L,-2,b'battleEngine');self.top(L,0)

    def enum(self,group,key):
        L=self.state;self.getglobal(L,b'_oracle_bc');self.getfield(L,-1,group.encode());self.getfield(L,-1,key.encode());self.setglobal(L,b'_behit_enum');self.top(L,-3);self.getglobal(L,b'_behit_enum')

    def evaluate(self,v):
        L=self.state;self.top(L,0);self.events=[]
        self.caster_exists=v.get('casterExists',True)
        props={'hp':v['hp'],'max_hp':v['hp'],'block':v['block'],'immue_damage':int(v['immune']),'PreventBeActiveDamage':int(v['preventEligible']),'PreventBeActiveDamageRetainHP':v['retainHp'],'be_damage_limit':v['limit'],'be_damage_statics':v['usedLimit'],'pvp_death_resist':v['deathResist']}
        props['PreventActiveDamage']=v.get('casterPrevention',0)
        props['PreventBeActiveDamage']=v.get('targetPrevention',props['PreventBeActiveDamage'])
        props.update(v.get('effectProperties',{}))
        self.getglobal(L,b'_hp_property');self.table(L,0,len(props))
        for key,value in props.items():self.number(L,value);self.setfield(L,-2,key.encode())
        self.setfield(L,-2,b'properties');self.top(L,0)
        self.getglobal(L,b'_behit_unit');self.getfield(L,-1,b'BeHit');self.getglobal(L,b'_behit_unit');self.table(L,0,6)
        for key,value in {'damageVal':v['damage'],'castRoleUid':9,'fromCmdServerUid':11}.items():self.number(L,value);self.setfield(L,-2,key.encode())
        self.boolean(L,False);self.setfield(L,-2,b'isCrit')
        self.enum('DamageType',v.get('damageType','Active'));self.setfield(L,-2,b'damageType')
        if v['puncture']:self.enum('DamageSubType','Puncture');self.setfield(L,-2,b'damageSubType')
        self.invoke_attack(v)
        fields=['changeVal','curHp','oldHp','immueDamage','realDamage','castDamage','blockedDamage','blockLose','overflowDamage','isBlockedDamage','isBlockedAllDamage','pvp_death_resist','isPreventActiveDamage','convertDamageVal']
        result={}
        for key in fields:
            self.getfield(L,-1,key.encode());kind=self.kind(L,-1)
            result[key]=bool(self.tobool(L,-1)) if kind==1 else self.tonumber(L,-1,None) if kind==3 else None
            self.top(L,-2)
        self.top(L,0);self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,b'block');result['blockAfter']=self.tonumber(L,-1,None)
        result['callbacks']=self.events
        return result

    def invoke_attack(self,v):
        self.check(self.call(self.state,2,1,0,0,None))

if __name__=='__main__':
    o=BeHitHpOracle()
    base=dict(damage=200,block=0,puncture=False,hp=100,immune=False,preventEligible=False,retainHp=0,limit=0,usedLimit=0,deathResist=0)
    changes=[{},dict(damage=0),dict(damage=.5),dict(damage=99.1),dict(block=50),dict(block=300),dict(block=300,puncture=True),dict(immune=True,block=50),dict(immune=True,puncture=True,block=50),dict(limit=33),dict(limit=33,usedLimit=30),dict(limit=33,usedLimit=40),dict(preventEligible=True,retainHp=40),dict(preventEligible=True,retainHp=40,limit=33),dict(preventEligible=True,retainHp=40,immune=True),dict(deathResist=1),dict(hp=1,deathResist=1),dict(hp=.5,damage=.25)]
    out={'scope':'Original BattleUnitBase.BeHit, ImmueDamage, BattleUnitUtil eligibility/shield/limits and BattlePropertyServer mutation. Explicit properties; owner and sender callbacks observed. Record, animation and DoDamageEvent are no-op spies; no event execution or gameplay validation.','sourceHashes':{name:o.assets[name+'.lua']['sha256'] for name in ['BattleUnitBase','BattleUnitUtil','BattlePropertyServer']},'fixtures':[{'input':{**base,**change},'expected':o.evaluate({**base,**change})} for change in changes]}
    (ROOT/'tests/synthetic/original-behit-hp.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(changes),'original BeHit/HP cases')
