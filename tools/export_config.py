"""Read copied data tables; System.readonly is identity solely for extraction."""
from runtime_oracle import Oracle, ROOT
import ctypes as C, json, sys
oracle=Oracle()
def api(name,result,*args):
    f=getattr(oracle.lib,name);f.restype=result;f.argtypes=list(args);return f
P,I=C.c_void_p,C.c_int
kind=api('lua_type',I,P,I)
absolute=api('lua_absindex',I,P,I)
pushnil=api('lua_pushnil',None,P)
nextitem=api('lua_next',I,P,I)
boolean=api('lua_toboolean',I,P,I)
integer=api('lua_isinteger',I,P,I)
toint=api('lua_tointegerx',C.c_int64,P,I,P)
L=oracle.state
def read(index,depth=0):
    if depth>30:raise ValueError('Excessive nesting')
    tag=kind(L,index)
    if tag==0:return None
    if tag==1:return bool(boolean(L,index))
    if tag==3:return toint(L,index,None) if integer(L,index) else oracle.tonumber(L,index,None)
    if tag==4:return oracle.string(L,index,None).decode('utf-8')
    if tag!=5:raise ValueError(f'Non-data Lua tag {tag}')
    index=absolute(L,index);out={};pushnil(L)
    while nextitem(L,index):
        key=read(-2,depth+1);value=read(-1,depth+1)
        out[str(key)]=value
        oracle.top(L,-2)
    return out
assets=json.loads((ROOT/'research/symbols/text-assets.json').read_text(encoding='utf-8'))
for name in sys.argv[1:]:
    found=[a for a in assets if a['name']==name+'.lua' and 'config' in a['bundle']]
    if len(found)!=1:raise ValueError((name,len(found)))
    oracle.top(L,0);oracle.module(name,found[0]);data=read(-1)
    out=ROOT/'research/extracted/config'/f'{name}.json';out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print(name,len(data),'rows',flush=True)
