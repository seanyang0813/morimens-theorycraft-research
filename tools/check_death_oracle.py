"""Original CheckDeathEvent with observed CreateEffect requests, not effect execution."""
import json
from damage_events_oracle import DamageEventsOracle, ROOT
class CheckDeathOracle(DamageEventsOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.getglobal(L,b'_damage_event_unit');self.number(L,7);self.setfield(L,-2,b'uid')
        def pre(s):self.boolean(s,self.v['eligible']);return 1
        def dead(s):self.boolean(s,self.v['dead']);return 1
        self.method('PreCheckDeathEvent',pre);self.method('IsDead',dead)
        self.getfield(L,-1,b'battleEngine');self.table(L,0,1)
        def create(s):
            row={}
            for name in ['effectType','roleUid','castRoleUid','fromCmdServerUid','hpChangeReason','castDamage','overflowDamage']:
                self.getfield(s,2,name.encode())
                if self.kind(s,-1)==3:row[name]=self.tonumber(s,-1,None)
                elif self.kind(s,-1)==4:row[name]=self.string(s,-1,None).decode()
                self.top(s,-2)
            if 'effectType' not in row:self.errors.append('Missing effectType');return 0
            self.created.append(row)
            if self.v['healOnFirstCreate'] and len(self.created)==1:self.hp=25
            return 0
        self.method('CreateEffect',create);self.setfield(L,-2,b'effectMgr');self.top(L,0)
    def evaluate_check(self,v):
        self.v=v;self.hp=v['hp'];self.created=[];L=self.state;self.top(L,0)
        self.getglobal(L,b'_original_check_death_event');self.getglobal(L,b'_damage_event_unit')
        for x in [9,11,3]:self.number(L,x)
        if v['withPayload']:
            self.table(L,0,2)
            self.number(L,200);self.setfield(L,-2,b'castDamage')
            self.number(L,75);self.setfield(L,-2,b'overflowDamage')
        else:self.nil(L)
        self.check(self.call(L,5,0,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return self.created
if __name__=='__main__':
    o=CheckDeathOracle();base=dict(eligible=True,dead=False,hp=0,withPayload=True,healOnFirstCreate=False)
    changes=[{},dict(eligible=False),dict(dead=True),dict(hp=1),dict(hp=-1),dict(withPayload=False),dict(healOnFirstCreate=True)]
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original CheckDeathEvent; eligibility/dead/HP supplied, CreateEffect requests observed; optional immediate HP response probes absence of a second guard. No scheduler or death effect execution.','sourceHash':o.assets['BattleUnitBase.lua']['sha256'],'fixtures':[{'input':{**base,**c},'expected':o.evaluate_check({**base,**c})} for c in changes]}
    (ROOT/'tests/synthetic/original-check-death.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(changes),'original death-check cases')
