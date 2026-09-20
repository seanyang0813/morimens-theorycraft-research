"""Offline synthetic oracle using copied original bytecode; never a gameplay observation."""
from pathlib import Path
import ctypes as C
import json
import os

ROOT = Path(__file__).resolve().parents[1]

class Oracle:
    def __init__(self):
        directory = ROOT / 'research/raw/pc/Morimens_Data/Plugins/x86_64'
        self.directory = os.add_dll_directory(str(directory))
        self.lib = C.CDLL(str(directory / 'xlua.dll'))
        def api(name, result, *args):
            fn = getattr(self.lib, name)
            fn.restype, fn.argtypes = result, list(args)
            return fn
        P, I, S = C.c_void_p, C.c_int, C.c_char_p
        self.new = api('luaL_newstate', P)
        self.close = api('lua_close', None, P)
        self.libs = api('luaL_openlibs', None, P)
        self.spl = api('lua_spl', I, P, S, I)
        self.load = api('xluaL_loadbuffer', I, P, S, I, S)
        self.call = api('lua_pcallk', I, P, I, I, I, C.c_ssize_t, P)
        self.getglobal = api('lua_getglobal', I, P, S)
        self.setglobal = api('lua_setglobal', None, P, S)
        self.getfield = api('lua_getfield', I, P, I, S)
        self.setfield = api('lua_setfield', None, P, I, S)
        self.table = api('lua_createtable', None, P, I, I)
        self.number = api('lua_pushnumber', None, P, C.c_double)
        self.tonumber = api('lua_tonumberx', C.c_double, P, I, P)
        self.string = api('lua_tolstring', S, P, I, P)
        self.top = api('lua_settop', None, P, I)
        self.pushclosure = api('lua_pushcclosure', None, P, P, I)
        self.pushvalue = api('lua_pushvalue', None, P, I)
        self.state = self.new()
        key = (ROOT / 'research/raw/lua-public-key.txt').read_bytes()
        self.spl(self.state, key, len(key))
        self.libs(self.state)
        self.assets = {a['name']: a for a in json.loads((ROOT / 'research/symbols/text-assets.json').read_text(encoding='utf-8'))}
        self.module('BattleConst')
        self.setglobal(self.state, b'_oracle_bc')
        @C.CFUNCTYPE(I, P)
        def readonly(state):
            self.pushvalue(state, 1)
            return 1
        self.readonly = readonly
        self.table(self.state, 0, 1)
        self.pushclosure(self.state, readonly, 0)
        self.setfield(self.state, -2, b'readonly')
        self.setglobal(self.state, b'_oracle_config_system')
        @C.CFUNCTYPE(I, P)
        def require(state):
            name = self.string(state, 1, None)
            if name == b'System.System':
                self.getglobal(state, b'_oracle_config_system')
                return 1
            if name != b'Battle.BattleConst':
                raise RuntimeError('Unexpected dependency: ' + repr(name))
            self.getglobal(state, b'_oracle_bc')
            return 1
        self.require = require
        self.pushclosure(self.state, require, 0)
        self.setglobal(self.state, b'require')
        self.module('BattleUtilServer')
        self.setglobal(self.state, b'_oracle_util')

    def check(self, code):
        if code:
            raise RuntimeError(self.string(self.state, -1, None))

    def module(self, name, asset=None):
        data = (ROOT / (asset or self.assets[name + '.lua'])['output']).read_bytes()
        self.check(self.load(self.state, data, len(data), name.encode()))
        self.check(self.call(self.state, 0, 1, 0, 0, None))

    def damage(self, values):
        L = self.state
        self.top(L, 0)
        self.getglobal(L, b'_oracle_util')
        self.getfield(L, -1, b'ShowDamageFormula')
        self.table(L, 0, len(values))
        for name, value in values.items():
            self.number(L, value)
            self.setfield(L, -2, name.encode())
        self.check(self.call(L, 1, 2, 0, 0, None))
        return [self.tonumber(L, -2, None), self.tonumber(L, -1, None)]

if __name__ == '__main__':
    oracle = Oracle()
    print(oracle.damage({'value': 100, 'skillTypeOutsideDmgPer': 1, 'skillTypeDmgPer': 1, 'skillTypeInsideDmgPer': 1}))
