"""Original event manager and original shallow table.clone, synthetic callbacks."""
import ctypes as C
import json
from target_runtime_oracle import TargetOracle, ROOT
o=TargetOracle();L=o.state
o.module('Table');o.top(L,0)
o.module('BattleEventMgr');o.setglobal(L,b'_dispatch')
o.gettop=o.lib.lua_gettop;o.gettop.argtypes=[C.c_void_p];o.gettop.restype=C.c_int
def invoke(method,args):
    saved=o.gettop(L);o.getglobal(L,b'_dispatch');o.getfield(L,-1,method.encode());o.getglobal(L,b'_dispatch')
    for kind,value in args:
        if kind=='number':o.number(L,value)
        else:o.getglobal(L,value.encode())
    o.check(o.call(L,len(args)+1,0,0,0,None));o.top(L,saved)
def register(name,head=False):
    invoke('RegisterEventToHead' if head else 'RegisterEvent',[('number',203),('global','_cb_'+name),('global','_target_'+name)])
def remove(name):
    invoke('UnregisterEvent',[('number',203),('global','_cb_'+name),('global','_target_'+name)])
cases=[
 {'name':'ascending-priority-stable-ties','registrations':[['A',2,False],['B',1,False],['C',2,False]],'action':None},
 {'name':'head-before-equal-not-before-lower','registrations':[['A',2,False],['B',1,False],['C',2,True]],'action':None},
 {'name':'remove-next-during-dispatch','registrations':[['A',1,False],['B',2,False],['C',3,False]],'action':'removeB'},
 {'name':'register-during-dispatch','registrations':[['A',1,False],['B',2,False]],'action':'addC'},
 {'name':'remove-and-reregister','registrations':[['A',1,False],['B',2,False]],'action':'replaceB'}
]
fixtures=[]
for case in cases:
    trace=[];acted=[False]
    o.getglobal(L,b'_dispatch');o.table(L,0,1);o.setfield(L,-2,b'eventData');o.top(L,0)
    priorities={name:priority for name,priority,_ in case['registrations']};priorities.setdefault('C',0)
    for name in ['A','B','C']:
        o.table(L,0,1);o.number(L,priorities[name]);o.setfield(L,-2,b'eventPriority');o.setglobal(L,('_target_'+name).encode())
        def callback(s,name=name):
            trace.append(name)
            if name=='A' and not acted[0]:
                acted[0]=True
                if case['action'] in ['removeB','replaceB']:remove('B')
                if case['action']=='replaceB':register('B')
                if case['action']=='addC':register('C')
            return 0
        o.callback(callback);o.setglobal(L,('_cb_'+name).encode())
    for name,_,head in case['registrations']:register(name,head)
    invoke('SendEvent',[('number',203)]);first=trace.copy();trace.clear()
    invoke('SendEvent',[('number',203)])
    fixtures.append({'input':case,'expected':[first,trace.copy()]})
if o.errors:raise RuntimeError(o.errors)
out={'scope':'Original RegisterEvent, RegisterEventToHead, UnregisterEvent, SendEvent and foundation table.clone. Synthetic callback actions; no battle scheduler, state trigger eligibility or command execution.', 'sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleEventMgr','Table']},'fixtures':fixtures}
(ROOT/'tests/synthetic/original-event-dispatch.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print(json.dumps(fixtures))
