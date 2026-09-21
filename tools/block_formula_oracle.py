"""Execute copied original ShowBlockFormula against explicit synthetic vectors."""
import json
import random
from runtime_oracle import Oracle, ROOT


KEYS = [
    'value','awakerOutsideBlockPer','playerOutsideBlockPer','curCardBlockPer','cardBlockPer','ultiBlockPer','skillTypeBlockPer',
    'awakerBlockPlus','cardBlockPlus','skillArgsPlus','awakerFrailPer','awakerInsideBlockPer','playerInsideBlockPer',
    'instructcardFinalBlockPer','dimension_fix_per','skillTypeInsideBlockPer','cardBlockPer2','card_block_per2_n2',
    'awaker_CmdCard_block_per','awaker_ulti_block_per','spellboundBlockPer','spellboundBlockPer2','spellboundBlockPer3',
    'spellboundBlockPer4','spellboundBlockPer5','keeperskill_def_per','is_chaos_type2'
]


class BlockFormulaOracle(Oracle):
    def run(self, values):
        L=self.state;self.top(L,0);self.getglobal(L,b'_oracle_util');self.getfield(L,-1,b'ShowBlockFormula');self.table(L,0,len(values))
        for key,value in values.items():self.number(L,value);self.setfield(L,-2,key.encode())
        self.check(self.call(L,1,2,0,0,None))
        return {'showBlock':self.tonumber(L,-2,None),'baseBlock':self.tonumber(L,-1,None)}


if __name__=='__main__':
    oracle=BlockFormulaOracle();neutral=dict.fromkeys(KEYS,0);neutral.update(skillTypeBlockPer=1,skillTypeInsideBlockPer=1)
    cases=[{**neutral,'value':value} for value in [-10,0,0.1,1,10.2,100,10000]]
    rng=random.Random(20260921)
    variable=[key for key in KEYS if key not in ['value','skillTypeBlockPer','skillTypeInsideBlockPer']]
    for _ in range(600):
        row={**neutral,'value':rng.choice([-10,0,0.1,1,10.2,100,9999.9]),'skillTypeBlockPer':rng.choice([0.5,1,1.25,2]),'skillTypeInsideBlockPer':rng.choice([0.5,1,1.5,2])}
        for key in rng.sample(variable,rng.randint(0,len(variable))):row[key]=rng.choice([-100,-50,-25,0.1,3,12.5,20,25,50,100,150])
        row['is_chaos_type2']=rng.choice([0,0.5,1,2]);row['keeperskill_def_per']=rng.choice([0,20,35.5,100])
        cases.append(row)
    output={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHash':oracle.assets['BattleUtilServer.lua']['sha256'],
        'scope':'607 direct executions of copied original BattleUtilServer.ShowBlockFormula with explicit resolved numeric vectors, including both returned values. No BattleCmdServer property assembly, target gain modifiers, block cap/storage, events, full command or gameplay.',
        'fixtures':[{'input':row,'expected':oracle.run(row)} for row in cases]}
    (ROOT/'tests/synthetic/original-show-block.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(cases),'original ShowBlockFormula cases')
