"""Original compiled primary-stat expressions; explicit configuration values, no game UI."""
import ctypes as C
import json
import math
from runtime_oracle import Oracle, ROOT

class PrimaryStatOracle(Oracle):
    def __init__(self):
        super().__init__()
        self.module('FuncTable');self.setglobal(self.state,b'_primary_formulas')
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        self.integer=self.lib.lua_pushinteger;self.integer.argtypes=[C.c_void_p,C.c_longlong];self.integer.restype=None
    def evaluate(self,expression,values):
        L=self.state;self.top(L,0)
        self.getglobal(L,b'_primary_formulas');self.getfield(L,-1,expression.encode())
        if self.kind(L,-1)!=6:raise ValueError('Missing original expression: '+expression)
        self.table(L,0,len(values)+1);self.getglobal(L,b'math');self.setfield(L,-2,b'math')
        for key,value in values.items():
            (self.integer if isinstance(value,int) else self.number)(L,value)
            self.setfield(L,-2,key.encode())
        self.check(self.call(L,1,1,0,0,None))
        if self.kind(L,-1)!=3:raise ValueError('Original expression returned non-number')
        result=self.tonumber(L,-1,None)
        if not math.isfinite(result):raise ValueError('Original expression returned nonfinite value')
        return result

if __name__=='__main__':
    audit=json.loads((ROOT/'research/evidence/catalog-primary-stat-audit.json').read_text(encoding='utf-8'))
    characters=json.loads((ROOT/'research/extracted/config/AwakerConfig.json').read_text(encoding='utf-8'))
    upgrades=json.loads((ROOT/'research/extracted/config/AwakerUpgrade.json').read_text(encoding='utf-8'))
    upgrades={r['Level']:r for r in upgrades.values()}
    o=PrimaryStatOracle();fixtures=[];seen=set()
    fields={'ATK':('atk','AtkGrowthOfBaseAtk'),'DEF':('def','DefGrowthOfBaseDef'),'CON':('physique','PhysiqueGrowthOfBasePhysique')}
    for row in audit['characters']:
        for mismatch in row['mismatches']:
            for level in [mismatch['level']-1,mismatch['level'],mismatch['level']+1]:
                if not 1<=level<=90:continue
                identity=(row['clientId'],level,mismatch['stat'],mismatch['bonusLevels'])
                if identity in seen:continue
                seen.add(identity)
                prop,field=fields[mismatch['stat']];c=characters[str(row['clientId'])]
                expression=upgrades[level+row['qualityLevelOffset']][field]
                values={prop:c[prop],prop+'_extra':c[prop+'_extra'],'talent_attr_lv':mismatch['bonusLevels']}
                fixtures.append({'characterId':row['catalogId'],'clientId':row['clientId'],'level':level,'stat':mismatch['stat'],
                    'isAuditMismatch':level==mismatch['level'],'expression':expression,'values':values,
                    'upgradeLevel':level+row['qualityLevelOffset'],'expected':o.evaluate(expression,values),
                    'catalogValueAtMismatch':mismatch['catalogValue'] if level==mismatch['level'] else None})
    mismatches=[f for f in fixtures if f['isAuditMismatch']]
    result={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51',
        'scope':'Original FuncTable closures for all cross-source discrepant cases and adjacent levels. Explicit primary base/extra and talent bonus inputs; original Lua math. Excludes complete AwakerDataUtils lookup, Soulforge, final battle properties, and gameplay validation.',
        'sourceHashes':{'FuncTable':o.assets['FuncTable.lua']['sha256'],**audit['sourceHashes']},
        'summary':{'cases':len(fixtures),'candidateDiscrepancies':len(mismatches),'confirmedDiscrepancies':sum(f['expected']!=f['catalogValueAtMismatch'] for f in mismatches)},'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-primary-stats.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(result['summary']))
