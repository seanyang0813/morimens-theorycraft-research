"""Synthetic arithmetic comparisons, not observed game events."""
from runtime_oracle import Oracle, ROOT
import random, json, hashlib

rng=random.Random(20260919)
oracle=Oracle()
keys=['awakerOutsideDamagePer','awakerInsideBasicDamagePer','playerOutsideDamagePer','cardOutsideDmgPer','curCardDamagePer','basicDamagePer','cardDamagePlus','strength','ultiDamgePlus','strikecard_damage_plus','skillArgsPlus','awakerDamagePlus','roleEnhancePer','roleWeakPer','awakerInsideDamagePer']+[f'awakerInsideDamagePer{i}' for i in range(1,9)]+['playerInsideDamagePer','dimension_fix_per','cardInsideDmgPer','cardDamagePer2','cardDamagePer3','card_damage_per3_n2','awaker_CmdCard_dmg_per','awaker_ulti_dmg_per','spellboundDmgPer','spellboundDmgPer2','spellboundDmgPer3','spellboundDmgPer4','spellboundDmgPer5']
neutral={**dict.fromkeys(keys,0),'value':100,'skillTypeOutsideDmgPer':1,'skillTypeDmgPer':1,'skillTypeInsideDmgPer':1}
cases=[('baseline',neutral)]
for key in keys:
    for value in [-100,-25,0.1,20,25,100,200]:
        cases.append((f'{key}={value}',{**neutral,key:value}))
for value in [0,-1,1,1.000001,1.000009,1.000011,99.999999,100.000009,100.000011]:
    cases.append((f'rounding-{value}',{**neutral,'value':value}))
for i in range(2000):
    data=neutral.copy()
    data['value']=rng.choice([rng.uniform(0,1000),rng.randint(1,1000)])
    for key in rng.sample(keys,rng.randint(1,12)):
        data[key]=rng.choice([-50,-25,0.1,3,12.5,20,25,33.333,50,100,150])
    cases.append((f'random-{i}',data))
fixtures=[{'id':name,'input':data,'expected':oracle.damage(data)} for name,data in cases]
out=ROOT/'tests/synthetic/original-runtime.json';out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'PC-res144-build51','sourceHash':oracle.assets['BattleUtilServer.lua']['sha256'],'fixtures':fixtures},indent=2),encoding='utf-8')
print(f'Wrote {len(fixtures)} synthetic fixtures to {out}')
