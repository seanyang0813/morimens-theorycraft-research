"""Recover the active BC limit mappings; audit exact usage-property references."""
import ctypes as C
import hashlib
import json
from target_runtime_oracle import TargetOracle, ROOT

o=TargetOracle();L=o.state
next_item=o.lib.lua_next;next_item.argtypes=[C.c_void_p,C.c_int];next_item.restype=C.c_int
def mapping(name):
    o.top(L,0);o.getglobal(L,b'_oracle_bc');o.getfield(L,-1,name.encode());o.nil(L);result={}
    while next_item(L,-2):
        key=o.string(L,-2,None).decode();value=o.string(L,-1,None).decode();result[key]=value;o.top(L,-2)
    return result
maps={n:mapping(n) for n in ['StateLayerLimit','StateLayerLimitTotal','StateLayerStatics']}
api=json.loads((ROOT/'research/extracted/config/BattleApi.json').read_text(encoding='utf-8'))
rules={}
for family,mode in [('StateLayerLimit','statistics'),('StateLayerLimitTotal','total')]:
    rules[mode]=[]
    for key,prop in maps[family].items():
        state=api[prop]['Data']
        if not isinstance(state,int):raise ValueError('Nonliteral state mapping requires expression evaluation')
        row={'key':key,'stateIds':[state],'limitProperty':prop}
        if mode=='statistics':row['usedProperty']=maps['StateLayerStatics'][key]
        rules[mode].append(row)
needle='be_state_layer_statics_posion'
refs={}
for folder,glob in [('research/extracted/prototypes','*.json'),('research/extracted/config','*.json')]:
    refs[folder]=[str(p.relative_to(ROOT)).replace('\\','/') for p in sorted((ROOT/folder).rglob(glob)) if needle in p.read_text(encoding='utf-8')]
state_config=json.loads((ROOT/'research/extracted/config/State.json').read_text(encoding='utf-8'))
property_names={r['limitProperty'] for group in rules.values() for r in group}
sources={key:{p:expr for p,expr in row.get('ExistProperty',{}).items() if p in property_names} for key,row in state_config.items()}
sources={k:v for k,v in sources.items() if v}
catalog={'build':'pc-res144-build51','rules':rules,'sourceHashes':{'BattleConst':o.assets['BattleConst.lua']['sha256'],'BattleApiExport':hashlib.sha256((ROOT/'research/extracted/config/BattleApi.json').read_bytes()).hexdigest()},
 'unusedLimitApiEntries':[key for key in api if key.startswith('be_state_layer_limit_') and key not in property_names],
 'statePropertySources':sources,'usagePropertyExactReferences':refs,
 'limitations':['Lua pairs order observed during export; current active rule state IDs do not overlap','Exact-reference audit does not exclude dynamic names, native code or missing downloaded files','Usage-property accumulation/reset writer not established; do not infer an update from added layers','No gameplay validation']}
(ROOT/'research/evidence/state-limit-catalog.json').write_text(json.dumps(catalog,indent=2)+'\n',encoding='utf-8')
print('Recovered',sum(map(len,rules.values())),'active limit rules; unresolved statistics writer retained')
