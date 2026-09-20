"""Normalize the observed extra opcode at index 54 for decompiler inspection.
This is a research translation, not independent evidence of correctness.
"""
from pathlib import Path
import json,struct,sys
ROOT=Path(__file__).resolve().parents[1]
def vi(n):
 assert n>=0
 a=[(n&127)|128];n>>=7
 while n:a.append(n&127);n>>=7
 return bytes(reversed(a))
def st(s):
 if s is None:return vi(0)
 b=s.encode('utf-8');return vi(len(b)+1)+b
def proto(t):
 words=t['instructions_decoded'];assert words[0]&127==54
 words=[(w&~127)|((w&127)-1 if w&127>54 else w&127) for w in words[1:]]
 b=st(t['source'])+vi(t['line'])+vi(t['last_line'])+bytes([t['params'],t['vararg'],t['max_stack']])
 b+=vi(len(words))+struct.pack('<'+'I'*len(words),*words)+vi(len(t['constants']))
 for tag,v in zip(t['constant_tags'],t['constants']):
  b+=bytes([tag])
  if tag in (4,20):b+=st(v)
  elif tag==3:b+=struct.pack('<q',v)
  elif tag==19:b+=struct.pack('<d',v)
  elif tag not in (0,1,17):raise ValueError(tag)
 b+=vi(len(t['upvalues']))+b''.join(bytes([x['instack'],x['idx'],x['kind']]) for x in t['upvalues'])
 b+=vi(len(t['children']))+b''.join(proto(x) for x in t['children'])
 b+=vi(0)+vi(0)+vi(len(t['locals']))
 for x in t['locals']:b+=st(x['name'])+vi(max(0,x['start']-1))+vi(max(0,x['end']-1))
 b+=vi(len(t['upvalues']))+b''.join(st(x['name']) for x in t['upvalues'])
 return b
index=json.loads((ROOT/'research/symbols/lua-index.json').read_text(encoding='utf-8'))
for item in index:
 if len(sys.argv)>1 and item['name'] not in sys.argv[1:]:continue
 p=ROOT/item['prototype'];t=json.loads(p.read_text(encoding='utf-8'))
 if 'instructions_decoded' not in t:continue
 b=b'\x1bLua\x54\x00\x19\x93\r\n\x1a\n\x04\x08\x08'+struct.pack('<qd',0x5678,370.5)+bytes([len(t['upvalues'])])+proto(t)
 out=ROOT/'research/extracted/normalized'/item['name'];out.parent.mkdir(parents=True,exist_ok=True);out.with_suffix('.luac').write_bytes(b)
 print('Normalized',item['name'])
