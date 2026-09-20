"""Load a copied Lua runtime and parse one chunk; never execute its function."""
from pathlib import Path
import ctypes as C,os,shutil,json,sys,struct
ROOT=Path(__file__).resolve().parents[1]
src=Path(r'C:\Program Files (x86)\Steam\steamapps\common\Morimens\Morimens_Data\Plugins\x86_64')
dst=ROOT/'research/raw/pc/Morimens_Data/Plugins/x86_64'
for p in src.glob('*.dll'):
 if not (dst/p.name).exists():shutil.copy2(p,dst/p.name)
handle=os.add_dll_directory(str(dst))
lib=C.CDLL(str(dst/'xlua.dll'))
def api(name,ret,args):
 f=getattr(lib,name);f.restype=ret;f.argtypes=args;return f
new=api('luaL_newstate',C.c_void_p,[])
load4=api('xluaL_loadbuffer',C.c_int,[C.c_void_p,C.c_char_p,C.c_int,C.c_char_p])
def load(s,b,n,name,mode):return load4(s,b,n,name)
ptr=api('lua_topointer',C.c_void_p,[C.c_void_p,C.c_int])
tos=api('lua_tolstring',C.c_char_p,[C.c_void_p,C.c_int,C.c_void_p])
close=api('lua_close',None,[C.c_void_p])
state=new();print('Lua state created',bool(state),flush=True)
key=(ROOT/'research/raw/lua-public-key.txt').read_bytes()
print('Set parser key:',api('lua_spl',C.c_int,[C.c_void_p,C.c_char_p,C.c_int])(state,key,len(key)),flush=True)
api('luaL_openlibs',None,[C.c_void_p])(state)
api('luaopen_xlua',C.c_int,[C.c_void_p])(state)
PANIC=C.CFUNCTYPE(C.c_int,C.c_void_p)
@PANIC
def panic(s):
 print('Lua panic:',tos(s,-1,None),flush=True);return 0
api('lua_atpanic',C.c_void_p,[C.c_void_p,PANIC])(state,panic)
plain=b'return 1 + 2'
print('Plaintext control:',load(state,plain,len(plain),b'control',None),flush=True)
print('Control message:',tos(state,-1,None),flush=True)
assets=json.loads((ROOT/'research/symbols/text-assets.json').read_text())
asset=next(x for x in assets if x['name']=='BattleRequest.lua')
b=(Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/asset['output']).read_bytes();ret=load(state,b,len(b),b'BattleRequest.lua',None)
print('Parse result',ret,flush=True)
if ret:print('Error',tos(state,-1,None),flush=True)
else:
 p=ptr(state,-1);print('Closure',hex(p),C.string_at(p,64).hex(),flush=True)
 proto=C.c_void_p.from_address(p+24).value
 print('Prototype',hex(proto),C.string_at(proto,128).hex(),flush=True)
 count=C.c_int.from_address(proto+24).value;code=C.c_void_p.from_address(proto+64).value
 print('Instructions',list(struct.unpack('<'+'I'*count,C.string_at(code,count*4))),flush=True)
 count=C.c_int.from_address(proto+20).value;kp=C.c_void_p.from_address(proto+56).value
 for j in range(count):
  k=kp+j*16;tag=C.c_ubyte.from_address(k+8).value
  if tag&15==4:
   s=C.c_void_p.from_address(k).value;n=C.c_ubyte.from_address(s+11).value if tag&63==4 else C.c_size_t.from_address(s+16).value
   print('constant',j,tag,C.string_at(s+24,n),flush=True)
 (ROOT/'research/raw/lua-closure.bin').write_bytes(C.string_at(p,64))
 chunks=[]
 WRITER=C.CFUNCTYPE(C.c_int,C.c_void_p,C.c_void_p,C.c_size_t,C.c_void_p)
 @WRITER
 def writer(s,buf,size,ud):chunks.append(C.string_at(buf,size));return 0
 result=api('lua_dump',C.c_int,[C.c_void_p,WRITER,C.c_void_p,C.c_int])(state,writer,None,0)
 dumped=b''.join(chunks);(ROOT/'research/raw/runtime-dump.luac').write_bytes(dumped)
 print('Dump result',result,len(dumped),dumped[:40].hex(),flush=True)
close(state)
