"""Original BeHit eligibility plus retain-HP effects with explicit properties."""
import itertools
import json
from behit_hp_oracle import BeHitHpOracle, ROOT
oracle=BeHitHpOracle()
base=dict(damage=200,block=50,puncture=False,hp=100,immune=False,preventEligible=False,retainHp=90,limit=0,usedLimit=0,deathResist=0)
fixtures=[]
for category, exists, immune, caster, target in itertools.product(['Active','Passive','Fixed','Pure','Tentacle'],[False,True],[False,True],[-1,0,.1],[-1,0,.1]):
    v={**base,'damageType':category,'casterExists':exists,'immune':immune,'casterPrevention':caster,'targetPrevention':target}
    fixtures.append({'input':v,'expected':oracle.evaluate(v)})
out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original BeHit/CheckPreventActiveDamage and HP helpers. Caster lookup is explicitly present or absent; when present the adapter uses one property table for both roles with independent caster and target prevention keys. No events, animation, records or gameplay validation.','sourceHashes':{n:oracle.assets[n+'.lua']['sha256'] for n in ['BattleUnitBase','BattleUnitUtil','BattlePropertyServer']},'fixtures':fixtures}
(ROOT/'tests/synthetic/original-prevention.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Generated',len(fixtures),'original prevention/HP cases')
