"""Original post-damage trigger handlers with explicit TryTrigger eligibility."""
import ctypes as C
import json
from behit_hp_oracle import BeHitHpOracle, ROOT
class DamageTriggerOracle(BeHitHpOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.rawgeti=self.lib.lua_rawgeti;self.rawgeti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawgeti.restype=C.c_int
        self.table(L,0,0);self.setglobal(L,b'_trigger_base')
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.State.Trigger.BattleStateTriggerServer':b'_trigger_base'}
            if name in known:self.getglobal(s,known[name])
            elif name==b'Battle.DbgEngine.Event.BattleLogicEvent':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        for name in ['BSTAfterBeActiveDamage','BSTAfterPassiveDamage','BSTAfterFixedDamage','BSTAfterAttackedByTentacle']:
            self.module(name);self.setglobal(L,name.encode())
        for uid in [7,9]:
            self.table(L,0,2);self.number(L,uid);self.setfield(L,-2,b'uid')
            def camp(s):self.number(s,2);return 1
            self.method('GetCamp',camp);self.setglobal(L,('role'+str(uid)).encode())
        if self.errors:raise RuntimeError(self.errors)
    def run_handler(self,v,payload_global=None):
        L=self.state;self.top(L,0);self.result=None;self.eligibilityCalls=[]
        self.table(L,0,4)
        self.table(L,0,1);self.enum('DamageTriggerType',v['mode']);self.setfield(L,-2,b'triggerPara');self.setfield(L,-2,b'cbParams')
        def eligible(s):
            self.eligibilityCalls.append([self.tonumber(s,2,None),self.tonumber(s,3,None)])
            self.boolean(s,v['eligible']);return 1
        def trigger(s):
            self.pushvalue(s,2);self.setglobal(s,b'_original_trigger_payload')
            row={}
            for key in ['triggerValue','triggerValue2','triggerValue3']:
                self.getfield(s,2,key.encode())
                if self.kind(s,-1)==3:row[key]=self.tonumber(s,-1,None)
                self.top(s,-2)
            for key in ['associator','associator2']:
                self.getfield(s,2,key.encode())
                if self.kind(s,-1)==5:
                    self.rawgeti(s,-1,1)
                    if self.kind(s,-1)==5:
                        self.getfield(s,-1,b'uid');row[key]=[self.tonumber(s,-1,None)];self.top(s,-2)
                    self.top(s,-2)
                self.top(s,-2)
            self.result=row;return 0
        self.method('TryTrigger',eligible);self.method('Trigger',trigger)
        self.table(L,0,1)
        def obj(s):self.getglobal(s,('role'+str(int(self.tonumber(s,2,None)))).encode());return 1
        self.method('GetObj',obj);self.setfield(L,-2,b'battleEngine');self.setglobal(L,b'_trigger_self')
        self.getglobal(L,v['handler'].encode());self.getfield(L,-1,b'OnAttackedByTentacle' if v['handler']=='BSTAfterAttackedByTentacle' else b'OnBeDamage');self.getglobal(L,b'_trigger_self')
        if payload_global is not None:
            self.getglobal(L,payload_global)
            if self.kind(L,-1)!=5:raise ValueError('Expected original hit payload table')
        else:
            self.table(L,0,8)
            for key,value in {'targetRoleUid':7,'castRoleUid':9,'castDamage':v['castDamage'],'realDamage':v['realDamage'],'unBlockedDamage':v['unBlockedDamage'],'blockedDamage':v['blockedDamage']}.items():
                self.number(L,value);self.setfield(L,-2,key.encode())
            self.enum('DamageType',v['category']);self.setfield(L,-2,b'damageType')
            self.boolean(L,v['crit']);self.setfield(L,-2,b'isCrit')
        self.check(self.call(L,2,0,0,0,None))
        return {'trigger':self.result,'eligibilityCalls':self.eligibilityCalls}
if __name__=='__main__':
    o=DamageTriggerOracle();fixtures=[]
    base=dict(castDamage=200,realDamage=20,unBlockedDamage=20,blockedDamage=180,crit=False,eligible=True)
    for handler in ['BSTAfterBeActiveDamage','BSTAfterPassiveDamage','BSTAfterFixedDamage','BSTAfterAttackedByTentacle']:
        for category in ['Active','Passive','Fixed','Pure','Tentacle']:
            for mode in ['None','Unblocked','CritDamage']:
                for change in [{},dict(realDamage=0,unBlockedDamage=0),dict(crit=True,realDamage=0),dict(eligible=False)]:
                    v={**base,**change,'handler':handler,'category':category,'mode':mode}
                    fixtures.append({'input':v,'expected':o.run_handler(v)})
    names=['BSTAfterBeActiveDamage','BSTAfterPassiveDamage','BSTAfterFixedDamage','BSTAfterAttackedByTentacle']
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original handler bodies; target/caster lookup and TryTrigger result supplied; Trigger payload captured. Direct calls include mismatched event categories to probe filtering; no registration, generic trigger eligibility, command execution or gameplay validation.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in names},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-damage-triggers.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original damage-trigger cases')
