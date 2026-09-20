"""Original compiled BattleApi growth expressions with explicit level/coefficient."""
import ctypes as C
import json
from runtime_oracle import Oracle, ROOT
o=Oracle();L=o.state;o.module('FuncTable');o.setglobal(L,b'_growth_functions')
kind=o.lib.lua_type;kind.argtypes=[C.c_void_p,C.c_int];kind.restype=C.c_int
api=json.loads((ROOT/'research/extracted/config/BattleApi.json').read_text(encoding='utf-8'))
expressions={key:value['Data'] for key,value in api.items() if key.startswith('BattleFomula') and isinstance(value.get('Data'),str)}
fixtures=[]
for name,expression in sorted(expressions.items()):
    for level in [1,2,6]:
        for coefficient in [0,.1,.4,2]:
            o.top(L,0);o.getglobal(L,b'_growth_functions');o.getfield(L,-1,expression.encode())
            if kind(L,-1)!=6:raise RuntimeError('Missing compiled expression '+name)
            o.table(L,0,2);o.number(L,level);o.setfield(L,-2,b'SkillLevel');o.number(L,coefficient);o.setfield(L,-2,b'GrowArgValue');o.check(o.call(L,1,1,0,0,None))
            if kind(L,-1)!=3:raise RuntimeError('Unexpected formula output '+name)
            fixtures.append({'input':{'name':name,'expression':expression,'skillLevel':level,'coefficient':coefficient},'expected':o.tonumber(L,-1,None)})
out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleApi','FuncTable']},'scope':'Every exported BattleFomula expression evaluated by its original compiled FuncTable closure with explicit numeric SkillLevel and GrowArgValue. No original parser lookup, member updates, skill-level derivation or gameplay.','expressions':expressions,'fixtures':fixtures}
(ROOT/'tests/synthetic/original-skill-growth.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Generated',len(fixtures),'original growth cases across',len(expressions),'formulas')
