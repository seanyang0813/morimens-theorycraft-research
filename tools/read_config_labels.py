"""Print selected private config labels with Lua decimal escapes decoded."""
from pathlib import Path
import re, sys
ROOT=Path(__file__).resolve().parents[1]
text=(ROOT/'research/extracted/normalized/BattleApi.decompiled.lua').read_text(encoding='utf-8-sig')
def decode(value):
    data=re.sub(r'\\(\d{1,3})',lambda m:chr(int(m[1])),value)
    return data.encode('latin-1').decode('utf-8')
for match in re.finditer(r'ID = "([^"\n]+)",\s*CnID = "([^"\n]+)"',text):
    key,label=match.groups()
    if any(term.lower() in key.lower() for term in sys.argv[1:]):
        print(key,decode(label))
