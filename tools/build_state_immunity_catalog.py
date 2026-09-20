"""Export original immunity mappings and state classifications without source code."""
import ctypes as C
import hashlib
import json
import re
from target_runtime_oracle import TargetOracle, ROOT

o=TargetOracle();L=o.state
next_item=o.lib.lua_next;next_item.argtypes=[C.c_void_p,C.c_int];next_item.restype=C.c_int
api_path=ROOT/'research/extracted/config/BattleApi.json'
state_path=ROOT/'research/extracted/config/State.json'
api=json.loads(api_path.read_text(encoding='utf-8'))
states=json.loads(state_path.read_text(encoding='utf-8'))
o.getglobal(L,b'_oracle_bc');o.getfield(L,-1,b'PropertyImmueState');o.nil(L)
rules=[]
while next_item(L,-2):
    prop=o.string(L,-1,None).decode();data=api[prop]['Data']
    if isinstance(data,int):ids=[data]
    elif isinstance(data,str) and re.fullmatch(r'\s*\d+(?:\s*,\s*\d+)*\s*',data):ids=[int(n.strip()) for n in data.split(',')]
    else:raise ValueError('Nonliteral immunity mapping requires original expression evaluation')
    rules.append({'property':prop,'stateIds':ids});o.top(L,-2)
classification={None:'none','TRUE':'buff','FALSE':'debuff'}
state_types={key:classification[row.get('IsBuff')] for key,row in states.items()}
ids=[i for r in rules for i in r['stateIds']]
if len(ids)!=len(set(ids)):raise ValueError('Overlapping mappings require stable original iteration semantics')
if any(str(i) not in state_types for i in ids):raise ValueError('Mapped state missing')
catalog={'build':'pc-res144-build51','specificRules':rules,'stateTypes':state_types,
 'sourceHashes':{'BattleConst':o.assets['BattleConst.lua']['sha256'],'BattleApiExport':hashlib.sha256(api_path.read_bytes()).hexdigest(),'StateExport':hashlib.sha256(state_path.read_bytes()).hexdigest()},
 'limitations':['Specific rule order observed from original Lua table; active state IDs do not overlap','Only literal numeric state-ID expressions supported','Properties must still be supplied from explicit evidence; no automatic build derivation','No gameplay validation']}
(ROOT/'research/evidence/state-immunity-catalog.json').write_text(json.dumps(catalog,indent=2)+'\n',encoding='utf-8')
print('Recovered',len(rules),'specific immunity rules and',len(state_types),'state classifications')
