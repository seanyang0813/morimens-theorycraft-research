"""Original DoDamageEvent routing with observational event hooks and controlled death-check HP."""
import json
from behit_hp_oracle import BeHitHpOracle, ROOT

class DamageEventsOracle(BeHitHpOracle):
    def __init__(self):
        super().__init__();L=self.state
        known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util',b'Battle.DbgEngine.Cmd.BattleCmdServer':b'_oracle_cmd',b'Battle.DbgEngine.BattlePropertyServer':b'_hp_property',b'Battle.Util.BattleUnitUtil':b'_behit_util',b'Battle.DbgEngine.Event.BattleLogicEvent':b'_damage_events'}
        empty={b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.DataCenter.BattleRoleData',b'Battle.DbgEngine.Role.Component.TagManagerComp'}
        def require(s):
            name=self.string(s,1,None)
            if name in known:self.getglobal(s,known[name])
            elif name in empty:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        self.module('BattleLogicEvent');self.setglobal(L,b'_damage_events')
        names=['DoPreventedActiveDamage','PreventBeActiveDamage','DoDamage','TentacleAttack','AttackedByTentacle','DoTentacleDamage','BeDamage','PVPDeathResist','ActiveDamageKill','FixedDamageKill','CritKill','FightBackKill']
        self.names={}
        for name in names:
            self.getglobal(L,b'_damage_events');self.getfield(L,-1,name.encode());self.names[self.tonumber(L,-1,None)]=name;self.top(L,0)
        self.getglobal(L,b'_oracle_util')
        def fightback(s):self.boolean(s,self.v['fightBack']);return 1
        self.method('IsFightBackState',fightback);self.top(L,0)
        self.module('BattleUnitBase');self.setglobal(L,b'_damage_event_unit')
        self.getglobal(L,b'_damage_event_unit')
        self.getfield(L,-1,b'CheckDeathEvent');self.setglobal(L,b'_original_check_death_event')
        def property(s):self.number(s,self.hp);return 1
        def death(s):
            self.trace.append('CheckDeathEvent')
            if self.v['hpAfterDeathCheck'] is not None:self.hp=self.v['hpAfterDeathCheck']
            return 0
        self.method('GetProperty',property);self.method('CheckDeathEvent',death)
        self.table(L,0,2)
        def finished(s):self.boolean(s,self.v['battleFinished']);return 1
        def event(s):self.trace.append(self.names[self.tonumber(s,2,None)]);return 0
        self.method('IsBattleFinish',finished);self.method('CreateEventEffect',event)
        self.setfield(L,-2,b'battleEngine');self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)

    def evaluate_events(self,v):
        self.v=v;self.hp=v['hp'];self.trace=[];L=self.state;self.top(L,0)
        self.getglobal(L,b'_damage_event_unit');self.getfield(L,-1,b'DoDamageEvent');self.getglobal(L,b'_damage_event_unit');self.table(L,0,4)
        self.enum('DamageType',v['category']);self.setfield(L,-2,b'damageType')
        for key,source in [('isPreventActiveDamage','prevented'),('pvp_death_resist','deathResist'),('isCrit','crit')]:
            self.boolean(L,v[source]);self.setfield(L,-2,key.encode())
        self.check(self.call(L,2,0,0,0,None))
        return {'trace':self.trace,'hpAfter':self.hp}

if __name__=='__main__':
    o=DamageEventsOracle();fixtures=[]
    base=dict(hp=100,hpAfterDeathCheck=None,battleFinished=False,prevented=False,deathResist=False,crit=False,fightBack=False)
    changes=[{},dict(hp=0),dict(hp=0,crit=True,fightBack=True),dict(hp=0,hpAfterDeathCheck=10,crit=True,fightBack=True),dict(hp=100,hpAfterDeathCheck=0),dict(prevented=True,deathResist=True),dict(battleFinished=True,hp=0)]
    for category in ['Active','Passive','Fixed','Pure','Tentacle']:
        for change in changes:
            v={**base,**change,'category':category};fixtures.append({'input':v,'expected':o.evaluate_events(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original DoDamageEvent; event creation observed, CheckDeathEvent replaced by explicit HP response, fightback predicate supplied. No listeners, scheduler or actual death execution. Some flag combinations intentionally exercise routing only and are not reachable standard effect outputs.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleUnitBase','BattleLogicEvent']},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-damage-events.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original damage-event routing cases')
