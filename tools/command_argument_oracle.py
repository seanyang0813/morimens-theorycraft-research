"""Original ArgN lookup with explicit numeric arrays and observable fallback reads."""
import json
import ctypes as C
from state_owner_target_oracle import StateOwnerOracle, ROOT

class ArgumentOracle(StateOwnerOracle):
    def __init__(self):
        super().__init__()
        self.rawseti = self.lib.lua_rawseti
        self.rawseti.argtypes = [C.c_void_p, C.c_int, C.c_longlong]
        self.rawseti.restype = None
        self.getglobal(self.state, b'string')
        def replace(s):
            try:
                self.pushstring(s, self.string(s, 1, None).replace(self.string(s, 2, None), self.string(s, 3, None)))
            except Exception as error:
                self.errors.append(str(error)); self.nil(s)
            return 1
        self.method('replace', replace)
        self.top(self.state, 0)

    def run(self, value):
        L = self.state
        self.top(L, 0)
        self.reads = 0
        self.table(L, 0, 3)
        def array(values):
            self.table(L, len(values), 0)
            for i, number in enumerate(values, 1):
                if number is not None:
                    self.number(L, number)
                    self.rawseti(L, -2, i)
        array(value['skillArgs'])
        self.setfield(L, -2, b'skillArgs')
        self.pushstring(L, b'observable-fallback')
        self.setfield(L, -2, b'configPara')
        def fallback(s):
            self.reads += 1
            try:
                array(value['fallbackValues'])
            except Exception as error:
                self.errors.append(str(error)); self.table(s, 0, 0)
            return 1
        self.method('GetValueListByCmd', fallback)
        self.setglobal(L, b'_argument_subject')
        values = []
        for index in value['indices']:
            self.top(L, 0)
            self.getglobal(L, b'_target_parser')
            self.getfield(L, -1, b'GetGlobalValue')
            self.getglobal(L, b'_argument_subject')
            self.pushstring(L, ('Arg' + str(index)).encode())
            self.check(self.call(L, 2, 1, 0, 0, None))
            values.append(self.tonumber(L, -1, None))
        if self.errors:
            raise RuntimeError(self.errors)
        return {'values': values, 'fallbackReads': self.reads}

if __name__ == '__main__':
    oracle = ArgumentOracle()
    cases = [{'skillArgs': args, 'fallbackValues': fallback, 'indices': [1, 2, 3, 1]}
             for args in [[], [0], [1.25], [None, -2.5], [0, 0, 3]]
             for fallback in [[], [8], [0, 2.75], [-1, 0, 4.5]]]
    report = {'kind': 'SYNTHETIC_ORIGINAL_RUNTIME', 'build': 'pc-res144-build51',
              'scope': 'Original GetGlobalValue ArgN branch; numeric skillArgs and fallback list supplied, string.replace adapter. No expression evaluation, command execution or gameplay.',
              'sourceHashes': {'BattleCmdParser': oracle.assets['BattleCmdParser.lua']['sha256']},
              'fixtures': [{'input': v, 'expected': oracle.run(v)} for v in cases]}
    (ROOT / 'tests/synthetic/original-command-arguments.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Generated', len(cases), 'original argument lookup cases')
