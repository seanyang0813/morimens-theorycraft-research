from pathlib import Path
from elftools.elf.elffile import ELFFile
import struct,json
ROOT=Path(__file__).resolve().parents[1]
with (ROOT/'research/raw/android/unpacked/lib/arm64-v8a/libil2cpp.so').open('rb') as f:
 e=ELFFile(f); rel={r['r_offset']:r['r_addend'] for s in e.iter_sections() if s['sh_type']=='SHT_RELA' for r in s.iter_relocations() if r['r_info_type']==1027}
 def read(a):
  if a in rel:return rel[a]
  for s in e.iter_segments():
   if s['p_vaddr']<=a<s['p_vaddr']+s['p_filesz']:return struct.unpack_from('<Q',s.data(),a-s['p_vaddr'])[0]
 p=read(0x38382b8);v=read(p);print('pointer',hex(p),'usage',hex(v))
 index=(v&0x1fffffff)>>1
 literals=json.loads((ROOT/'research/symbols/android-literals.json').read_text(encoding='utf-8'))
 item=literals[index]
 print('literal index',index,'length',len(item['value']))
 (ROOT/'research/raw/lua-public-key.txt').write_text(item['value'],encoding='utf-8')
