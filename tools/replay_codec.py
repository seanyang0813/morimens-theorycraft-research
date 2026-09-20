"""Decode Morimens replay payloads with the copied client's native Lua codecs.

This module performs no download and reads no process memory. Callers supply the
original replay JSON bytes and choose the JSON-string byte convention explicitly.
"""
from __future__ import annotations
import base64
import ctypes as C
import json
import os
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


class ReplayCodec:
    def __init__(self):
        directory=ROOT/'research/raw/pc/Morimens_Data/Plugins/x86_64';self.directory=os.add_dll_directory(str(directory));self.lib=C.CDLL(str(directory/'xlua.dll'))
        P,I,S=C.c_void_p,C.c_int,C.c_char_p
        def api(name,result,*args):
            fn=getattr(self.lib,name);fn.restype=result;fn.argtypes=list(args);return fn
        self.new=api('luaL_newstate',P);self.close=api('lua_close',None,P);self.libs=api('luaL_openlibs',None,P)
        self.call=api('lua_pcallk',I,P,I,I,I,C.c_ssize_t,P);self.setglobal=api('lua_setglobal',None,P,S);self.top=api('lua_settop',None,P,I)
        self.getglobal=api('lua_getglobal',I,P,S);self.getfield=api('lua_getfield',I,P,I,S)
        self.nil=api('lua_pushnil',None,P);self.tonumber=api('lua_tonumberx',C.c_double,P,I,P)
        self.table=api('lua_createtable',None,P,I,I);self.setfield=api('lua_setfield',None,P,I,S);self.rawseti=api('lua_rawseti',None,P,I,C.c_longlong)
        self.pushinteger=api('lua_pushinteger',None,P,C.c_longlong);self.pushnumber=api('lua_pushnumber',None,P,C.c_double);self.pushboolean=api('lua_pushboolean',None,P,I)
        self.state=self.new();self.libs(self.state)
        self.pushlstring=self.lib.lua_pushlstring;self.pushlstring.argtypes=[P,C.c_void_p,C.c_size_t];self.pushlstring.restype=C.c_void_p
        self.tolstring=self.lib.lua_tolstring;self.tolstring.argtypes=[P,I,C.POINTER(C.c_size_t)];self.tolstring.restype=C.c_void_p
        self.lua_type=self.lib.lua_type;self.lua_type.argtypes=[P,I];self.lua_type.restype=I
        self.toboolean=self.lib.lua_toboolean;self.toboolean.argtypes=[P,I];self.toboolean.restype=I
        self.isinteger=self.lib.lua_isinteger;self.isinteger.argtypes=[P,I];self.isinteger.restype=I
        self.tointeger=self.lib.lua_tointegerx;self.tointeger.argtypes=[P,I,P];self.tointeger.restype=C.c_longlong
        self.absindex=self.lib.lua_absindex;self.absindex.argtypes=[P,I];self.absindex.restype=I
        self.next=self.lib.lua_next;self.next.argtypes=[P,I];self.next.restype=I
        for name in [b'lz4',b'cmsgpack']:
            opener=getattr(self.lib,'luaopen_'+name.decode());opener.argtypes=[P];opener.restype=I
            if opener(self.state)!=1:raise RuntimeError(f'Unexpected {name.decode()} module return count')
            self.setglobal(self.state,b'_replay_'+name)

    def _check(self,code):
        if code:raise RuntimeError(self._bytes(-1).decode('utf-8','replace'))

    def _bytes(self,index):
        size=C.c_size_t();ptr=self.tolstring(self.state,index,C.byref(size))
        return C.string_at(ptr,size.value)

    def _value(self,index,depth=0):
        if depth>100:raise ValueError('Replay table nesting exceeds 100 levels')
        L=self.state;kind=self.lua_type(L,index)
        if kind==0:return None
        if kind==1:return bool(self.toboolean(L,index))
        if kind==3:
            return int(self.tointeger(L,index,None)) if self.isinteger(L,index) else self.tonumber(L,index,None)
        if kind==4:
            raw=self._bytes(index)
            try:return raw.decode('utf-8')
            except UnicodeDecodeError:return {'$binaryBase64':base64.b64encode(raw).decode('ascii')}
        if kind!=5:raise ValueError(f'Unsupported decoded Lua value type {kind}')
        absolute=self.absindex(L,index);items=[];self.nil(L)
        while self.next(L,absolute):
            key=self._value(-2,depth+1);value=self._value(-1,depth+1);items.append((key,value));self.top(L,-2)
        if all(isinstance(key,int) and key>0 for key,_ in items):
            keys={key for key,_ in items}
            if keys==set(range(1,len(items)+1)):
                by_key=dict(items);return [by_key[i] for i in range(1,len(items)+1)]
        result={}
        for key,value in items:
            if not isinstance(key,(str,int,float,bool)):raise ValueError('Unsupported replay table key')
            text=str(key).lower() if isinstance(key,bool) else str(key)
            if text in result:raise ValueError('Replay table keys collide after JSON conversion')
            result[text]=value
        return result

    def _push(self,value):
        L=self.state
        if value is None:self.nil(L)
        elif isinstance(value,bool):self.pushboolean(L,int(value))
        elif isinstance(value,int):self.pushinteger(L,value)
        elif isinstance(value,float):self.pushnumber(L,value)
        elif isinstance(value,(str,bytes)):
            raw=value.encode('utf-8') if isinstance(value,str) else value;buf=C.create_string_buffer(raw);self.pushlstring(L,C.cast(buf,C.c_void_p),len(raw))
        elif isinstance(value,list):
            self.table(L,len(value),0)
            for index,item in enumerate(value,1):self._push(item);self.rawseti(L,-2,index)
        elif isinstance(value,dict):
            if any(not isinstance(key,str) for key in value):raise ValueError('Synthetic codec dictionaries require string keys')
            self.table(L,0,len(value))
            for key,item in value.items():self._push(item);self.setfield(L,-2,key.encode('utf-8'))
        else:raise TypeError(f'Cannot push {type(value).__name__} into replay codec')

    def _module_call(self,module,method,argument,result_bytes):
        L=self.state;self.top(L,0);self.getglobal(L,('_replay_'+module).encode());self.getfield(L,-1,method.encode());self._push(argument)
        self._check(self.call(L,1,1,0,0,None));kind=self.lua_type(L,-1)
        if result_bytes and kind!=4:raise ValueError(f'{module}.{method} did not return bytes')
        if not result_bytes and kind==0:raise ValueError(f'{module}.{method} returned nil')
        return self._bytes(-1) if result_bytes else self._value(-1)

    def encode(self,value):
        packed=self._module_call('cmsgpack','pack',value,True);return self._module_call('lz4','compress',packed,True)

    def decode(self,compressed):
        packed=self._module_call('lz4','decompress',compressed,True);data=self._module_call('cmsgpack','unpack',packed,False)
        if not isinstance(data,dict):raise ValueError('Replay outer payload must decode to a table')
        zipped=data.pop('recordZips',[]);records=[]
        if not isinstance(zipped,list):raise ValueError('Replay recordZips must decode to a list')
        for blob in zipped:
            if not isinstance(blob,dict) or set(blob)!={'$binaryBase64'}:raise ValueError('Replay recordZips entry is not binary')
            inner=base64.b64decode(blob['$binaryBase64'],validate=True);inner_packed=self._module_call('lz4','decompress',inner,True);rows=self._module_call('cmsgpack','unpack',inner_packed,False)
            if not isinstance(rows,list):raise ValueError('Replay record chunk must decode to a list')
            records.extend(rows)
        data['unZippedRecord']=records;return data

    def synthetic_fixture(self):
        rows=[{'time':1,'msgId':2,'msgData':{'frameList':[{'eventId':3,'data':{'uid':7,'value':99}}]}}]
        return self.encode({'battleDat':{'stageId':42,'svrRunBattle':True},'recordZips':[self.encode(rows)]})


def container_compstr(path:Path,encoding:str):
    container=json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(container,dict) or not isinstance(container.get('compStr'),str):raise ValueError('Replay container must be a JSON object with string compStr')
    text=container['compStr']
    if encoding=='latin1':
        try:return text.encode('latin-1')
        except UnicodeEncodeError as error:raise ValueError('compStr contains code points outside Latin-1') from error
    if encoding=='utf8':return text.encode('utf-8')
    if encoding=='base64':
        try:return base64.b64decode(text,validate=True)
        except Exception as error:raise ValueError('compStr is not strict base64') from error
    raise ValueError('Encoding must be latin1, utf8 or base64')
