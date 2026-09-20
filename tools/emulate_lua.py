"""Offline ARM64 Lua parser experiment. Imports are local stubs, no networking."""
from pathlib import Path
from elftools.elf.elffile import ELFFile
from unicorn import *
from unicorn.arm64_const import *
import struct,json,sys,collections
ROOT=Path(__file__).resolve().parents[1]
u=Uc(UC_ARCH_ARM64,UC_MODE_ARM);symbols={};imports={};heap=0x40000000;allocs={}
u.mem_map(heap,0x10000000);u.mem_map(0x30000000,0x200000)
def alloc(n):
 global heap
 p=heap;heap+=(max(n,16)+15)&~15;allocs[p]=n;return p
def string(p):
 if not p:return b''
 b=bytearray()
 while True:
  x=u.mem_read(p+len(b),1)[0]
  if not x:return bytes(b)
  b.append(x)
def q(p,v):u.mem_write(p,struct.pack('<Q',v))
with (ROOT/'research/raw/android/unpacked/lib/arm64-v8a/libxlua.so').open('rb') as f:
 e=ELFFile(f);sym=e.get_section_by_name('.dynsym')
 for s in e.iter_segments():
  if s['p_type']=='PT_LOAD':
   start=s['p_vaddr']&~4095;end=(s['p_vaddr']+s['p_memsz']+4095)&~4095
   u.mem_map(start,end-start);u.mem_write(s['p_vaddr'],s.data())
 for i,s in enumerate(sym.iter_symbols()):
  if s['st_shndx']=='SHN_UNDEF' and s.name:
   addr=0x30000000+i*4;imports[addr]=s.name;symbols[s.name]=addr;u.mem_write(addr,b'\xc0\x03\x5f\xd6')
  elif s.name:symbols[s.name]=s['st_value']
 for sec in e.iter_sections():
  if sec['sh_type']!='SHT_RELA':continue
  for r in sec.iter_relocations():
   typ=r['r_info_type'];a=r['r_addend'];idx=r['r_info_sym']
   if typ==1027:q(r['r_offset'],a)
   elif typ in (257,1025,1026):q(r['r_offset'],symbols.get(sym.get_symbol(idx).name,0)+a)
seen=set();jumps={}
calls=collections.deque(maxlen=40)
def trace(uc,addr,size,data):
 if addr==0x184690:
  a=u.reg_read(UC_ARM64_REG_X0);b=u.reg_read(UC_ARM64_REG_X1);n=u.reg_read(UC_ARM64_REG_X2)
  print('RSA compare',n,bytes(u.mem_read(a,n*4)).hex(),bytes(u.mem_read(b,n*4)).hex(),flush=True)
 w=struct.unpack('<I',bytes(u.mem_read(addr,4)))[0]
 if w>>26==0x25:
  imm=w&0x3ffffff
  if imm&0x2000000:imm-=0x4000000
  calls.append((hex(addr),hex(addr+imm*4)))
u.hook_add(UC_HOOK_CODE,trace,begin=0x17e2e4,end=0x18a96c)
def hook(uc,addr,size,data):
 name=imports.get(addr)
 if not name:return
 args=[u.reg_read(UC_ARM64_REG_X0+i) for i in range(6)];a,b,c=args[:3];result=0
 if name not in seen:print('import',name,flush=True);seen.add(name)
 if name=='malloc':result=alloc(a)
 elif name=='calloc':result=alloc(a*b)
 elif name=='realloc':
  result=alloc(b)
  if a and b:u.mem_write(result,bytes(u.mem_read(a,min(allocs.get(a,0),b))))
 elif name in ('free','srand','__cxa_atexit','__register_atfork'):pass
 elif name in ('memcpy','memmove','__memcpy_chk','__memmove_chk'):
  if 'buf' in globals() and buf<=b<buf+len(globals()['b']):print('chunk read',b-buf,c,bytes(u.mem_read(b,min(c,32))).hex(),flush=True)
  u.mem_write(a,bytes(u.mem_read(b,c)));result=a
 elif name in ('memset','__memset_chk'):u.mem_write(a,bytes([b&255])*c);result=a
 elif name in ('strlen','__strlen_chk'):result=len(string(a))
 elif name in ('strcmp','strncmp'):
  x,y=string(a),string(b)
  if name=='strncmp':x,y=x[:c],y[:c]
  result=(x>y)-(x<y)
 elif name=='memcmp':
  x,y=bytes(u.mem_read(a,c)),bytes(u.mem_read(b,c));result=(x>y)-(x<y)
 elif name in ('strchr','__strchr_chk'):
  x=string(a)+b'\0';pos=x.find(bytes([b&255]));result=a+pos if pos>=0 else 0
 elif name=='memchr':
  pos=bytes(u.mem_read(a,c)).find(bytes([b&255]));result=a+pos if pos>=0 else 0
 elif name in ('time','getpid','rand','random'):result=12345
 elif name in ('_setjmp','setjmp','sigsetjmp','__sigsetjmp'):
  jumps[a]={r:u.reg_read(r) for r in list(range(UC_ARM64_REG_X19,UC_ARM64_REG_X28+1))+[UC_ARM64_REG_X29,UC_ARM64_REG_X30,UC_ARM64_REG_SP]+list(range(UC_ARM64_REG_D8,UC_ARM64_REG_D15+1))}
 elif name in ('longjmp','siglongjmp'):
  for r,v in jumps[a].items():u.reg_write(r,v)
  result=b or 1
 elif name=='pthread_mutex_lock' or name=='pthread_mutex_unlock':pass
 else:raise RuntimeError((name,[hex(x) for x in args]))
 u.reg_write(UC_ARM64_REG_X0,result&((1<<64)-1));u.reg_write(UC_ARM64_REG_PC,u.reg_read(UC_ARM64_REG_X30))
u.hook_add(UC_HOOK_CODE,hook,begin=0x30000000,end=0x30010000)
u.reg_write(UC_ARM64_REG_SP,0x301f0000);u.reg_write(UC_ARM64_REG_TPIDR_EL0,0x30100000)
def call(name,*args):
 for i,a in enumerate(args):u.reg_write(UC_ARM64_REG_X0+i,a)
 u.reg_write(UC_ARM64_REG_X30,0x301ff000)
 u.emu_start(symbols[name] if isinstance(name,str) else name,0x301ff000,count=10000000)
 if u.reg_read(UC_ARM64_REG_PC)!=0x301ff000:raise RuntimeError('Instruction budget exceeded')
 return u.reg_read(UC_ARM64_REG_X0)
for init in [0x60af8,0x60f08,0x612a8,0x612d0]:
 print('constructor',hex(init),flush=True);call(init)
state=call('luaL_newstate');print('state',hex(state),flush=True)
key=(ROOT/'research/raw/lua-public-key.txt').read_bytes();kp=alloc(len(key)+1);u.mem_write(kp,key+b'\0')
print('set parser key',call('lua_spl',state,kp,len(key)),flush=True)
assets=json.loads((ROOT/'research/symbols/text-assets.json').read_text())
asset=next(x for x in assets if x['name']=='BattleRequest.lua');b=(Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/asset['output']).read_bytes()
buf=alloc(len(b));u.mem_write(buf,b);name=alloc(32);u.mem_write(name,b'BattleRequest.lua\0')
ret=call('luaL_loadbufferx',state,buf,len(b),name,0);print('parse result',ret,flush=True)
if ret:
 print('error',string(call('lua_tolstring',state,0xffffffffffffffff,0)));print('recent parser calls',list(calls))
else:
 p=call('lua_topointer',state,0xffffffffffffffff);print('closure',hex(p),bytes(u.mem_read(p,64)).hex())
 proto=struct.unpack('<Q',u.mem_read(p+24,8))[0];code=struct.unpack('<Q',u.mem_read(proto+64,8))[0];count=struct.unpack('<I',u.mem_read(proto+24,4))[0]
 print('proto tail',bytes(u.mem_read(proto+128,100)).hex(),flush=True)
 def readcode(uc,access,address,size,value,data):
  if address==code:print('first fetch',hex(u.reg_read(UC_ARM64_REG_PC)),'LR',hex(u.reg_read(UC_ARM64_REG_X30)),flush=True)
 u.hook_add(UC_HOOK_MEM_READ,readcode,begin=code,end=code+count*4-1)
 def decode_entry(uc,addr,size,data):print('decode args',[hex(u.reg_read(UC_ARM64_REG_X0+j)) for j in range(4)],'proto',hex(proto),'state',hex(state),flush=True)
 u.hook_add(UC_HOOK_CODE,decode_entry,begin=0x162cdc,end=0x162cdc)
 def readproto(uc,access,address,size,value,data):
  pc=u.reg_read(UC_ARM64_REG_PC)
  if 0x162cdc<=pc<0x164000:print('decoder proto read',hex(pc),address-proto,size,bytes(u.mem_read(address,size)).hex(),flush=True)
 u.hook_add(UC_HOOK_MEM_READ,readproto,begin=proto,end=proto+512)
 globals_seen=set()
 def readglobal(uc,access,address,size,value,data):
  pc=u.reg_read(UC_ARM64_REG_PC)
  if 0x162cdc<=pc<0x164000 and address not in globals_seen:
   globals_seen.add(address);print('decoder global',hex(pc),hex(address),size,bytes(u.mem_read(address,size)).hex(),flush=True)
 u.hook_add(UC_HOOK_MEM_READ,readglobal,begin=0x200000,end=0x280000)
 try:print('pcall',call('lua_pcallk',state,0,0,0,0,0),flush=True)
 except RuntimeError as error:print('Stopped at unsupported import',str(error)[:100])
 print('after code',bytes(u.mem_read(code,count*4)).hex())

