"""Compare only selected installed Tentacle producer/alias method bodies to res144."""
import ctypes as C
import hashlib
import json
import os
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from decode_instructions import decode

DIRECTORY = ROOT / 'research/raw/pc/Morimens_Data/Plugins/x86_64'
_handle = os.add_dll_directory(str(DIRECTORY))
lib = C.CDLL(str(DIRECTORY / 'xlua.dll'))


def api(name, result, args):
    fn = getattr(lib, name)
    fn.restype, fn.argtypes = result, args
    return fn


new = api('luaL_newstate', C.c_void_p, [])
close = api('lua_close', None, [C.c_void_p])
load = api('xluaL_loadbuffer', C.c_int, [C.c_void_p, C.c_char_p, C.c_int, C.c_char_p])
spl = api('lua_spl', C.c_int, [C.c_void_p, C.c_char_p, C.c_int])
pointer = api('lua_topointer', C.c_void_p, [C.c_void_p, C.c_int])


def ptr(address):
    return C.c_void_p.from_address(address).value or 0


def integer(address):
    return C.c_int.from_address(address).value


def string(address):
    if not address:
        return None
    tag = C.c_ubyte.from_address(address + 8).value & 63
    length = C.c_ubyte.from_address(address + 11).value if tag == 4 else C.c_size_t.from_address(address + 16).value
    return C.string_at(address + 24, length).decode('utf-8', 'replace')


def runtime_prototypes(address):
    count, instructions, children = integer(address + 20), integer(address + 24), integer(address + 32)
    constants, tags = [], []
    for n in range(count):
        value = ptr(address + 56) + n * 16
        tag = C.c_ubyte.from_address(value + 8).value & 63
        tags.append(tag)
        if tag in (4, 20):
            constants.append(string(ptr(value)))
        elif tag == 3:
            constants.append(C.c_int64.from_address(value).value)
        elif tag == 19:
            constants.append(C.c_double.from_address(value).value)
        elif tag in (1, 17):
            constants.append(tag == 17)
        elif tag == 0:
            constants.append(None)
        else:
            raise ValueError('Unexpected Lua constant tag')
    words = list(struct.unpack('<' + 'I' * instructions, C.string_at(ptr(address + 64), instructions * 4)))
    result = [{'constants': constants, 'constant_tags': tags, 'instructions_decoded': decode(words, integer(address + 136))}]
    for n in range(children):
        result.extend(runtime_prototypes(ptr(ptr(address + 72) + n * 8)))
    return result


def original_method(name, marker):
    index = json.loads((ROOT / 'research/symbols/lua-index.json').read_text(encoding='utf-8'))
    path = ROOT / next(row['prototype'] for row in index if row['name'] == name)
    tree = json.loads(path.read_text(encoding='utf-8'))
    matches = []
    def walk(row):
        if marker in row['constants']:
            matches.append(row)
        for child in row['children']:
            walk(child)
    walk(tree)
    if len(matches) != 1:
        raise ValueError(f'Expected one original {marker} body')
    return matches[0]


def installed_method(name, marker):
    module = ROOT / 'research/observations/current-res151-build51/modules' / name
    payload = module.read_bytes()
    state = new()
    key = (ROOT / 'research/raw/lua-public-key.txt').read_bytes()
    spl(state, key, len(key))
    try:
        if load(state, payload, len(payload), name.encode()) != 0:
            raise RuntimeError(f'Could not load installed {name}')
        matches = [row for row in runtime_prototypes(ptr(pointer(state, -1) + 24)) if marker in row['constants']]
        if len(matches) != 1:
            raise ValueError(f'Expected one installed {marker} body')
        return matches[0], hashlib.sha256(payload).hexdigest()
    finally:
        close(state)


def main():
    methods = []
    for name, marker, label in [
        ('BattleUnitPlayer.lua', 'TentacleDamageForPowerPercent', 'GetTentacleDamage'),
        ('BattleCmdParser.lua', 'GetTentacleDamage', 'PlayerRole.tentacle_dmg alias')]:
        old = original_method(name, marker)
        current, source_hash = installed_method(name, marker)
        old_body = old['instructions_decoded'][1:]
        current_body = current['instructions_decoded'][1:]
        if old['constants'] != current['constants'] or old['constant_tags'] != current['constant_tags'] or old_body != current_body:
            raise ValueError(f'Installed {label} changed')
        methods.append({'module': name, 'method': label, 'installedModuleSha256': source_hash,
                        'instructionCountExcludingSyntheticPrefix': len(current_body),
                        'decodedBodySha256': hashlib.sha256(struct.pack('<' + 'I' * len(current_body), *current_body)).hexdigest(),
                        'constantsIdentical': True, 'decodedBodyIdentical': True})
    report = {'schemaVersion': 1, 'kind': 'MORIMENS_PC_TENTACLE_SOURCE_METHOD_PARITY',
              'baselineBuild': 'pc-res144-build51', 'installedBuild': 'pc-res151-build51',
              'status': 'SELECTED_METHOD_BODIES_IDENTICAL', 'methods': methods,
              'scope': 'Selected GetTentacleDamage producer and PlayerRole.tentacle_dmg expression alias methods only; whole modules and external dependencies are not asserted identical.',
              'limitations': ['Method-body parity is not replay engine-version attribution or gameplay validation.',
                              'Awakener, state, target and BeHit dependencies require separate checks.']}
    output = ROOT / 'research/evidence/pc-res151-tentacle-source-parity.json'
    output.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print('Selected installed Tentacle method bodies identical:', len(methods))


if __name__ == '__main__':
    main()
