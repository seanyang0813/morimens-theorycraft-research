"""Static, identifier-free comparison of installed and historical ItemDataUtils."""
from __future__ import annotations

import ctypes as C
import hashlib
import json
import os
import struct
from pathlib import Path

from decode_instructions import decode

ROOT = Path(__file__).resolve().parents[1]
OLD_SOURCE = ROOT / "research/extracted/pc/downloaded/gamescript/-3355508087574879854_ItemDataUtils.lua"
CURRENT_SOURCE = ROOT / "research/observations/current-res151-build51/modules/ItemDataUtils.lua"
OUTPUT = ROOT / "research/evidence/pc-res151-item-data-utils-parity.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_proto(source: Path) -> dict:
    directory = ROOT / "research/raw/pc/Morimens_Data/Plugins/x86_64"
    os.add_dll_directory(str(directory))
    lib = C.CDLL(str(directory / "xlua.dll"))
    def api(name, result, *args):
        function = getattr(lib, name)
        function.restype, function.argtypes = result, list(args)
        return function
    new = api("luaL_newstate", C.c_void_p)
    close = api("lua_close", None, C.c_void_p)
    load = api("xluaL_loadbuffer", C.c_int, C.c_void_p, C.c_char_p, C.c_int, C.c_char_p)
    spl = api("lua_spl", C.c_int, C.c_void_p, C.c_char_p, C.c_int)
    pointer = api("lua_topointer", C.c_void_p, C.c_void_p, C.c_int)
    p = lambda address: C.c_void_p.from_address(address).value or 0
    integer = lambda address: C.c_int.from_address(address).value
    def string(address):
        if not address:
            return None
        tag = C.c_ubyte.from_address(address + 8).value & 63
        length = C.c_ubyte.from_address(address + 11).value if tag == 4 else C.c_size_t.from_address(address + 16).value
        if length > 10_000_000:
            raise ValueError("Bad Lua string length")
        return C.string_at(address + 24, length).decode("utf-8", "replace")
    def proto(address):
        constant_count, instruction_count, child_count = integer(address + 20), integer(address + 24), integer(address + 32)
        if min(constant_count, instruction_count, child_count) < 0 or max(constant_count, instruction_count, child_count) > 1_000_000:
            raise ValueError("Bad Lua prototype bounds")
        base = p(address + 56)
        constants = []
        for index in range(constant_count):
            at = base + index * 16
            tag = C.c_ubyte.from_address(at + 8).value & 63
            if tag in (4, 20): value = string(p(at))
            elif tag == 3: value = C.c_int64.from_address(at).value
            elif tag == 19: value = C.c_double.from_address(at).value
            elif tag in (1, 17): value = tag == 17
            elif tag == 0: value = None
            else: raise ValueError(f"Unexpected Lua constant tag {tag}")
            constants.append(value)
        encoded = list(struct.unpack("<" + "I" * instruction_count,
                                     C.string_at(p(address + 64), instruction_count * 4)))
        upvalues = []
        for index in range(integer(address + 16)):
            at = p(address + 80) + index * 16
            upvalues.append({"name": string(p(at)),
                             "instack": C.c_ubyte.from_address(at + 8).value,
                             "idx": C.c_ubyte.from_address(at + 9).value,
                             "kind": C.c_ubyte.from_address(at + 10).value})
        return {"params": C.c_ubyte.from_address(address + 10).value,
                "vararg": C.c_ubyte.from_address(address + 11).value,
                "maxStack": C.c_ubyte.from_address(address + 12).value,
                "constants": constants, "upvalues": upvalues,
                "instructions": decode(encoded, integer(address + 136))[1:],
                "children": [proto(p(p(address + 72) + index * 8)) for index in range(child_count)]}
    state = new()
    try:
        key = (ROOT / "research/raw/lua-public-key.txt").read_bytes()
        if spl(state, key, len(key)) != 0:
            raise RuntimeError("Client Lua key rejected")
        data = source.read_bytes()
        if load(state, data, len(data), b"ItemDataUtils.lua") != 0:
            raise RuntimeError("Copied bytecode failed to load")
        return proto(p(pointer(state, -1) + 24))
    finally:
        close(state)


def main() -> None:
    current = read_proto(CURRENT_SOURCE)
    historical = read_proto(OLD_SOURCE)
    if len(current["children"]) != 182 or len(historical["children"]) != 182:
        raise ValueError("Unexpected ItemDataUtils prototype layout")
    equal = [i for i, (a, b) in enumerate(zip(current["children"], historical["children"])) if a == b]
    changed = [i for i in range(182) if i not in equal]
    focused = [71, 111, 112, 113, 114]
    if not all(i in equal for i in focused):
        raise ValueError("Focused item/attribute functions differ")
    report = {
        "schemaVersion": 1, "kind": "MORIMENS_PC_RES151_ITEM_DATA_UTILS_PARITY",
        "analysisTrack": "mechanics", "status": "FOCUSED_FUNCTION_BODIES_EQUAL",
        "builds": ["pc-res144-build51", "pc-res151-build51"],
        "sourceHashes": {"historicalBytecodeSha256": sha256(OLD_SOURCE),
                         "installedBytecodeSha256": sha256(CURRENT_SOURCE)},
        "normalization": "Client instruction decryption, omitting the first per-Proto key header word; parameters, stack size, constants, child structure and remaining instructions compared exactly.",
        "directFunctions": {"compared": 182, "equal": len(equal), "changed": len(changed), "changedPrototypeIndices": changed},
        "focusedFunctions": [
            {"prototypeIndex": i, "role": role, "bodyEqual": True}
            for i, role in [(71, "Weapon item construction candidate"),
                            (111, "Stored item attribute access candidate"),
                            (112, "Weapon attribute name candidate"),
                            (113, "Weapon attribute display value candidate"),
                            (114, "Weapon subattribute candidate")]],
        "limitations": [
            "Prototype roles are inferred from constants and historical source location; this does not prove every caller or server-side attribute calculation.",
            "Other module functions differ. Focused parity does not establish installed enhancement scaling, a Wheel passive or battle-property assembly.",
            "Bytecode was loaded but not executed. This is static mechanics evidence, not gameplay validation or holdout credit.",
            "No original bytecode, instructions, private paths, replay data or player identifiers are published."],
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"output": str(OUTPUT.relative_to(ROOT)), **report["directFunctions"], "focusedEqual": len(focused)}))


if __name__ == "__main__":
    main()
