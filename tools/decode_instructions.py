"""Run only the client's instruction decoding routine on a synthetic Proto buffer."""
from pathlib import Path
from elftools.elf.elffile import ELFFile
from unicorn import Uc,UC_ARCH_ARM64,UC_MODE_ARM
from unicorn.arm64_const import *
import struct,json,sys
ROOT=Path(__file__).resolve().parents[1]
u=Uc(UC_ARCH_ARM64,UC_MODE_ARM)
with (ROOT/'research/raw/android/unpacked/lib/arm64-v8a/libxlua.so').open('rb') as f:
 e=ELFFile(f)
 for s in e.iter_segments():
  if s['p_type']=='PT_LOAD':
   start=s['p_vaddr']&~4095;end=(s['p_vaddr']+s['p_memsz']+4095)&~4095
   u.mem_map(start,end-start);u.mem_write(s['p_vaddr'],s.data())
u.mem_map(0x30000000,0x2000000)
u.reg_write(UC_ARM64_REG_SP,0x30100000);u.reg_write(UC_ARM64_REG_TPIDR_EL0,0x30110000)
def decode(words,chunk_key=107):
 data=struct.pack('<'+'I'*len(words),*words)
 u.mem_write(0x30000000,bytes(256));u.mem_write(0x30200000,data)
 u.mem_write(0x30000018,struct.pack('<I',len(words)));u.mem_write(0x30000040,struct.pack('<Q',0x30200000))
 u.mem_write(0x30000088,struct.pack('<I',chunk_key))
 u.reg_write(UC_ARM64_REG_X0,0x30000000);u.reg_write(UC_ARM64_REG_X30,0x301ff000)
 u.emu_start(0x162cdc,0x301ff000,count=max(1000000,len(words)*5000))
 if u.reg_read(UC_ARM64_REG_PC)!=0x301ff000:raise RuntimeError('Decoder did not return')
 return list(struct.unpack('<'+'I'*len(words),u.mem_read(0x30200000,len(data))))
if __name__=='__main__':
 index=json.loads((ROOT/'research/symbols/lua-index.json').read_text(encoding='utf-8'))
 names=sys.argv[1:] or ['BattleRequest.lua']
 for item in index:
  if item['name'] not in names:continue
  p=ROOT/item['prototype'];tree=json.loads(p.read_text(encoding='utf-8'))
  def walk(t):
   t['instructions_decoded']=decode(t['instructions_encoded'],t['instruction_key'])
   for c in t['children']:walk(c)
  walk(tree);p.write_text(json.dumps(tree,ensure_ascii=False,indent=2),encoding='utf-8')
  print('Decoded',item['name'],tree['instructions_decoded'][:12],flush=True)
