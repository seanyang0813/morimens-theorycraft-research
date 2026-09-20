from pathlib import Path
from elftools.elf.elffile import ELFFile
import struct,sys,os
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'research/raw/android/unpacked/lib/arm64-v8a'/os.environ.get('ELF_LIBRARY','libtuanjie.so')
targets=[int(x,16) for x in sys.argv[1:]]
with p.open('rb') as f:
 e=ELFFile(f)
 for sec in e.iter_sections():
  if not sec['sh_flags']&4:continue
  b=sec.data();base=sec['sh_addr']
  for off in range(0,len(b)-4,4):
   w=struct.unpack_from('<I',b,off)[0]
   if w>>26==0x25:
    n=w&0x3ffffff
    if n&0x2000000:n-=0x4000000
    if base+off+n*4 in targets:print(hex(base+off+n*4),'call',hex(base+off))
   if w&0x9f000000!=0x90000000:continue
   imm=((w>>29)&3)|(((w>>5)&0x7ffff)<<2)
   if imm&(1<<20):imm-=1<<21
   page=((base+off)&~4095)+(imm<<12);reg=w&31
   for target in targets:
    if page!=target&~4095:continue
    for k in range(off+4,min(off+44,len(b)-3),4):
     v=struct.unpack_from('<I',b,k)[0]
     if v&0xffc00000==0x91000000 and (v>>5)&31==reg and page+((v>>10)&4095)==target:print(hex(target),'xref',hex(base+off),hex(base+k))
