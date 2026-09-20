"""Execute original BattleCmdServer critical-hit methods with synthetic adapters."""
import ctypes as C
import json
import random
from runtime_oracle import Oracle, ROOT


class CritOracle(Oracle):
    def __init__(self):
        super().__init__()
        self.callbacks=[]
        self.errors=[]
        self.values={}
        self.boolean=self.lib.lua_pushboolean
        self.boolean.argtypes=[C.c_void_p,C.c_int]
        self.toboolean=self.lib.lua_toboolean
        self.toboolean.argtypes=[C.c_void_p,C.c_int]
        self.toboolean.restype=C.c_int
        self.nil=self.lib.lua_pushnil
        self.nil.argtypes=[C.c_void_p]
        L=self.state

        def callback(fn):
            wrapped=C.CFUNCTYPE(C.c_int,C.c_void_p)(fn)
            self.callbacks.append(wrapped)
            self.pushclosure(L,wrapped,0)
        def method(name,fn):
            callback(fn);self.setfield(L,-2,name.encode())
        def new_class(s):
            self.table(s,0,100);self.table(s,0,0);return 2
        self.getglobal(L,b'_oracle_config_system');method('NewClass',new_class);self.top(L,0)

        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util'}
            if name in known:self.getglobal(s,known[name])
            elif name in [b'Battle.Ecs.BattleComponent',b'Battle.DbgEngine.Cmd.BattleCmdParser']:self.table(s,0,0)
            else:self.errors.append('Unexpected dependency: '+repr(name));self.nil(s)
            return 1
        callback(require);self.setglobal(L,b'require')
        self.getglobal(L,b'table')
        def contains(s):
            needle=self.string(s,2,None).decode()
            self.boolean(s,1 if needle in self.values.get('tags',[]) else 0);return 1
        method('contains',contains);self.top(L,0)
        self.module('BattleCmdServer');self.setglobal(L,b'_oracle_cmd');self.top(L,0)

        def prop(owner):
            def get(s):
                key=self.string(s,2,None).decode()
                self.number(s,self.values[owner].get(key,0));return 1
            return get
        def role(name,is_awaker=False,player=False):
            self.table(L,0,5);method('GetProperty',prop(name))
            def is_role(s):self.boolean(s,1 if self.values['casterIsAwaker'] and is_awaker else 0);return 1
            method('IsRoleType',is_role)
            if player:
                def get_player(s):self.getglobal(s,b'_oracle_player');return 1
                method('GetPlayer',get_player)
            self.setglobal(L,('_oracle_'+name).encode())
        role('player')
        role('caster',True,True)
        role('card')
        role('target')

        self.table(L,0,1)
        def rand(s):self.number(s,self.values['roll']);return 1
        method('random',rand);self.setglobal(L,b'_oracle_rand')
        self.table(L,0,4)
        def get_obj(s):
            uid=int(self.tonumber(s,2,None))
            if uid==1:self.getglobal(s,b'_oracle_caster')
            elif uid==2 and self.values['cardPresent']:self.getglobal(s,b'_oracle_card')
            else:self.nil(s)
            return 1
        method('GetObj',get_obj)
        self.getglobal(L,b'_oracle_rand');self.setfield(L,-2,b'rand')
        self.setglobal(L,b'_oracle_engine')

        self.table(L,0,10)
        self.getglobal(L,b'_oracle_engine');self.setfield(L,-2,b'battleEngine')
        self.number(L,1);self.setfield(L,-2,b'castRoleUid')
        def skill_types(s):
            tags=self.values['tags'];self.table(s,len(tags),0)
            for i,tag in enumerate(tags,1):self.string_push(s,tag.encode());self.rawseti(s,-2,i)
            return 1
        # Bind original critical helpers, and replace only the contextual tag getter.
        for name in ['CalcCrit','__CalcCardCrit','__CalcAwakerCrit']:
            self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        method('GetSkillType',skill_types)
        self.setglobal(L,b'_oracle_self')

    def run(self,values):
        self.values=values;self.errors.clear();L=self.state;self.top(L,0)
        if values['cardPresent']:
            self.getglobal(L,b'_oracle_self');self.number(L,2);self.setfield(L,-2,b'cardUid');self.top(L,0)
        else:
            self.getglobal(L,b'_oracle_self');self.nil(L);self.setfield(L,-2,b'cardUid');self.top(L,0)
        self.getglobal(L,b'_oracle_self');self.getfield(L,-1,b'CalcCrit');self.getglobal(L,b'_oracle_self');self.getglobal(L,b'_oracle_target')
        self.check(self.call(L,2,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return bool(self.toboolean(L,-1))


if __name__=='__main__':
    oracle=CritOracle()
    # Add API bindings needed to build Lua tag arrays.
    oracle.string_push=oracle.lib.lua_pushstring;oracle.string_push.argtypes=[C.c_void_p,C.c_char_p]
    oracle.rawseti=oracle.lib.lua_rawseti;oracle.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
    neutral={'tags':[],'cardPresent':False,'casterIsAwaker':False,'caster':{},'player':{},'target':{},'card':{},'roll':50}
    cases=[]
    def add(name,**updates):
        value={**neutral,**updates};value={k:(dict(v) if isinstance(v,dict) else list(v) if isinstance(v,list) else v) for k,v in value.items()}
        cases.append({'id':name,'input':value,'expected':oracle.run(value)})
    add('zero')
    add('chance-equal-roll',caster={'crit':49.1},roll=50)
    add('chance-below-roll',caster={'crit':49},roll=50)
    add('scaled-and-anti',caster={'crit':50,'crit_per':50},target={'anti_crit':25},roll=50)
    add('card-certain',cardPresent=True,card={'card_certain_crit':1},roll=100)
    add('card-block',cardPresent=True,card={'card_crit2block':1},target={'block':1},roll=100)
    add('caster-certain',casterIsAwaker=True,caster={'certain_crit':1},target={'hp':100,'max_hp':100},roll=100)
    add('strike-certain',casterIsAwaker=True,tags=['Card_Strike'],caster={'crit_from_strikecard':1},target={'hp':100,'max_hp':100},roll=100)
    add('caster-block',casterIsAwaker=True,caster={'crit2block':1},target={'block':1,'hp':100,'max_hp':100},roll=100)
    add('greater-hp',casterIsAwaker=True,caster={'crit2gt_hp_per':0.5},target={'hp':51,'max_hp':100},roll=100)
    add('lower-hp',casterIsAwaker=True,caster={'crit2lt_hp_per':0.5},target={'hp':49,'max_hp':100},roll=100)
    add('player-certain',player={'certain_crit':1},roll=100)
    add('all-additive',cardPresent=True,casterIsAwaker=True,tags=['Card_Strike','Ulti_Skill'],caster={'crit':10,'card_crit':10,'crit_per_from_strikecard':10,'crit_per_from_ulti':10,'crit_per':25},player={'crit':10},target={'hp':100,'max_hp':100,'anti_crit':10},card={'crit':10},roll=65)
    rng=random.Random(20260919)
    for i in range(250):
        awaker=bool(rng.randrange(2));card=bool(rng.randrange(2));tags=rng.sample(['Card_Strike','Card_Skill','Ulti_Skill','Card_AttachPost'],rng.randrange(5))
        value={**neutral,'casterIsAwaker':awaker,'cardPresent':card,'tags':tags,'roll':rng.randint(1,100),
          'caster':{k:rng.choice([0,0,0,0.1,1,10,25,50,100]) for k in ['certain_crit','crit_from_strikecard','crit2block','crit2gt_hp_per','crit2lt_hp_per','crit','card_crit','crit_per_from_strikecard','crit_per_from_ulti','crit_per']},
          'player':{k:rng.choice([0,0,10,25]) for k in ['certain_crit','crit']},
          'target':{'block':rng.choice([0,0,1,20]),'hp':rng.randint(1,100),'max_hp':100,'anti_crit':rng.choice([0,10,25,50])},
          'card':{k:rng.choice([0,0,0,1,10,25,50]) for k in ['card_crit2block','card_certain_crit','crit']} if card else {}}
        cases.append({'id':f'random-{i}','input':value,'expected':oracle.run(value)})
    result={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'PC-res144-build51','sourceHash':oracle.assets['BattleCmdServer.lua']['sha256'],'scope':'Original CalcCrit and both certain-crit helpers; explicit synthetic role/property/tag/RNG adapters; no PRNG algorithm/state or gameplay','fixtures':cases}
    (ROOT/'tests/synthetic/original-crit-resolution.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print('Wrote',len(cases),'original critical-hit cases')
