"""Parse the packaged Android startup Lua archive without executing its chunk.

The archive is byte-identical to the PC startup copy, so the copied legitimate
Windows XLua loader can deserialize it under the loader's normal parser
initialization. Only aggregate, hash and endpoint-category evidence is public.
"""
from pathlib import Path
import ctypes as C
import hashlib
import json
import os
import re
from urllib.parse import urlparse

ROOT=Path(__file__).resolve().parents[1]
ARCHIVE=ROOT/'research/raw/android/unpacked/assets/luascript_update.archive'
LOADER_DIR=ROOT/'research/raw/pc/Morimens_Data/Plugins/x86_64'
LOADER=LOADER_DIR/'xlua.dll'
KEY=ROOT/'research/raw/lua-public-key.txt'
OUTPUT=ROOT/'research/evidence/android-startup-lua-inspection.json'

os.add_dll_directory(str(LOADER_DIR))
lib=C.CDLL(str(LOADER))
def api(name,restype,argtypes):
    fn=getattr(lib,name);fn.restype=restype;fn.argtypes=argtypes;return fn
new=api('luaL_newstate',C.c_void_p,[])
close=api('lua_close',None,[C.c_void_p])
load=api('xluaL_loadbuffer',C.c_int,[C.c_void_p,C.c_char_p,C.c_int,C.c_char_p])
set_parser_key=api('lua_spl',C.c_int,[C.c_void_p,C.c_char_p,C.c_int])
pointer=api('lua_topointer',C.c_void_p,[C.c_void_p,C.c_int])
to_string=api('lua_tolstring',C.c_char_p,[C.c_void_p,C.c_int,C.c_void_p])

def ptr(address):return C.c_void_p.from_address(address).value or 0
def integer(address):return C.c_int.from_address(address).value
def lua_string(address):
    if not address:return None
    tag=C.c_ubyte.from_address(address+8).value&63
    length=C.c_ubyte.from_address(address+11).value if tag==4 else C.c_size_t.from_address(address+16).value
    if length>10_000_000:raise ValueError('Implausible Lua string length')
    return C.string_at(address+24,length).decode('utf-8','replace')

strings=[];sources=[]
def inspect_proto(address):
    constant_count,code_count,child_count=integer(address+20),integer(address+24),integer(address+32)
    if min(constant_count,code_count,child_count)<0 or max(constant_count,code_count,child_count)>10_000_000:raise ValueError('Implausible Lua prototype bounds')
    source=lua_string(ptr(address+112));sources.append(source)
    constants=ptr(address+56)
    for index in range(constant_count):
        value=constants+index*16;tag=C.c_ubyte.from_address(value+8).value&63
        if tag in (4,20):strings.append(lua_string(ptr(value)))
    total=1
    children=ptr(address+72)
    for index in range(child_count):total+=inspect_proto(ptr(children+index*8))
    return total

archive_bytes=ARCHIVE.read_bytes();key_bytes=KEY.read_bytes();state=new()
if not state:raise RuntimeError('Failed to create copied XLua state')
try:
    if set_parser_key(state,key_bytes,len(key_bytes))!=0:raise RuntimeError('Copied loader rejected its parser initialization')
    result=load(state,archive_bytes,len(archive_bytes),b'luascript_update.archive')
    if result:raise RuntimeError((to_string(state,-1,None) or b'unknown parse error').decode('utf-8','replace'))
    closure=pointer(state,-1);prototype_count=inspect_proto(ptr(closure+24))
finally:close(state)

urls=sorted({value for value in strings if re.match(r'^https?://',value,re.I)})
telemetry=[value for value in urls if sources[0].endswith('ApusUpdateComp.lua') and urlparse(value).path.endswith('/v1/logs')]
resource_urls=[value for value in urls if value not in telemetry]
literal_hash=hashlib.sha256(json.dumps(strings,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
report={
    'schemaVersion':1,
    'kind':'MORIMENS_ANDROID_STARTUP_LUA_INSPECTION',
    'status':'PARSED_WITHOUT_EXECUTION',
    'sourceHashes':{'androidStartupArchive':hashlib.sha256(archive_bytes).hexdigest(),'copiedParserRuntime':hashlib.sha256(LOADER.read_bytes()).hexdigest(),'orderedStringConstants':literal_hash},
    'rootSource':sources[0],
    'prototypeCount':prototype_count,
    'stringConstantCount':len(strings),
    'uniqueStringConstantCount':len(set(strings)),
    'literalUrlClassification':{'total':len(urls),'telemetry':len(telemetry),'resourceDownloadCandidates':len(resource_urls)},
    'scope':'Protected packaged Android startup Lua deserialized by the copied legitimate loader without executing the chunk; aggregate prototype/string inventory and literal URL classification only.',
    'limitations':[
        'The only literal URL is classified as telemetry from its host/path and surrounding startup component; its value is not published',
        'No literal resource-download URL does not exclude dynamically assembled, encrypted, server-supplied or later-downloaded endpoints',
        'The startup component is not a combat module and establishes no Android/PC formula parity',
        'The copied Windows parser demonstrates compatible deserialization of byte-identical startup bytes; it is not Android runtime execution'
    ]
}
OUTPUT.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps({'status':report['status'],'prototypeCount':prototype_count,'stringConstantCount':len(strings),'literalUrlClassification':report['literalUrlClassification']}))
