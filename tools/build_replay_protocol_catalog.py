"""Export numeric replay command/event names from copied original Lua tables."""
from pathlib import Path
import ctypes as C
import json
from runtime_oracle import Oracle,ROOT

o=Oracle();L=o.state
next_item=o.lib.lua_next;next_item.argtypes=[C.c_void_p,C.c_int];next_item.restype=C.c_int
push_nil=o.lib.lua_pushnil;push_nil.argtypes=[C.c_void_p]
is_integer=o.lib.lua_isinteger;is_integer.argtypes=[C.c_void_p,C.c_int];is_integer.restype=C.c_int
to_integer=o.lib.lua_tointegerx;to_integer.argtypes=[C.c_void_p,C.c_int,C.c_void_p];to_integer.restype=C.c_longlong
abs_index=o.lib.lua_absindex;abs_index.argtypes=[C.c_void_p,C.c_int];abs_index.restype=C.c_int
lua_type=o.lib.lua_type;lua_type.argtypes=[C.c_void_p,C.c_int];lua_type.restype=C.c_int

def table(name):
    o.top(L,0);o.module(name);absolute=abs_index(L,-1);rows={};excluded=[];push_nil(L)
    while next_item(L,absolute):
        key=o.string(L,-2,None)
        if not key:raise ValueError(f'Unexpected non-string {name} key type {lua_type(L,-2)}')
        if is_integer(L,-1):rows[key.decode()]=int(to_integer(L,-1,None))
        else:excluded.append({'name':key.decode(),'luaType':lua_type(L,-1)})
        o.top(L,-2)
    if len(rows)!=len(set(rows.values())):raise ValueError(f'Duplicate numeric values in {name}')
    return dict(sorted(rows.items(),key=lambda item:item[1])),sorted(excluded,key=lambda row:row['name'])

commands,command_excluded=table('BattleCommand');events,event_excluded=table('BattleRenderEvent')
required_commands=['rd_InitBattle','rd_BattleCut','rd_BattleInstantCut','rd_CommandResult']
required_events=['UseCard','AddState','ChangeStateLayer','DelState','BeHit','PropertyChanged','SelectTargets']
if any(name not in commands for name in required_commands) or any(name not in events for name in required_events):raise ValueError('Required replay protocol entries missing')
catalog={'schemaVersion':1,'build':'pc-res144-build51','commands':commands,'renderEvents':events,
 'excludedNonnumericEntries':{'commands':command_excluded,'renderEvents':event_excluded},
 'sourceHashes':{name:o.assets[name+'.lua']['sha256'] for name in ['BattleCommand','BattleRenderEvent']},
 'limitations':['Numeric name catalog only; it does not prove payload schemas','No actual replay decoded or gameplay validation']}
(ROOT/'research/evidence/replay-protocol.json').write_text(json.dumps(catalog,indent=2)+'\n',encoding='utf-8')
print('Recovered',len(commands),'battle commands and',len(events),'render events')
