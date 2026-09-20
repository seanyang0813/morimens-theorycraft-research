"""Original effect death predicate; explicit caster/state/player object adapters."""
import ctypes as C
import json
from passive_runtime_oracle import PassiveOracle, ROOT
class DeathConditionOracle(PassiveOracle):
    def __init__(self):
        super().__init__()
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
    def run_condition(self,v):
        L=self.state;self.top(L,0)
        self.getglobal(L,b'_passive_base');self.getfield(L,-1,b'__CheckDeadCondition');self.table(L,0,3)
        self.table(L,0,1);self.boolean(L,v['ignoreDead']);self.setfield(L,-2,b'ignoreDead');self.setfield(L,-2,b'triggerData')
        self.table(L,0,3);self.number(L,1);self.setfield(L,-2,b'castRoleUid')
        if v['fromSkill']:self.number(L,10);self.setfield(L,-2,b'skillConfigId')
        if v['fromState']:self.number(L,2);self.setfield(L,-2,b'stateUid')
        self.setfield(L,-2,b'cmdServer');self.table(L,0,2)
        def pve(s):self.boolean(s,v['pve']);return 1
        def player(s,kind):
            status=v[kind]
            if status=='missing':self.nil(s);return 1
            self.table(s,0,1)
            def dead(t):self.boolean(t,status=='dead');return 1
            self.method('IsDead',dead);return 1
        def caster_player(s):return player(s,'casterPlayer')
        def state_player(s):return player(s,'statePlayer')
        def obj(s):
            uid=self.tonumber(s,2,None)
            if uid==1:
                if not v['casterExists']:self.nil(s);return 1
                self.table(s,0,1);self.method('GetPlayer',caster_player);return 1
            if not v['stateExists']:self.nil(s);return 1
            self.table(s,0,1)
            if v['stateOwnerExists']:
                self.table(s,0,1);self.method('GetPlayer',state_player);self.setfield(s,-2,b'owner')
            return 1
        self.method('IsPVE',pve);self.method('GetObj',obj);self.setfield(L,-2,b'battleEngine')
        self.check(self.call(L,1,2,0,0,None))
        reason=self.string(L,-1,None)
        return {'allowed':bool(self.tobool(L,-2)),'reason':reason.decode() if reason else None}
if __name__=='__main__':
    o=DeathConditionOracle();base=dict(ignoreDead=False,pve=True,fromSkill=False,fromState=True,casterExists=True,casterPlayer='alive',stateExists=True,stateOwnerExists=True,statePlayer='alive')
    changes=[{},dict(statePlayer='dead'),dict(statePlayer='missing'),dict(stateExists=False),dict(stateOwnerExists=False),dict(ignoreDead=True,stateExists=False,casterExists=False),dict(fromState=False,casterExists=False),dict(fromSkill=True,fromState=False,casterPlayer='dead'),dict(fromSkill=True,fromState=False,casterPlayer='missing'),dict(fromSkill=True,fromState=False,casterExists=False),dict(fromSkill=True,casterPlayer='dead',statePlayer='dead'),dict(fromSkill=True,casterPlayer='alive',statePlayer='dead'),dict(pve=False,statePlayer='dead'),dict(pve=False,casterExists=False),dict(pve=False,ignoreDead=True,casterExists=False)]
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original __CheckDeadCondition with explicit object/GetPlayer/dead adapters. Does not execute earlier TryDoEffect caster-presence check, CheckCondition, target selection or gameplay.','sourceHash':o.assets['BattleEffectServer.lua']['sha256'],'fixtures':[{'input':{**base,**c},'expected':o.run_condition({**base,**c})} for c in changes]}
    (ROOT/'tests/synthetic/original-effect-death-condition.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(changes),'original effect death-condition cases')
