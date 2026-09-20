from pathlib import Path
import struct,json,re
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'research/symbols';out.mkdir(parents=True,exist_ok=True)
for label,p in [('pc',ROOT/'research/raw/pc/Morimens_Data/il2cpp_data/Metadata/global-metadata.dat'),('android',ROOT/'research/raw/android/unpacked/assets/bin/Data/Managed/Metadata/global-metadata.dat')]:
    b=p.read_bytes();magic,version,lo,ln,do,dn,so,sn=struct.unpack_from('<8I',b)
    literals=[]
    for i in range(0,ln,8):
        length,offset=struct.unpack_from('<II',b,lo+i)
        literals.append({'index':i//8,'value':b[do+offset:do+offset+length].decode('utf-8','replace')})
    strings=b[so:so+sn].decode('utf-8','replace').split('\0')
    (out/f'{label}-literals.json').write_text(json.dumps(literals,ensure_ascii=False,indent=2),encoding='utf-8')
    (out/f'{label}-strings.txt').write_text('\n'.join(strings),encoding='utf-8')
    print(label,'metadata',version,'literals',len(literals),'strings',len(strings))
    print('loader literals', [x for x in literals if re.search('(?i)decrypt|encrypt|luascript|setassetbundle|startup',x['value']) and len(x['value'])<250][:35])
