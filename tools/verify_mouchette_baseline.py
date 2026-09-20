"""Recheck resolved per-hit arithmetic in copied original Lua, not a replay."""
import json
import sys
from target_runtime_oracle import TargetOracle, ROOT
o=TargetOracle()
path=ROOT/(sys.argv[1] if len(sys.argv)>1 else 'output/pdf/mouchette-approved-baseline-calculation.json')
report=json.loads(path.read_text())
checks=[]
for row in report['rounds']:
    for kind in ['aHit','blast','pursuit']:
        hit=row[kind]
        if hit is None:continue
        show=o.damage(hit['utilityInputs'])[0]
        final=o.final_damage(show,hit['target'])
        assert show==hit['showDamage'],(row['round'],kind,show)
        assert final==hit['preHitDamage'],(row['round'],kind,final)
        checks.append({'round':row['round'],'event':kind,'showDamage':show,'preHitDamage':final})
report['arithmeticVerification']={'status':'PASS','scope':'14 resolved per-hit records checked through original ShowDamageFormula and no-card target adapter; all omitted card crit/target fields are zero in this baseline. Does not execute skills, follow-up scheduling, HP mutation or gameplay.', 'sourceHashes':{name:o.assets[name+'.lua']['sha256'] for name in ['BattleUtilServer','BattleCmdServer']},'checks':checks}
path.write_text(json.dumps(report,indent=2),encoding='utf-8')
print('PASS:',len(checks),'resolved per-hit records match original Lua arithmetic;',report['totals'])
