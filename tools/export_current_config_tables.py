"""Export selected installed config tables into ignored private research storage.

The installed TextAssets are protected Lua data modules. This tool uses the
copied legitimate parser/runtime to evaluate only explicitly named config
modules, then serializes their returned tables. Proprietary rows must remain
under research/observations and are never website payloads.
"""

from __future__ import annotations

import argparse
import ctypes as C
import json
import re
from pathlib import Path

import UnityPy

from runtime_oracle import Oracle, ROOT


NAME = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")


class LuaTableReader:
    LUA_TNIL, LUA_TBOOLEAN, LUA_TNUMBER, LUA_TSTRING, LUA_TTABLE = 0, 1, 3, 4, 5

    def __init__(self, oracle: Oracle):
        self.oracle = oracle
        lib, pointer, integer = oracle.lib, C.c_void_p, C.c_int
        self.gettop = lib.lua_gettop
        self.gettop.restype, self.gettop.argtypes = integer, [pointer]
        self.pushnil = lib.lua_pushnil
        self.pushnil.restype, self.pushnil.argtypes = None, [pointer]
        self.next = lib.lua_next
        self.next.restype, self.next.argtypes = integer, [pointer, integer]
        self.kind = lib.lua_type
        self.kind.restype, self.kind.argtypes = integer, [pointer, integer]
        self.boolean = lib.lua_toboolean
        self.boolean.restype, self.boolean.argtypes = integer, [pointer, integer]

    def absolute(self, index: int) -> int:
        return index if index > 0 else self.gettop(self.oracle.state) + index + 1

    def value(self, index: int, depth: int = 0):
        if depth > 16:
            raise ValueError("Unexpectedly deep config table")
        state, kind = self.oracle.state, self.kind(self.oracle.state, index)
        if kind == self.LUA_TNIL:
            return None
        if kind == self.LUA_TBOOLEAN:
            return bool(self.boolean(state, index))
        if kind == self.LUA_TNUMBER:
            value = self.oracle.tonumber(state, index, None)
            return int(value) if value.is_integer() else value
        if kind == self.LUA_TSTRING:
            value = self.oracle.string(state, index, None)
            return value.decode("utf-8", "surrogateescape")
        if kind != self.LUA_TTABLE:
            raise ValueError(f"Unsupported Lua config value type {kind}")
        absolute, result = self.absolute(index), {}
        self.pushnil(state)
        while self.next(state, absolute):
            key = self.value(-2, depth + 1)
            if not isinstance(key, (str, int, float, bool)):
                raise ValueError("Unsupported config table key")
            result[str(key)] = self.value(-1, depth + 1)
            self.oracle.top(state, -2)
        numeric = sorted(int(key) for key in result if key.isdigit() and int(key) > 0)
        if len(numeric) == len(result) and numeric == list(range(1, len(result) + 1)):
            return [result[str(item)] for item in numeric]
        return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--install-root", required=True, type=Path)
    parser.add_argument("--name", required=True, action="append")
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    if any(not NAME.fullmatch(name) for name in args.name) or len(set(args.name)) != len(args.name):
        raise ValueError("Unique simple config module names required")
    output = args.output_dir.resolve()
    try:
        output.relative_to(ROOT / "research" / "observations")
    except ValueError as error:
        raise ValueError("Private config output must stay under research/observations") from error
    targets = {f"{name}.lua": name for name in args.name}
    for name in args.name:
        if (output / f"{name}.json").exists():
            raise FileExistsError(f"Refusing to overwrite private config export: {name}")
    key = ROOT / "research" / "raw" / "bundle-key.bin"
    UnityPy.set_assetbundle_decrypt_key(key.read_bytes())
    bundle = args.install_root.resolve() / "_game_data_" / "DownLoad" / "config.ab"
    found = {}
    for obj in UnityPy.load(str(bundle)).objects:
        if obj.type.name != "TextAsset":
            continue
        value = obj.read()
        if value.m_Name not in targets:
            continue
        payload = value.m_Script.encode("utf-8", "surrogateescape") if isinstance(value.m_Script, str) else bytes(value.m_Script)
        name = targets[value.m_Name]
        if name in found:
            raise ValueError(f"Duplicate installed config TextAsset: {name}")
        found[name] = payload
    missing = sorted(set(args.name) - set(found))
    if missing:
        raise ValueError("Missing installed config TextAssets: " + ", ".join(missing))
    output.mkdir(parents=True, exist_ok=True)
    oracle, rows = Oracle(), []
    reader = LuaTableReader(oracle)
    for name in args.name:
        lua_path, json_path = output / f"{name}.lua", output / f"{name}.json"
        created_lua = not lua_path.exists()
        if created_lua:
            lua_path.write_bytes(found[name])
        elif lua_path.read_bytes() != found[name]:
            raise ValueError(f"Existing private module differs from the installed config TextAsset: {name}")
        try:
            oracle.top(oracle.state, 0)
            oracle.module(name, {"output": str(lua_path.relative_to(ROOT)).replace("\\", "/")})
            value = reader.value(-1)
            json_path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
            rows.append({"name": name, "rows": len(value) if isinstance(value, (dict, list)) else None})
        except Exception:
            if created_lua:
                lua_path.unlink(missing_ok=True)
            json_path.unlink(missing_ok=True)
            raise
    print(json.dumps({"outputDirectory": str(output.relative_to(ROOT)).replace("\\", "/"), "tables": rows}, indent=2))


if __name__ == "__main__":
    main()
