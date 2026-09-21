"""Inspect the copied PC transport schema without making a network request.

The report intentionally contains hashes and a protocol-name catalog only. It
does not publish the schema bytes, the AssetBundle key, or client credentials.
"""
from __future__ import annotations

import ctypes as C
import hashlib
import json
import os
import re
from pathlib import Path

import UnityPy
import lz4.block
from UnityPy.helpers.ArchiveStorageManager import ArchiveStorageDecryptor
from UnityPy.streams import EndianBinaryReader


ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "research/raw/pc/bundled/sproto.ab"
KEY = ROOT / "research/raw/bundle-key.bin"
LUA_KEY = ROOT / "research/raw/lua-public-key.txt"
XLUA = ROOT / "research/raw/pc/Morimens_Data/Plugins/x86_64/xlua.dll"
SPROTO_LUA = ROOT / "research/extracted/pc/downloaded/foundation/7730302073327680731_sproto.lua"
OUTPUT = ROOT / "research/evidence/pc-protocol-bundle-inspection.json"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class NativeSproto:
    """Small read-only adapter around the copied client's sproto.core."""

    def __init__(self, schema: bytes):
        directory = XLUA.parent.resolve()
        self._dll_directory = os.add_dll_directory(str(directory))
        self.lib = C.CDLL(str(XLUA.resolve()))
        P, I, S = C.c_void_p, C.c_int, C.c_char_p

        def api(name, result, *args):
            fn = getattr(self.lib, name)
            fn.restype = result
            fn.argtypes = list(args)
            return fn

        self.new = api("luaL_newstate", P)
        self.close = api("lua_close", None, P)
        self.libs = api("luaL_openlibs", None, P)
        self.spl = api("lua_spl", I, P, S, I)
        self.load = api("xluaL_loadbuffer", I, P, S, I, S)
        self.call = api("lua_pcallk", I, P, I, I, I, C.c_ssize_t, P)
        self.setglobal = api("lua_setglobal", None, P, S)
        self.getglobal = api("lua_getglobal", I, P, S)
        self.getfield = api("lua_getfield", I, P, I, S)
        self.settop = api("lua_settop", None, P, I)
        self.pushclosure = api("lua_pushcclosure", None, P, P, I)
        self.lua_type = api("lua_type", I, P, I)
        self.tointeger = api("lua_tointegerx", C.c_longlong, P, I, P)
        self.pushlstring = self.lib.lua_pushlstring
        self.pushlstring.argtypes = [P, C.c_void_p, C.c_size_t]
        self.pushlstring.restype = P
        self.tolstring = self.lib.lua_tolstring
        self.tolstring.argtypes = [P, I, C.POINTER(C.c_size_t)]
        self.tolstring.restype = P

        self.state = self.new()
        lua_key = LUA_KEY.read_bytes()
        self.spl(self.state, lua_key, len(lua_key))
        self.libs(self.state)

        opener = getattr(self.lib, "luaopen_sproto_core")
        opener.argtypes = [P]
        opener.restype = I
        if opener(self.state) != 1:
            raise RuntimeError("Unexpected sproto.core module return count")
        self.setglobal(self.state, b"_inspect_core")

        @C.CFUNCTYPE(I, P)
        def require_core(state):
            requested = self._bytes(1)
            if requested != b"sproto.core":
                raise RuntimeError("Unexpected module request: " + repr(requested))
            self.getglobal(state, b"_inspect_core")
            return 1

        self._require_core = require_core
        self.pushclosure(self.state, require_core, 0)
        self.setglobal(self.state, b"require")

        module = SPROTO_LUA.read_bytes()
        self._check(self.load(self.state, module, len(module), b"sproto"), "load sproto.lua")
        self._check(self.call(self.state, 0, 1, 0, 0, None), "execute sproto.lua")
        self.setglobal(self.state, b"_inspect_module")

        self.settop(self.state, 0)
        self.getglobal(self.state, b"_inspect_module")
        self.getfield(self.state, -1, b"new")
        self._push_bytes(schema)
        self._check(self.call(self.state, 1, 1, 0, 0, None), "parse proto.spb")
        self.setglobal(self.state, b"_inspect_schema")
        self.settop(self.state, 0)
        self.getglobal(self.state, b"_inspect_schema")
        self.getfield(self.state, -1, b"__cobj")
        self.setglobal(self.state, b"_inspect_cobj")
        self.settop(self.state, 0)

    def _bytes(self, index=-1):
        size = C.c_size_t()
        pointer = self.tolstring(self.state, index, C.byref(size))
        return C.string_at(pointer, size.value) if pointer else None

    def _push_bytes(self, value: bytes):
        buffer = C.create_string_buffer(value)
        self.pushlstring(self.state, C.cast(buffer, C.c_void_p), len(value))

    def _check(self, code, operation):
        if code:
            message = (self._bytes() or b"").decode("utf-8", "replace")
            raise RuntimeError(f"{operation}: {message}")

    def protocol(self, name: str):
        self.settop(self.state, 0)
        self.getglobal(self.state, b"_inspect_core")
        self.getfield(self.state, -1, b"protocol")
        self.getglobal(self.state, b"_inspect_cobj")
        self._push_bytes(name.encode("utf-8"))
        self._check(self.call(self.state, 2, 3, 0, 0, None), "query protocol")
        if self.lua_type(self.state, -3) == 0:
            return None
        return {
            "name": name,
            "tag": int(self.tointeger(self.state, -3, None)),
            "request": self.lua_type(self.state, -2) != 0,
            "response": self.lua_type(self.state, -1) != 0,
        }

    def dispose(self):
        if self.state:
            self.close(self.state)
            self.state = None


def main():
    bundle = BUNDLE.read_bytes()
    UnityPy.set_assetbundle_decrypt_key(KEY.read_bytes())
    reader = EndianBinaryReader(bundle)
    header = {
        "signature": reader.read_string_to_null(),
        "formatVersion": reader.read_u_int(),
        "playerVersion": reader.read_string_to_null(),
        "engineVersion": reader.read_string_to_null(),
        "declaredSize": reader.read_long(),
        "compressedMetadataSize": reader.read_u_int(),
        "uncompressedMetadataSize": reader.read_u_int(),
        "flags": hex(reader.read_u_int()),
    }
    if header["signature"] != "UnityFS" or header["formatVersion"] != 6:
        raise ValueError("Unsupported sproto.ab UnityFS header")
    ArchiveStorageDecryptor(reader)  # validates the copied key signature
    original_offset = reader.Position
    aligned_offset = (original_offset + 15) // 16 * 16
    metadata = lz4.block.decompress(
        bundle[aligned_offset : aligned_offset + header["compressedMetadataSize"]],
        uncompressed_size=header["uncompressedMetadataSize"],
    )
    patched = bundle[:8] + (7).to_bytes(4, "big") + bundle[12:]
    environment = UnityPy.load(patched)
    assets = [obj.read() for obj in environment.objects if obj.type.name == "TextAsset"]
    if len(assets) != 1 or assets[0].m_Name != "proto.spb":
        raise ValueError("Expected one proto.spb TextAsset")
    script = assets[0].m_Script
    schema = script.encode("utf-8", "surrogateescape") if isinstance(script, str) else bytes(script)

    candidates = sorted(
        set(match.decode("ascii") for match in re.findall(rb"[A-Za-z][A-Za-z0-9_.]{2,}", schema) if b"." in match)
    )
    native = NativeSproto(schema)
    try:
        protocols = [entry for name in candidates if (entry := native.protocol(name)) is not None]
        replay_queries = {
            name: native.protocol(name)
            for name in ["QueryOthersRecentReview", "QueryReviewDetail", "QueryReviewDetail2", "GetOSSHeader"]
        }
    finally:
        native.dispose()

    lower = schema.lower()
    searched_terms = ["battleUuid", "buildVersion", "resourceVersion", "recordedCombatBuild"]
    report = {
        "schemaVersion": 1,
        "kind": "LOCAL_PC_PROTOCOL_BUNDLE_INSPECTION",
        "scope": "Read-only inspection of copied PC sproto.ab. No game process access, network request, credential, replay payload, player identifier, or schema bytes are included.",
        "bundle": {"size": len(bundle), "sha256": sha256(bundle)},
        "unityFs": {
            **header,
            "keySignatureValid": True,
            "originalMetadataOffset": original_offset,
            "alignedMetadataOffset": aligned_offset,
            "metadataSize": len(metadata),
            "metadataSha256": sha256(metadata),
            "inMemoryFormatVersionOverride": {"from": 6, "to": 7},
        },
        "textAsset": {"name": "proto.spb", "size": len(schema), "sha256": sha256(schema)},
        "nativeProtocolCatalog": protocols,
        "replayEndpointQueries": replay_queries,
        "literalFieldSearch": {term: lower.count(term.lower().encode("ascii")) for term in searched_terms},
        "finding": "This bundled schema defines generic transport/login/notification protocols only. It does not define the replay endpoint names or expose a literal replay combat-build field, so it cannot establish the build that produced a historical replay.",
        "limit": "The result is confined to this copied sproto.ab. Endpoint arguments and responses may be serialized inside the generic CommonCall payload or described elsewhere.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(OUTPUT.relative_to(ROOT)), "protocols": len(protocols), "replayEndpointQueries": replay_queries, "literalFieldSearch": report["literalFieldSearch"]}))


if __name__ == "__main__":
    main()
