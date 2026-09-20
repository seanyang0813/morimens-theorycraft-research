"""Deserialize copied chunks through their legitimate loader, without executing them."""
from pathlib import Path
import ctypes as C,os,json,struct,sys
ROOT=Path(__file__).resolve().parents[1]
d=ROOT/'research/raw/pc/Morimens_Data/Plugins/x86_64';dll_dir=os.add_dll_directory(str(d));lib=C.CDLL(str(d/'xlua.dll'))
def api(n,r,a):f=getattr(lib,n);f.restype=r;f.argtypes=a;return f
new=api('luaL_newstate',C.c_void_p,[]);close=api('lua_close',None,[C.c_void_p]);load=api('xluaL_loadbuffer',C.c_int,[C.c_void_p,C.c_char_p,C.c_int,C.c_char_p]);spl=api('lua_spl',C.c_int,[C.c_void_p,C.c_char_p,C.c_int]);ptr=api('lua_topointer',C.c_void_p,[C.c_void_p,C.c_int]);top=api('lua_settop',None,[C.c_void_p,C.c_int])
key=(ROOT/'research/raw/lua-public-key.txt').read_bytes()
def p(a):return C.c_void_p.from_address(a).value or 0
def i(a):return C.c_int.from_address(a).value
def s(a):
 if not a:return None
 tag=C.c_ubyte.from_address(a+8).value&63
 n=C.c_ubyte.from_address(a+11).value if tag==4 else C.c_size_t.from_address(a+16).value
 if n>10000000:raise ValueError('Bad string size')
 return C.string_at(a+24,n).decode('utf-8','replace')
def proto(a):
 nk,ncode,np=i(a+20),i(a+24),i(a+32)
 if min(nk,ncode,np)<0 or max(nk,ncode,np)>10000000:raise ValueError('Bad prototype bounds')
 ks=p(a+56);constants=[]
 for j in range(nk):
  k=ks+j*16;tag=C.c_ubyte.from_address(k+8).value&63
  if tag in (4,20):v=s(p(k))
  elif tag==3:v=C.c_int64.from_address(k).value
  elif tag==19:v=C.c_double.from_address(k).value
  elif tag in (1,17):v=tag==17
  elif tag==0:v=None
  else:v={'unparsed_tag':tag,'bytes':C.string_at(k,8).hex()}
  constants.append(v)
 return {'source':s(p(a+112)),'line':i(a+44),'last_line':i(a+48),'params':C.c_ubyte.from_address(a+10).value,'vararg':C.c_ubyte.from_address(a+11).value,'max_stack':C.c_ubyte.from_address(a+12).value,'instruction_key':i(a+136),'constants':constants,'constant_tags':[C.c_ubyte.from_address(ks+j*16+8).value&63 for j in range(nk)],'upvalues':[{'name':s(p(p(a+80)+j*16)),'instack':C.c_ubyte.from_address(p(a+80)+j*16+8).value,'idx':C.c_ubyte.from_address(p(a+80)+j*16+9).value,'kind':C.c_ubyte.from_address(p(a+80)+j*16+10).value} for j in range(i(a+16))],'locals':[{'name':s(p(p(a+104)+j*16)),'start':i(p(a+104)+j*16+8),'end':i(p(a+104)+j*16+12)} for j in range(i(a+36))],'instructions_encoded':list(struct.unpack('<'+'I'*ncode,C.string_at(p(a+64),ncode*4))),'children':[proto(p(p(a+72)+j*8)) for j in range(np)]}
assets=json.loads((ROOT/'research/symbols/text-assets.json').read_text(encoding='utf-8'));index=[]
for n,asset in enumerate(assets):
 if len(sys.argv)>1 and asset['name'] not in sys.argv[1:]:continue
 state=new();spl(state,key,len(key));b=(ROOT/asset['output']).read_bytes()
 result=load(state,b,len(b),asset['name'].encode())
 if result:raise RuntimeError((asset['name'],result))
 tree=proto(p(ptr(state,-1)+24))
 tree['numeric_tags_corrected']=True
 out=ROOT/'research/extracted/prototypes'/Path(asset['bundle']).stem/(str(asset['path_id'])+'_'+asset['name']+'.json')
 if out.exists():
  old=json.loads(out.read_text(encoding='utf-8'))
  def retain(new,old):
   if new['instructions_encoded']==old['instructions_encoded'] and 'instructions_decoded' in old:new['instructions_decoded']=old['instructions_decoded']
   for a,b in zip(new['children'],old['children']):retain(a,b)
  retain(tree,old)
 out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(tree,ensure_ascii=False,indent=2),encoding='utf-8')
 strings=[]
 def collect(t):
  strings.extend(x for x in t['constants'] if isinstance(x,str))
  for c in t['children']:collect(c)
 collect(tree)
 index.append({'name':asset['name'],'source':tree['source'],'bundle':asset['bundle'],'prototype':str(out.relative_to(ROOT)),'strings':strings})
 close(state)
 if n%200==0:print('Parsed',n+1,asset['name'],flush=True)
if len(sys.argv)==1:(ROOT/'research/symbols/lua-index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2),encoding='utf-8')
print('Indexed',len(index),'Lua modules')
