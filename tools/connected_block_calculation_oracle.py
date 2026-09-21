"""Original GetRealBlock over the ordinary Camp1 PvE Awakener/card branch."""
import ctypes as C
import json
import random
from target_runtime_oracle import TargetOracle, ROOT


class BlockOracle(TargetOracle):
    def __init__(self, asset_overrides=None):
        super().__init__(asset_overrides)

    def run(self, case):
        L=self.state;self.top(L,0);self.errors.clear();reads=[]
        rawset=self.lib.lua_rawseti;rawset.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        push=self.lib.lua_pushstring;push.argtypes=[C.c_void_p,C.c_char_p]

        def obj(name, properties):
            self.table(L,0,8)
            def prop(s):
                key=self.string(s,2,None).decode();reads.append({'owner':name,'property':key})
                self.number(s,properties.get(key,0));return 1
            self.method('GetProperty',prop)
            if name=='caster':self.method('IsRoleType',self.true)
            if name=='card':
                def match(s):self.boolean(s,case['instructionCard']);return 1
                self.method('CardTypeMatch',match)
            self.setglobal(L,('_block_'+name).encode())
        obj('caster',case['casterProperties']);obj('player',case['playerProperties']);obj('card',case['cardProperties']);obj('target',case['targetProperties'])

        self.table(L,0,3)
        def player(s):self.getglobal(s,b'_block_player');return 1
        self.method('GetPlayer',player);self.setglobal(L,b'_block_role_mgr')
        self.table(L,0,8);self.getglobal(L,b'_block_role_mgr');self.setfield(L,-2,b'roleMgr')
        def lookup(s):
            uid=self.tonumber(s,2,None)
            self.getglobal(s,b'_block_caster' if uid==1 else b'_block_card');return 1
        self.method('GetObj',lookup);self.method('IsPVE',self.true)
        def false(s):self.boolean(s,0);return 1
        self.method('IsPVP',false)
        def debug(s):return 0
        self.method('Debug',debug);self.setglobal(L,b'_block_engine')

        self.table(L,0,16);self.getglobal(L,b'_block_engine');self.setfield(L,-2,b'battleEngine');self.number(L,1);self.setfield(L,-2,b'castRoleUid');self.number(L,2);self.setfield(L,-2,b'cardUid')
        for method in ['__GetShowBlock','__GetFinalBlock']:
            self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,method.encode());self.setfield(L,-3,method.encode());self.top(L,-2)
        def camp(s):self.number(s,1);return 1
        def dimension(s):self.number(s,case['playerProperties'].get('dimension_fix_per',0));return 1
        def tags(s):
            self.table(s,0,0)
            for i,tag in enumerate(case['skillTags'],1):push(s,tag.encode());rawset(s,-2,i)
            return 1
        def plus(s):self.number(s,case['skillArgsPlus']);return 1
        def no_state(s):self.boolean(s,0);return 1
        def no_keeper(s):self.number(s,0);self.number(s,0);self.number(s,0);return 3
        self.method('GetCasterCamp',camp);self.method('GetDimensionFixPer',dimension);self.method('GetSkillType',tags);self.method('GetSkillArgsPlus',plus);self.method('IsStateTriggerAdd',no_state);self.method('GetNewChaosKeeperskillParams',no_keeper);self.setglobal(L,b'_block_self')

        self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'GetRealBlock');self.getglobal(L,b'_block_self');self.number(L,case['base']);self.getglobal(L,b'_block_target');self.nil(L);self.nil(L)
        self.check(self.call(L,5,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return {'value':self.tonumber(L,-1,None),'propertyReads':reads}


if __name__=='__main__':
    oracle=BlockOracle();rng=random.Random(20260922);fixtures=[]
    properties=['o_block_per','i_block_per','block_plus','block_per_defendcard','i_block_per_defendcard','block_per_card','instructcard_final_block_per','card_block_per2_n2','awaker_CmdCard_block_per','spellbound_block_per','spellbound_block_per2','spellbound_block_per3','spellbound_block_per4','spellbound_block_per5']
    card_properties=['card_block_per','card_block_per2','card_block_plus']
    player_properties=['frail_per','block_plus','dimension_fix_per']
    target_properties=['gain_block_per','gain_block_plus']
    cases=[{'base':10,'skillArgsPlus':0,'instructionCard':True,'skillTags':['Card_Defend'],'casterProperties':{},'playerProperties':{},'cardProperties':{},'targetProperties':{}}]
    choices=[-50,-25,0,0.1,5,20,50,100]
    for _ in range(255):
        case={'base':rng.choice([0,0.1,10,100,999.5]),'skillArgsPlus':rng.choice([0,1,10.2]),'instructionCard':True,'skillTags':['Card_Defend'],'casterProperties':{},'playerProperties':{},'cardProperties':{},'targetProperties':{}}
        for key in rng.sample(properties,rng.randint(0,len(properties))):case['casterProperties'][key]=rng.choice(choices)
        for key in rng.sample(card_properties,rng.randint(0,len(card_properties))):case['cardProperties'][key]=rng.choice(choices)
        for key in rng.sample(player_properties,rng.randint(0,len(player_properties))):case['playerProperties'][key]=rng.choice(choices)
        for key in rng.sample(target_properties,rng.randint(0,len(target_properties))):case['targetProperties'][key]=rng.choice(choices)
        cases.append(case)
    output={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in ['BattleCmdServer','BattleUtilServer','BattleConst']},'scope':'256 original GetRealBlock cases through the ordinary Camp1 PvE Awakener instruction-card branch with Card_Defend tag, explicit complete property adapters and ParaPlus. No effect repetition, Block storage/events, command lifecycle or gameplay.','fixtures':[{'input':case,'expected':oracle.run(case)} for case in cases]}
    (ROOT/'tests/synthetic/original-connected-block-calculation.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(output['fixtures']),'connected original Block calculation cases')
