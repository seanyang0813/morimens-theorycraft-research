"""Inventory Android IL2CPP update paths without publishing service endpoints."""
from pathlib import Path
from urllib.parse import urlparse
import hashlib
import json
import re
import struct
from capstone import Cs, CS_ARCH_ARM64, CS_MODE_LITTLE_ENDIAN
from elftools.elf.elffile import ELFFile

ROOT = Path(__file__).resolve().parents[1]
APK = ROOT / "research/raw/android/morimens-2-5-1.apk"
METADATA = ROOT / "research/raw/android/unpacked/assets/bin/Data/Managed/Metadata/global-metadata.dat"
IL2CPP = ROOT / "research/raw/android/unpacked/lib/arm64-v8a/libil2cpp.so"
DUMP = ROOT / "research/raw/android/il2cpp-dump/dump.cs"
OUTPUT = ROOT / "research/evidence/android-il2cpp-update-inspection.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def string_literals(data):
    magic, version, table_offset, table_size, data_offset, data_size = struct.unpack_from("<6I", data, 0)
    if magic != 0xFAB11BAF or version != 31 or table_size % 8:
        raise ValueError("Unsupported Android IL2CPP metadata header")
    if table_offset + table_size > len(data) or data_offset + data_size > len(data):
        raise ValueError("IL2CPP string-literal table lies outside metadata")
    values = []
    for offset in range(table_offset, table_offset + table_size, 8):
        length, index = struct.unpack_from("<II", data, offset)
        if index + length > data_size:
            raise ValueError("IL2CPP string literal lies outside its data table")
        values.append(data[data_offset + index:data_offset + index + length].decode("utf-8", "replace"))
    return version, data_size, values


def method_rva(dump, signature):
    position = dump.find(signature)
    if position < 0:
        raise ValueError(f"Missing managed update method: {signature}")
    prefix = dump[max(0, position - 240):position]
    matches = list(re.finditer(r"RVA: (0x[0-9A-F]+)", prefix))
    if not matches:
        raise ValueError(f"Missing RVA for managed update method: {signature}")
    return matches[-1].group(1)


def elf_bytes(elf, stream, address, size):
    segment = next((item for item in elf.iter_segments() if item['p_type'] == 'PT_LOAD' and item['p_vaddr'] <= address < item['p_vaddr'] + item['p_filesz']), None)
    if segment is None or address + size > segment['p_vaddr'] + segment['p_filesz']:
        raise ValueError(f"Android IL2CPP address is outside file-backed segments: {address:#x}")
    stream.seek(segment['p_offset'] + address - segment['p_vaddr'])
    return stream.read(size)


def instructions(elf, stream, address, size):
    decoder = Cs(CS_ARCH_ARM64, CS_MODE_LITTLE_ENDIAN)
    return [(item.address, item.mnemonic, item.op_str) for item in decoder.disasm(elf_bytes(elf, stream, address, size), address)]


def relocated_literal(elf, stream, slot, literals):
    relocation = None
    for section in elf.iter_sections():
        if not hasattr(section, 'iter_relocations'):
            continue
        relocation = next((item for item in section.iter_relocations() if item['r_offset'] == slot), None)
        if relocation is not None:
            break
    if relocation is None or relocation['r_info_type'] != 1027:
        raise ValueError(f"Expected Android relative relocation at {slot:#x}")
    encoded = struct.unpack('<Q', elf_bytes(elf, stream, relocation['r_addend'], 8))[0]
    if encoded >> 29 != 5 or encoded & 1 != 1:
        raise ValueError(f"Expected IL2CPP string-literal usage at {slot:#x}")
    index = (encoded & 0x1fffffff) >> 1
    if index >= len(literals):
        raise ValueError("Relocated IL2CPP string-literal index is outside metadata")
    return {"slot": hex(slot), "encodedUsage": hex(encoded), "stringLiteralIndex": index, "value": literals[index]}


def main():
    metadata = METADATA.read_bytes()
    version, literal_data_size, literals = string_literals(metadata)
    dump = DUMP.read_text(encoding="utf-8")
    url_pattern = re.compile(r"https?://[^\s'\"<>]+", re.I)
    urls = [url for value in literals for url in url_pattern.findall(value)]
    documentation_hosts = {"bitbucket.org", "docs.unity3d.com", "docs.unity.cn"}
    standards_hosts = {"schemas.microsoft.com", "schemas.xmlsoap.org", "www.w3.org"}
    classifications = {"standards": 0, "documentation": 0, "localhost": 0, "resourceDownloadCandidates": 0}
    for url in urls:
        host = (urlparse(url.rstrip(").,;" )).hostname or "").lower()
        if host in standards_hosts:
            classifications["standards"] += 1
        elif host in documentation_hosts:
            classifications["documentation"] += 1
        elif host == "localhost":
            classifications["localhost"] += 1
        else:
            classifications["resourceDownloadCandidates"] += 1

    required_literals = [
        "/_game_data_/DownLoad/{0}", "_version.json", "_ab_info.json",
        "ejoy_pack_config.json", "pred_tag_file",
    ]
    missing_literals = [value for value in required_literals if value not in literals]
    if missing_literals:
        raise ValueError("Missing expected managed update literals: " + ", ".join(missing_literals))

    required_dump_tokens = [
        "public class DownloadHelper // TypeDefIndex:",
        "public class VersionInfoFile // TypeDefIndex:",
        "public class ResourceUpdateHelper // TypeDefIndex:",
        "public string downloadPlatformCode;",
        "public string branchName;",
        "public int resVersion;",
        "public int buildVersion;",
        'public const string PatcheInfoFile = "patches_info.json";',
    ]
    for token in required_dump_tokens:
        if token not in dump:
            raise ValueError("Missing expected managed update surface: " + token)
    signatures = [
        "public static string GetDownloadRelativePath()",
        "public static void GetTextFromUrl(string url, Action<bool, string> cb)",
        "public static string FixUrlRoot(string url)",
        "public static VersionFile LoadVersionInPatch()",
        "public static void CheckPatchFileCompleteAsync(Action<bool, VersionFile.Item[]> cb)",
    ]
    methods = [{"signature": signature, "rva": method_rva(dump, signature)} for signature in signatures]
    with IL2CPP.open('rb') as stream:
        elf = ELFFile(stream)
        persistent_code = instructions(elf, stream, 0x2EFB510, 0x50)
        default_code = instructions(elf, stream, 0x2EF93E0, 0xA0)
        relative_code = instructions(elf, stream, 0x2EFB6AC, 0x40)
        if (0x2EFB55C, 'b', '#0x338ce60') not in persistent_code or 'RVA: 0x338CE60' not in dump or 'public static string get_persistentDataPath()' not in dump:
            raise ValueError('Android persistent-data root call edge changed')
        if (0x2EF947C, 'b', '#0x2dacabc') not in default_code or 'RVA: 0x2DACABC' not in dump or 'public static string Combine(string path1, string path2)' not in dump:
            raise ValueError('Android default-download Path.Combine edge changed')
        if not any(row[0] == 0x2EFB6E8 and row[1] == 'ret' for row in relative_code):
            raise ValueError('Android relative-download helper boundary changed')
        default_literal = relocated_literal(elf, stream, 0x3853698, literals)
        relative_literal = relocated_literal(elf, stream, 0x3853780, literals)
        if default_literal['value'] != 'DownLoad' or relative_literal['value'] != '_game_data_/DownLoad':
            raise ValueError('Android managed download-directory literals changed')

    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_ANDROID_IL2CPP_UPDATE_INSPECTION",
        "status": "STATIC_UPDATE_SURFACE_RECOVERED",
        "sourceHashes": {
            "apk": sha(APK), "globalMetadata": sha(METADATA),
            "libil2cpp": sha(IL2CPP), "il2cppDump": sha(DUMP),
        },
        "metadata": {
            "version": version, "stringLiteralCount": len(literals),
            "stringLiteralDataBytes": literal_data_size,
        },
        "literalUrlClassification": {"total": len(urls), **classifications},
        "downloadStorageEvidence": {
            "persistentRootSource": {"callerRva": "0x2EFB510", "calleeRva": "0x338CE60", "callee": "UnityEngine.Application.get_persistentDataPath"},
            "defaultDirectory": {"methodRva": "0x2EF93E0", "operation": "System.IO.Path.Combine", "secondArgument": default_literal},
            "relativeDirectory": {"methodRva": "0x2EFB6AC", "returnValue": relative_literal},
            "resourcePathTemplate": "/_game_data_/DownLoad/{0}",
            "artifactNames": [*required_literals[1:], "patches_info.json"],
            "interpretation": "The managed client derives its root from Unity Application.persistentDataPath, defines a default DownLoad child and separately returns _game_data_/DownLoad as a relative resource directory. Which helper owns each captured file still requires a device filesystem observation.",
        },
        "managedUpdateSurface": {
            "types": ["ResourceManager.DownloadHelper", "ResourceManager.VersionInfoFile", "ResourceManager.Runtime.ResourceUpdateHelper"],
            "versionInfoFields": ["branchName", "resVersion", "buildVersion", "platformCode", "downloadPlatformCode", "hash", "size"],
            "methods": methods,
        },
        "scope": "Static IL2CPP metadata and symbol inventory from the packaged Android client. No managed method was executed and no URL value is published.",
        "limitations": [
            "No literal resource-download endpoint occurs in the managed string-literal table; the base URL may be supplied by Lua, a service response, native code or a later bundle",
            "The recovered path is relative; no device filesystem or Android app sandbox was captured",
            "Downloaded Android combat/config bundles remain absent, so Android/PC formula parity is not established",
            "Static loader structure is mechanics infrastructure evidence only and receives no gameplay or holdout credit",
        ],
        "nextEvidenceNeeded": "Capture and fingerprint the client-defined DownLoad and _game_data_/DownLoad trees beneath Unity Application.persistentDataPath, especially config.ab, share.ab and gamescript.ab, from the same versioned session.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({"status": report["status"], "stringLiteralCount": len(literals), "literalUrls": len(urls), "resourceDownloadCandidates": classifications["resourceDownloadCandidates"], "output": str(OUTPUT.relative_to(ROOT))}, indent=2))


if __name__ == "__main__":
    main()
