"""Original target methods with card/Strike crit and target-slot eligibility."""
import ctypes as C
import json
import random
from target_runtime_oracle import TargetOracle, ROOT

class CardTargetOracle(TargetOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.rawseti=self.lib.lua_rawseti;self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawseti.restype=None
        self.getglobal(L,b'_oracle_actor')
        def actor(s):
            mapping={b'crit_damage':'awakerCritDamage',b'crit_damage_per':'critDamagePer',b'card_crit_damage':'awakerCardCritDamage',b'crit_damage_from_strikecard':'skillTypeCritDamage'}
            key=self.string(s,2,None)
            if key not in mapping:self.errors.append(repr(key));self.number(s,0)
            else:self.number(s,self.values[mapping[key]])
            return 1
        self.method('GetProperty',actor);self.top(L,0)
        self.getglobal(L,b'_oracle_target')
        def target(s):
            mapping={b'be_damage_per':'beDamagePer',b'be_damage_per2':'beDamagePer2',b'be_damage_per3':'beDamagePer3',b'be_damage_per4':'beDamagePer4',b'be_damage_per5':'beDamagePer5',b'vulnerable_per':'vulnerablePer',b'be_damage_plus':'beDamagePlus'}
            key=self.string(s,2,None)
            if key==b'block':self.number(s,self.values['block'])
            elif key in mapping:self.number(s,self.values[mapping[key]])
            else:self.errors.append(repr(key));self.number(s,0)
            return 1
        self.method('GetProperty',target);self.number(L,3);self.setfield(L,-2,b'uid');self.top(L,0)
        self.table(L,0,2)
        def card(s):
            key=self.string(s,2,None)
            mapping={b'crit_damage':'cardCritDamage',b'card_damage_per2block_barrier':'cardBlockBarrierPer'}
            if key not in mapping:self.errors.append(repr(key));self.number(s,0)
            else:self.number(s,self.values[mapping[key]])
            return 1
        self.method('GetProperty',card)
        def instruction(s):self.boolean(s,self.values['instruction']);return 1
        self.method('CardTypeMatch',instruction);self.setglobal(L,b'_target_card')
        self.getglobal(L,b'_oracle_engine')
        def obj(s):
            uid=self.tonumber(s,2,None)
            self.getglobal(s,b'_oracle_actor' if uid==1 else b'_target_card');return 1
        self.method('GetObj',obj)
        def noop(s):return 0
        self.method('Debug',noop)
        self.table(L,0,1);self.table(L,0,1);self.table(L,0,1);self.number(L,0);self.setfield(L,-2,b'Data');self.setfield(L,-2,b'card_damage_per2block_barrier');self.setfield(L,-2,b'BattleApi');self.setfield(L,-2,b'battleDT')
        def command(s):self.callback(noop);return 1
        self.method('GetCmdFunc',command)
        self.table(L,0,1)
        def barrier(s):self.boolean(s,self.values['barrier']);return 1
        self.method('HasStateByStateIds',barrier);self.setfield(L,-2,b'stateMgr');self.top(L,0)
        self.getglobal(L,b'_oracle_self');self.number(L,2);self.setfield(L,-2,b'cardUid')
        def tags(s):
            self.table(s,1,0);self.getglobal(s,b'_oracle_bc');self.getfield(s,-1,b'SkillType');self.getfield(s,-1,b'Card_Strike');self.setglobal(s,b'_target_tag');self.top(s,-3);self.getglobal(s,b'_target_tag');self.rawseti(s,-2,1);return 1
        self.method('GetSkillType',tags)
        def state(s):self.boolean(s,self.values['stateTriggerAdd']);return 1
        self.method('IsStateTriggerAdd',state);self.top(L,0)
        self.getglobal(L,b'table')
        def contains(s):self.boolean(s,False);return 1 # Strike-only scope, queried Ulti tag absent.
        self.method('contains',contains);self.top(L,0)

if __name__=='__main__':
    o=CardTargetOracle();old=json.loads((ROOT/'tests/synthetic/original-target-runtime.json').read_text());base=old['fixtures'][0]['input'];cases=[]
    for crit in [False,True]:
      for instruction in [False,True]:
       for trigger in [False,True]:
        for block,barrier in [(0,False),(10,False),(0,True),(10,True)]:
         cases.append((100,{**base,'isCrit':crit,'awakerCritDamage':150,'cardCritDamage':25,'awakerCardCritDamage':10,'skillTypeCritDamage':20,'critDamagePer':50,'beDamagePer4':99,'beDamagePer5':35,'cardBlockBarrierPer':30,'instruction':instruction,'stateTriggerAdd':trigger,'block':block,'barrier':barrier}))
    rng=random.Random(20260923)
    for _ in range(250):
        values={k:rng.choice([-25,0,0.1,25,150]) for k in base if k not in ['isCrit','enemyStateDmgMultiplier']}
        values.update(isCrit=rng.choice([False,True]),enemyStateDmgMultiplier=1,instruction=rng.choice([False,True]),stateTriggerAdd=rng.choice([False,True]),block=rng.choice([0,10]),barrier=rng.choice([False,True]))
        cases.append((rng.randint(1,100000),values))
    fixtures=[]
    for value,inputs in cases:
        expected=o.final_damage(value,inputs)
        resolved={k:inputs[k] for k in base};resolved['beDamagePer4']=0
        if inputs['stateTriggerAdd'] or not inputs['instruction']:resolved['beDamagePer5']=0
        if not inputs['block']>0 and not inputs['barrier']:resolved['cardBlockBarrierPer']=0
        fixtures.append(dict(showDamage=value,adapterInputs=inputs,input=resolved,expected=expected))
    (ROOT/'tests/synthetic/original-card-target.json').write_text(json.dumps({'scope':'Original target and helper methods; Strike-only card, ordinary subtype, synthetic eligibility flags; no HP or gameplay','sourceHash':o.assets['BattleCmdServer.lua']['sha256'],'fixtures':fixtures},indent=2),encoding='utf-8')
    print('Generated',len(fixtures),'original card/Strike target cases')
