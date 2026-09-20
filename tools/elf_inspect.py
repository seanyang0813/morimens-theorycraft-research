from pathlib import Path
from elftools.elf.elffile import ELFFile
from capstone import Cs,CS_ARCH_ARM64,CS_MODE_ARM
import sys,os
p=Path(__file__).resolve().parents[1]/'research/raw/android/unpacked/lib/arm64-v8a/libxlua.so'
p=p.with_name(os.environ.get('ELF_LIBRARY','libxlua.so'))
with p.open('rb') as f:
    elf=ELFFile(f); syms=elf.get_section_by_name('.dynsym'); md=Cs(CS_ARCH_ARM64,CS_MODE_ARM)
    names=sys.argv[1:] or ['xlua_get_key','rc4_decrypt','lua_load','luaL_loadbufferx']
    symbols=list(syms.iter_symbols())
    for arg in names:
        if arg.startswith('0x'):
            addr=int(arg,16)
            for seg in elf.iter_segments():
                if seg['p_vaddr']<=addr<seg['p_vaddr']+seg['p_filesz']:
                    for i in md.disasm(seg.data()[addr-seg['p_vaddr']:addr-seg['p_vaddr']+700],addr): print(f'{i.address:x}: {i.mnemonic} {i.op_str}')
    for sym in symbols:
        if sym.name not in names:continue
        addr=sym['st_value'];size=sym['st_size'];print(sym.name,hex(addr),size)
        for seg in elf.iter_segments():
            if seg['p_vaddr']<=addr<seg['p_vaddr']+seg['p_filesz']:
                b=seg.data()[addr-seg['p_vaddr']:addr-seg['p_vaddr']+min(size,1800)]
                for i in md.disasm(b,addr):print(f'{i.address:x}: {i.mnemonic} {i.op_str}')
