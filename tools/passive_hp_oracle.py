"""Exercise original BeHit's Passive branch with explicit property adapters."""
import json
from behit_hp_oracle import BeHitHpOracle, ROOT
o=BeHitHpOracle()
base=dict(damageType='Passive',damage=200,block=0,puncture=False,hp=100,immune=False,preventEligible=False,retainHp=0,limit=0,usedLimit=0,deathResist=0)
changes=[{},dict(block=50),dict(limit=33,usedLimit=30),dict(immune=True),dict(immune=True,puncture=True,block=50),dict(preventEligible=True,retainHp=90),dict(deathResist=1)]
out={'scope':'Original BeHit Passive branch plus original property mutation, with observational property callbacks and disabled record/animation/damage-event hooks. preventEligible input sets the target prevention property; original CheckPreventActiveDamage rejects it for Passive. Not an original end-to-end Passive effect-to-BeHit execution or gameplay validation.','sourceHashes':{name:o.assets[name+'.lua']['sha256'] for name in ['BattleUnitBase','BattleUnitUtil','BattlePropertyServer']},'fixtures':[{'input':{**base,**change},'expected':o.evaluate({**base,**change})} for change in changes]}
(ROOT/'tests/synthetic/original-passive-hp.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Generated',len(changes),'original Passive BeHit cases')
