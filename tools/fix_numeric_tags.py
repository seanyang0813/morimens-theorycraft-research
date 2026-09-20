"""Repair the research index's swapped Lua54 int/float interpretation.
Serialized binary bits and prior decompiler output were unaffected.
"""
from pathlib import Path
import json,struct
ROOT=Path(__file__).resolve().parents[1]
for path in (ROOT/'research/extracted/prototypes').rglob('*.json'):
    tree=json.loads(path.read_text(encoding='utf-8'))
    if tree.get('numeric_tags_corrected'):continue
    def visit(t):
        for i,tag in enumerate(t['constant_tags']):
            if tag==3:t['constants'][i]=struct.unpack('<q',struct.pack('<d',t['constants'][i]))[0]
            elif tag==19:t['constants'][i]=struct.unpack('<d',struct.pack('<q',t['constants'][i]))[0]
        for child in t['children']:visit(child)
    visit(tree)
    tree['numeric_tags_corrected']=True
    path.write_text(json.dumps(tree,ensure_ascii=False,indent=2),encoding='utf-8')
print('Corrected numeric tag interpretation in research prototypes')
