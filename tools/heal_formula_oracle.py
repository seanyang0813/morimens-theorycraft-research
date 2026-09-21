"""Execute copied original ShowHealFormula against explicit synthetic vectors."""
import json
import random
from runtime_oracle import Oracle, ROOT

KEYS=['value','awakerOutsideHealPer','playerOutsideHealPer','curCardHealPer','cardOutsideHealPer','skillTypeHealPer','awakerHealPlus','cardHealPlus','skillArgsPlus','dying_per','dying_per2','awakerInsideHealPer','dimension_fix_per','playerInsideHealPer','cardInsideHealPer','allDealHealPer','cardHealPer2','card_heal_per2_n2','awaker_CmdCard_heal_per','awaker_ulti_heal_per','skillTypeInsideHealPer','spellboundHealPer','spellboundHealPer2','spellboundHealPer3','spellboundHealPer4','spellboundHealPer5','keeperskill_def_per','is_chaos_type2']

class HealFormulaOracle(Oracle):
    def run(self,values):
        L=self.state;self.top(L,0);self.getglobal(L,b'_oracle_util');self.getfield(L,-1,b'ShowHealFormula');self.table(L,0,len(values))
        for key,value in values.items():self.number(L,value);self.setfield(L,-2,key.encode())
        self.check(self.call(L,1,2,0,0,None));return {'showHeal':self.tonumber(L,-2,None),'baseHeal':self.tonumber(L,-1,None)}

if __name__=='__main__':
    oracle=HealFormulaOracle();neutral=dict.fromkeys(KEYS,0);neutral.update(skillTypeHealPer=1,skillTypeInsideHealPer=1)
    cases=[{**neutral,'value':value} for value in [-10,0,0.1,1,10.2,100,10000]];rng=random.Random(20260921)
    variable=[key for key in KEYS if key not in ['value','skillTypeHealPer','skillTypeInsideHealPer']]
    for _ in range(600):
        row={**neutral,'value':rng.choice([-10,0,0.1,1,10.2,100,9999.9]),'skillTypeHealPer':rng.choice([0.5,1,1.25,2]),'skillTypeInsideHealPer':rng.choice([0.5,1,1.5,2])}
        for key in rng.sample(variable,rng.randint(0,len(variable))):row[key]=rng.choice([-100,-50,-25,0.1,3,12.5,20,25,50,100,150])
        row['is_chaos_type2']=rng.choice([0,0.5,1,2]);row['keeperskill_def_per']=rng.choice([0,20,35.5,100]);cases.append(row)
    output={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHash':oracle.assets['BattleUtilServer.lua']['sha256'],'scope':'607 direct executions of copied original BattleUtilServer.ShowHealFormula with explicit resolved numeric vectors and both returned values. No BattleCmdServer property assembly, recipient modifiers, HP storage, events, full command or gameplay.','fixtures':[{'input':row,'expected':oracle.run(row)} for row in cases]}
    (ROOT/'tests/synthetic/original-show-heal.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8');print('Generated',len(cases),'original ShowHealFormula cases')
