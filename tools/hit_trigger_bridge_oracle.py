"""Pass the original effect/BeHit payload table directly into original trigger handlers."""
import json
from effect_hp_oracle import EffectHpOracle, ROOT
from damage_trigger_oracle import DamageTriggerOracle
class ConnectedHitTriggerOracle(EffectHpOracle,DamageTriggerOracle):
    pass
if __name__=='__main__':
    o=ConnectedHitTriggerOracle();fixtures=[]
    handlers=['BSTAfterBeActiveDamage','BSTAfterPassiveDamage','BSTAfterFixedDamage']
    for category in ['Passive','Fixed','Pure']:
        for block in [0,50,500]:
            for immune in [False,True]:
                value=dict(damage=101.25,damageType=category,dimensionFixPer=0,effectProperties={},hp=1000,block=block,immune=immune,puncture=False,preventEligible=False,retainHp=0,limit=0,usedLimit=0,deathResist=0)
                hit=o.evaluate(value)
                for handler in handlers:
                    result=o.run_handler({'handler':handler,'mode':'None','eligible':True},payload_global=b'_effect_hit_result')
                    if o.errors:raise RuntimeError(o.errors)
                    fixtures.append({'input':value,'handler':handler,'hit':hit,'expected':result})
    names=['BEPassiveDamage','BEFixedDamage','BEPureDamage','BattleUnitBase','BattlePropertyServer',*handlers]
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original effect -> BeHit -> HP mutation produces a retained Lua payload table passed unchanged into each original OnBeDamage handler. Direct handler calls with supplied eligibility and role lookup; no event registration/dispatch, state callback, command execution or gameplay validation.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in names},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-hit-trigger-bridge.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'original hit-to-handler payload cases')
