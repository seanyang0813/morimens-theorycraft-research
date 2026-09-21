"""Original offensive setup with synthetic non-Awake card instances."""
import random
import json
from offensive_setup_oracle import SetupOracle, ROOT

class CardSetupOracle(SetupOracle):
    def __init__(self, asset_overrides=None):
        super().__init__(asset_overrides);L=self.state
        self.getglobal(L,b'table')
        def contains(s):
            # The tested tag sets explicitly exclude Card_Awake.
            self.boolean(s,False);return 1
        self.method('contains',contains);self.top(L,0)
        self.table(L,0,2)
        def prop(s):
            key=self.string(s,2,None)
            if key is None:self.errors.append('Unmapped card property');self.number(s,0)
            else:self.number(s,self.values['card'].get(key.decode(),0))
            return 1
        self.method('GetProperty',prop)
        def kind(s):self.boolean(s,self.values['instructionCard']);return 1
        self.method('CardTypeMatch',kind);self.setglobal(L,b'_setup_card')
        self.getglobal(L,b'_setup_engine')
        def obj(s):
            uid=self.tonumber(s,2,None)
            if uid==1:self.getglobal(s,b'_setup_actor')
            elif uid==2:self.getglobal(s,b'_setup_card')
            else:self.nil(s)
            return 1
        self.method('GetObj',obj);self.top(L,0)
        self.getglobal(L,b'_setup_self');self.number(L,2);self.setfield(L,-2,b'cardUid')
        def state(s):self.boolean(s,self.values['stateTriggerAdd']);return 1
        self.method('IsStateTriggerAdd',state);self.top(L,0)

if __name__=='__main__':
    oracle=CardSetupOracle();cases=[]
    base=dict(value=23,caster={},player={},tags=['Card_Strike'],dimensionFixPer=0,skillArgsPlus=0,card={},instructionCard=True,stateTriggerAdd=False)
    for cap in [-1,0,20,35,50]:
        for strength in [-10,0,50]:
            for special in [False,True]:
                cases.append({**base,'caster':{'o_damage_per_strikecard':35,'strikecard_damage_plus':653,'card_damage_per3_n2':34,'awaker_CmdCard_dmg_per':25},'player':{'damage_plus':strength},'card':{'o_damage_per_strikecard_limit':cap,'card_strength_multiple':50,'card_damage_per3':25},'stateTriggerAdd':special})
    rng=random.Random(20260922)
    cprops=['o_damage_per_strikecard','i_damage_per_strikecard','strikecard_damage_plus','i_damage_per_card','o_damage_per_card','awaker_CmdCard_dmg_per','card_damage_per3_n2','damage_plus','awaker_strength_multiple','awaker_dmg_power_per_scale','ulti_strength_multiple','awaker_ulti_dmg_per']
    props=['card_damage_per','card_damage_plus','card_strength_multiple','card_damage_per2','card_damage_per3','o_damage_per_strikecard_limit']
    for _ in range(300):
        cases.append({**base,'value':rng.uniform(0,2000),'caster':{k:rng.choice([-25,0,10,35,100]) for k in cprops},'player':{'damage_plus':rng.choice([-20,0,50])},'card':{k:rng.choice([-25,0,10,35,100]) for k in props},'tags':rng.choice([['Card_Strike'],['Card_Skill','Card_Strike'],['Card_Strike','Card_AttachPost'],['Ulti_Skill']]),'instructionCard':rng.choice([False,True]),'stateTriggerAdd':rng.choice([False,True])})
    out={'build':'pc-res144-build51','scope':'Synthetic PvE Awakener with explicit card and instruction-card flag; non-Awake tags, ordinary formula subtype; explicit state-trigger-add flag; not property restoration, targeting or HP','sourceHashes':{n:oracle.assets[n+'.lua']['sha256'] for n in ['BattleCmdServer','BattleUtilServer','BattleConst']},'fixtures':[{'input':v,'expected':oracle.evaluate(v)} for v in cases]}
    (ROOT/'tests/synthetic/original-card-setup.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
    print('Generated',len(cases),'original card-setup cases')
