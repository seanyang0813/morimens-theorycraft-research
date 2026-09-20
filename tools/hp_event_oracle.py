"""Original owner HP callback, preserving deferred event-data references."""
import ctypes as C
import json
from target_runtime_oracle import TargetOracle, ROOT

o=TargetOracle();L=o.state
known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util',b'Battle.DbgEngine.Cmd.BattleCmdServer':b'_oracle_cmd',b'Battle.DbgEngine.Event.BattleLogicEvent':b'_hp_events'}
empty={b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.BattlePropertyServer',b'Battle.DbgEngine.DataCenter.BattleRoleData',b'Battle.DbgEngine.Role.Component.TagManagerComp',b'Battle.Util.BattleUnitUtil'}
def require(s):
    name=o.string(s,1,None)
    if name in known:o.getglobal(s,known[name])
    elif name in empty:o.table(s,0,0)
    else:o.errors.append(repr(name));o.nil(s)
    return 1
o.callback(require);o.setglobal(L,b'require')
o.module('BattleLogicEvent');o.setglobal(L,b'_hp_events')
o.module('BattleUnitBase');o.setglobal(L,b'_hp_unit')
if o.errors:raise RuntimeError(o.errors)
o.pushstring=o.lib.lua_pushstring;o.pushstring.argtypes=[C.c_void_p,C.c_char_p];o.pushstring.restype=C.c_void_p
o.rawequal=o.lib.lua_rawequal;o.rawequal.argtypes=[C.c_void_p,C.c_int,C.c_int];o.rawequal.restype=C.c_int
o.type=o.lib.lua_type;o.type.argtypes=[C.c_void_p,C.c_int];o.type.restype=C.c_int
fields=['uid','oldValue','newValue','castRoleUid','max_hp','hp','propertyName']
def payload(s,index):
    out={}
    # All callers pass a positive stack index.
    for key in fields:
        o.getfield(s,index,key.encode())
        typ=o.type(s,-1)
        if typ==3:out[key]=o.tonumber(s,-1,None)
        elif typ==4:out[key]=o.string(s,-1,None).decode()
        o.top(s,-2)
    return out
events=[];current={}
o.getglobal(L,b'_hp_unit');o.number(L,7);o.setfield(L,-2,b'uid')
def prop(s):
    key=o.string(s,2,None).decode()
    if key not in ['hp','max_hp']:o.errors.append(key);o.number(s,0)
    else:o.number(s,current[key])
    return 1
o.method('GetProperty',prop)
o.table(L,0,1)
def event(s):
    event_id=o.tonumber(s,2,None)
    events.append({'eventId':event_id,'atCreation':payload(s,3)})
    o.pushvalue(s,3);o.setglobal(s,('_hp_event_data_'+str(len(events))).encode())
    return 0
o.method('CreateEventEffect',event);o.setfield(L,-2,b'battleEngine');o.top(L,0)
fixtures=[]
for property_name,old,new,hp,maxhp in [('hp',100,75,75,100),('hp',100,0,0,100),('hp',100,100,100,100),('hp',0.5,0.25,0.25,100),('max_hp',100,80,70,80)]:
    current={'hp':hp,'max_hp':maxhp};events=[];o.top(L,0)
    o.getglobal(L,b'_hp_unit');o.getfield(L,-1,b'OnPropertyChange_Hp');o.getglobal(L,b'_hp_unit')
    o.pushstring(L,property_name.encode());o.number(L,old);o.number(L,new);o.table(L,0,1);o.number(L,9);o.setfield(L,-2,b'castRoleUid')
    o.check(o.call(L,5,0,0,0,None));o.top(L,0)
    for i,e in enumerate(events,1):
        o.getglobal(L,('_hp_event_data_'+str(i)).encode());e['afterCallback']=payload(L,1);o.top(L,0)
    same=False
    if len(events)==2:
        o.getglobal(L,b'_hp_event_data_1');o.getglobal(L,b'_hp_event_data_2');same=bool(o.rawequal(L,1,2));o.top(L,0)
    fixtures.append({'input':dict(property=property_name,old=old,new=new,hp=hp,max_hp=maxhp),'events':events,'sharedPayload':same})
if o.errors:raise RuntimeError(o.errors)
out={'scope':'Original OnPropertyChange_Hp with explicit getters and CreateEventEffect spy retaining Lua table references; not event creation implementation, scheduler, dispatch or listeners','sourceHash':o.assets['BattleUnitBase.lua']['sha256'],'fixtures':fixtures}
(ROOT/'tests/synthetic/original-hp-events.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
assert all(f['sharedPayload'] for f in fixtures if f['input']['property']=='hp')
assert all('max_hp' not in f['events'][0]['atCreation'] and 'max_hp' in f['events'][0]['afterCallback'] for f in fixtures if f['input']['property']=='hp')
assert len(fixtures[-1]['events'])==1
print('Verified 5 HP callback cases; HP event pair shares one mutable payload')
