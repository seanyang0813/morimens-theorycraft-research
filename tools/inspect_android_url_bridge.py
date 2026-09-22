"""Prove whether the Android URL normalizer creates or receives its base URL."""
from pathlib import Path
import hashlib
import json
import struct

from capstone import Cs, CS_ARCH_ARM64, CS_MODE_LITTLE_ENDIAN
from elftools.elf.elffile import ELFFile

from inspect_android_il2cpp_update import (
    IL2CPP, METADATA, DUMP, elf_bytes, relocated_literal, string_literals,
)


ROOT = Path(__file__).resolve().parents[1]
STARTUP_REPORT = ROOT / "research/evidence/android-startup-lua-inspection.json"
OUTPUT = ROOT / "research/evidence/android-url-bridge-inspection.json"

WRAPPER_RVA = 0x195D5A8
FIX_URL_ROOT_RVA = 0x2EFF414
LUA_TOSTRING_RVA = 0x1DE971C
LUA_PUSHSTRING_RVA = 0x1DEC04C
FIX_PATH_RVA = 0x2EF80E0
ENDS_WITH_RVA = 0x2C99F24
STRING_CONCAT_RVA = 0x2C8E3F8
SLASH_LITERAL_SLOT = 0x3816EB0


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def decoded_instructions(elf, stream, address, size):
    decoder = Cs(CS_ARCH_ARM64, CS_MODE_LITTLE_ENDIAN)
    return {item.address: (item.mnemonic, item.op_str) for item in decoder.disasm(elf_bytes(elf, stream, address, size), address)}


def require(code, address, mnemonic, operand):
    actual = code.get(address)
    expected = (mnemonic, operand)
    if actual != expected:
        raise ValueError(f"Android URL bridge changed at {address:#x}: expected {expected}, found {actual}")


def direct_bl_callers(elf, target):
    """Return every file-backed executable ARM64 BL whose destination is target."""
    callers = []
    for segment in elf.iter_segments():
        if segment['p_type'] != 'PT_LOAD' or not (segment['p_flags'] & 1):
            continue
        data = segment.data()
        base = segment['p_vaddr']
        for offset in range(0, len(data) - 3, 4):
            word = struct.unpack_from('<I', data, offset)[0]
            if word >> 26 != 0b100101:
                continue
            immediate = word & 0x3ffffff
            if immediate & 0x2000000:
                immediate -= 0x4000000
            caller = base + offset
            if caller + immediate * 4 == target:
                callers.append(caller)
    return callers


def main():
    dump = DUMP.read_text(encoding="utf-8")
    required_dump = [
        "private static int _m_FixUrlRoot_xlua_st_(IntPtr L)",
        "public static string FixUrlRoot(string url)",
        "public static string FixPath(string file)",
        "public static string lua_tostring(IntPtr L, int index)",
        "public static void lua_pushstring(IntPtr L, string str)",
        "public bool EndsWith(string value)",
        "public static string Concat(string str0, string str1)",
    ]
    for token in required_dump:
        if token not in dump:
            raise ValueError("Missing Android URL bridge symbol: " + token)

    _, _, literals = string_literals(METADATA.read_bytes())
    with IL2CPP.open("rb") as stream:
        elf = ELFFile(stream)
        wrapper = decoded_instructions(elf, stream, WRAPPER_RVA, 0x84)
        normalizer = decoded_instructions(elf, stream, FIX_URL_ROOT_RVA, 0xA4)
        require(wrapper, 0x195D5D4, "mov", "w1, #1")
        require(wrapper, 0x195D5E0, "bl", f"#{LUA_TOSTRING_RVA:#x}")
        require(wrapper, 0x195D608, "bl", f"#{FIX_URL_ROOT_RVA:#x}")
        require(wrapper, 0x195D618, "bl", f"#{LUA_PUSHSTRING_RVA:#x}")
        require(wrapper, 0x195D620, "mov", "w0, #1")
        require(normalizer, 0x2EFF468, "bl", f"#{FIX_PATH_RVA:#x}")
        require(normalizer, 0x2EFF484, "bl", f"#{ENDS_WITH_RVA:#x}")
        require(normalizer, 0x2EFF4B0, "b", f"#{STRING_CONCAT_RVA:#x}")
        slash = relocated_literal(elf, stream, SLASH_LITERAL_SLOT, literals)
        direct_callers = direct_bl_callers(elf, FIX_URL_ROOT_RVA)
    if slash["value"] != "/":
        raise ValueError("Android FixUrlRoot suffix literal changed")
    if direct_callers != [0x195D608]:
        raise ValueError("Android FixUrlRoot direct-call boundary changed")

    startup = json.loads(STARTUP_REPORT.read_text(encoding="utf-8"))
    expected_startup_references = {"FixUrlRoot": 0, "DownloadHelper": 0, "GetTextFromUrl": 0}
    if startup.get("status") != "PARSED_WITHOUT_EXECUTION" or startup.get("literalUrlClassification", {}).get("resourceDownloadCandidates") != 0 or startup.get("bridgeReferenceConstants") != expected_startup_references:
        raise ValueError("Android startup Lua cross-check changed")

    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_ANDROID_URL_BRIDGE_INSPECTION",
        "status": "LUA_SUPPLIED_URL_NORMALIZER_CONFIRMED",
        "sourceHashes": {
            "globalMetadata": sha(METADATA),
            "libil2cpp": sha(IL2CPP),
            "il2cppDump": sha(DUMP),
            "startupLuaInspection": sha(STARTUP_REPORT),
        },
        "xluaBridge": {
            "wrapper": "XLua.CSObjectWrap.ResourceManagerDownloadHelperWrap._m_FixUrlRoot_xlua_st_",
            "wrapperRva": hex(WRAPPER_RVA),
            "input": {
                "api": "XLua.Lua.lua_tostring",
                "rva": hex(LUA_TOSTRING_RVA),
                "luaStackIndex": 1,
            },
            "managedCall": {"api": "ResourceManager.DownloadHelper.FixUrlRoot", "rva": hex(FIX_URL_ROOT_RVA)},
            "output": {"api": "XLua.Lua.lua_pushstring", "rva": hex(LUA_PUSHSTRING_RVA), "luaReturnValues": 1},
        },
        "normalization": {
            "firstCall": {"api": "ResourceManager.DownloadHelper.FixPath", "rva": hex(FIX_PATH_RVA)},
            "suffixCheck": {"api": "System.String.EndsWith", "rva": hex(ENDS_WITH_RVA), "literal": slash},
            "missingSuffixAction": {"api": "System.String.Concat", "rva": hex(STRING_CONCAT_RVA), "appendedLiteral": "/"},
            "hostOrSchemeLiteralIntroduced": False,
        },
        "wholeBinaryDirectCallAudit": {
            "target": {"api": "ResourceManager.DownloadHelper.FixUrlRoot", "rva": hex(FIX_URL_ROOT_RVA)},
            "executableSegmentsScanned": True,
            "directCallerCount": len(direct_callers),
            "callers": [{"rva": hex(value), "owner": "XLua.CSObjectWrap.ResourceManagerDownloadHelperWrap._m_FixUrlRoot_xlua_st_"} for value in direct_callers],
            "interpretation": "The generated XLua wrapper is the only direct ARM64 BL caller of FixUrlRoot in packaged libil2cpp.so. Indirect or reflection-based calls are outside this scan.",
        },
        "startupLuaCrossCheck": {
            "status": startup["status"],
            "prototypeCount": startup["prototypeCount"],
            "stringConstantCount": startup["stringConstantCount"],
            "resourceDownloadCandidates": startup["literalUrlClassification"]["resourceDownloadCandidates"],
            "bridgeReferenceConstants": startup["bridgeReferenceConstants"],
        },
        "interpretation": "The generated XLua wrapper reads argument 1 from the Lua stack, passes that string to FixUrlRoot, and pushes one string result. It is the only direct ARM64 caller in packaged libil2cpp.so. FixUrlRoot normalizes the path and only preserves or appends '/'; it introduces no host or scheme. The packaged startup Lua has no named reference to this bridge or DownloadHelper. The resource base URL therefore reaches this boundary from later Lua/runtime data rather than being created by managed startup code or the normalizer.",
        "scope": "Static ARM64 call-edge, relocation and generated-XLua-wrapper inspection. No native or managed method was executed and no endpoint value is published.",
        "limitations": [
            "This identifies the source side of one public URL-normalization bridge, not every possible Android network path",
            "The whole-binary caller scan covers direct ARM64 BL instructions; delegates, reflection, virtual dispatch and other indirect calls are not classified",
            "The packaged startup Lua archive has no literal resource endpoint, but later downloaded Lua or a service response can supply the argument",
            "No Android downloaded combat bundle, formula parity, gameplay or holdout credit",
        ],
        "nextEvidenceNeeded": "Capture the versioned Android Scripts group or the client-defined download trees; search the recovered Lua call sites that pass argument 1 into CS.ResourceManager.DownloadHelper.FixUrlRoot.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "luaStackIndex": 1, "introducedHostOrScheme": False, "output": str(OUTPUT.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
