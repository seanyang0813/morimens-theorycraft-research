"""Recover the packaged Android Lua-bundle lookup order without executing it."""
from pathlib import Path
import hashlib
import json

from capstone import Cs, CS_ARCH_ARM64, CS_MODE_LITTLE_ENDIAN
from elftools.elf.elffile import ELFFile

from inspect_android_il2cpp_update import (
    DUMP, IL2CPP, METADATA, elf_bytes, relocated_literal, string_literals,
)


ROOT = Path(__file__).resolve().parents[1]
SCRIPT_MANIFEST = ROOT / "research/evidence/android-script-group-manifest.json"
OUTPUT = ROOT / "research/evidence/android-lua-bundle-loader-inspection.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def decoded(elf, stream, start, end):
    decoder = Cs(CS_ARCH_ARM64, CS_MODE_LITTLE_ENDIAN)
    return {
        item.address: (item.mnemonic, item.op_str)
        for item in decoder.disasm(elf_bytes(elf, stream, start, end - start), start)
    }


def require(code, address, mnemonic, operand):
    expected = (mnemonic, operand)
    actual = code.get(address)
    if actual != expected:
        raise ValueError(
            f"Android Lua loader changed at {address:#x}: expected {expected}, found {actual}"
        )


def require_literal(elf, stream, literals, slot, expected):
    result = relocated_literal(elf, stream, slot, literals)
    if result["value"] != expected:
        raise ValueError(
            f"Android Lua loader literal changed at {slot:#x}: "
            f"expected {expected!r}, found {result['value']!r}"
        )
    return result


def main():
    dump = DUMP.read_text(encoding="utf-8")
    required_symbols = [
        "public class LuaBehaviour : MonoBehaviour",
        "public static List<string> StartLoadLuaAssetBundle;",
        "private byte[] LuaLoader(ref string filename)",
        "private void StartLoadLuaBundle()",
        "private void OnAssetBundleLoadFinished(string abName)",
        "private void TryDownLoadAB()",
        "public class LuaAssetBundlesMgr : SingletonMonoBehaviour<LuaAssetBundlesMgr>",
        "private bool GetLuaBundleFullPath(string abPath, out string truePath, out ulong offset)",
        "public void LoadLuaBundleAsync(string abPath, Action finishCB)",
        "public byte[] LoadLuaBytes(string fileName)",
        "private string GetLuaFileResPath(string fileName)",
        "public interface IFileManager",
        "public abstract bool TryGetFile(string file, out string trueFile, out ulong offset);",
        "public abstract bool IsAab();",
        "private byte[] LuaLoader(ref string filepath)",
        "public static byte[] LoadLuaFileAllBytes(string filePath)",
    ]
    missing = [item for item in required_symbols if item not in dump]
    if missing:
        raise ValueError("Missing Android Lua-loader symbols: " + ", ".join(missing))

    _, _, literals = string_literals(METADATA.read_bytes())
    bundle_slots = [
        (0x3833D28, "gamelauncher.ab"),
        (0x3833D30, "config.ab"),
        (0x3833D40, "foundation.ab"),
        (0x3833D20, "gamescript.ab"),
        (0x3833D38, "share.ab"),
        (0x3833D48, "vue.ab"),
        (0x3833D50, "ejoysdk_lua.ab"),
    ]
    with IL2CPP.open("rb") as stream:
        elf = ELFFile(stream)
        bundle_literals = [
            require_literal(elf, stream, literals, slot, value)
            for slot, value in bundle_slots
        ]
        language_literals = {
            "suffix": require_literal(elf, stream, literals, 0x3833A30, ".ab"),
            "prefix": require_literal(elf, stream, literals, 0x3817CB8, "Text_"),
            "cnCode": require_literal(elf, stream, literals, 0x3833A38, "cn"),
            "default": require_literal(elf, stream, literals, 0x3833A40, "text_cn.ab"),
        }
        module_literals = {
            "moduleSuffix": require_literal(elf, stream, literals, 0x3833A98, "{0}.lua"),
            "bundleSuffix": require_literal(elf, stream, literals, 0x3833A30, ".ab"),
            "assetPrefix": require_literal(elf, stream, literals, 0x3835A00, "Assets/Lua/"),
            "assetSuffix": require_literal(elf, stream, literals, 0x3835A08, ".bytes"),
            "updaterTemplate": require_literal(elf, stream, literals, 0x3836758, "{0}{1}.lua"),
        }

        get_language = decoded(elf, stream, 0x1CFA91C, 0x1CFAA58)
        lua_loader = decoded(elf, stream, 0x1CFB138, 0x1CFB300)
        start_load = decoded(elf, stream, 0x1CFC1DC, 0x1CFC630)
        static_init = decoded(elf, stream, 0x1CFDCB8, 0x1CFE150)
        full_path = decoded(elf, stream, 0x1D3C910, 0x1D3CAF4)
        sync_load = decoded(elf, stream, 0x1D3C524, 0x1D3C6B8)
        async_move = decoded(elf, stream, 0x1D3D40C, 0x1D3D6BC)
        module_load = decoded(elf, stream, 0x1D3CCCC, 0x1D3CECC)
        updater_loader = decoded(elf, stream, 0x1D5C7B8, 0x1D5C854)

        # Static list construction: seven literal loads in this exact order.
        for address, (_, value) in zip(
            (0x1CFDDC8, 0x1CFDDF8, 0x1CFDE68, 0x1CFDED8, 0x1CFDF48, 0x1CFDFB8, 0x1CFE028),
            bundle_slots,
        ):
            expected_slot = next(slot for slot, name in bundle_slots if name == value)
            require(static_init, address, "ldr", f"x{8 if address == 0x1CFDDC8 else 23}, [x{8 if address == 0x1CFDDC8 else 23}, #{expected_slot & 0xfff:#x}]")

        # Bundle list, optional language bundle, and shared asynchronous loader.
        require(start_load, 0x1CFC370, "bl", "#0x1cfa91c")
        require(start_load, 0x1CFC3A4, "str", "w8, [x21, #0x40]")
        require(start_load, 0x1CFC3B8, "add", "w8, w8, #1")
        require(start_load, 0x1CFC3BC, "str", "w8, [x21, #0x40]")
        require(start_load, 0x1CFC4E4, "bl", "#0x1d3caf4")
        require(start_load, 0x1CFC620, "b", "#0x1d3caf4")

        # Language selection: empty/cn -> text_cn.ab; otherwise lower(Text_<lang>.ab).
        require(get_language, 0x1CFA9A8, "bl", "#0x2c9ef74")
        require(get_language, 0x1CFA9B4, "bl", "#0x2c8c014")
        require(get_language, 0x1CFA9E4, "bl", "#0x2c9b19c")
        require(get_language, 0x1CFAA3C, "bl", "#0x2c9b0dc")
        require(get_language, 0x1CFAA50, "b", "#0x2c9ef74")

        # Lua module resolution: dots become slashes, .lua is added, external file
        # bytes are tried first when enabled, then the bundle manager is queried.
        require(lua_loader, 0x1CFB1C0, "bl", "#0x2c9cecc")
        require(lua_loader, 0x1CFB1E0, "bl", "#0x2c8bddc")
        require(lua_loader, 0x1CFB1F8, "bl", "#0x2efab70")
        require(lua_loader, 0x1CFB208, "bl", "#0x2efa390")
        require(lua_loader, 0x1CFB29C, "bl", "#0x1d3cccc")
        require(module_load, 0x1D3CD50, "bl", "#0x2c9fff8")
        require(module_load, 0x1D3CD64, "bl", "#0x2c9c5a8")
        require(module_load, 0x1D3CD70, "bl", "#0x2c9ef74")
        require(module_load, 0x1D3CDE0, "bl", "#0x2c8e3f8")
        require(module_load, 0x1D3CDEC, "bl", "#0x1d3c524")
        require(module_load, 0x1D3CE3C, "bl", "#0x1d3cecc")

        # File lookup order: downloaded file, AAB file-system mapping, then
        # StreamingAssets. The boolean return selects offset/non-offset overloads.
        require(full_path, 0x1D3C9A0, "bl", "#0x2ef93e0")
        require(full_path, 0x1D3C9C8, "bl", "#0x2dacabc")
        require(full_path, 0x1D3C9D4, "bl", "#0x2d6d3e8")
        require(full_path, 0x1D3C9F0, "mov", "w0, wzr")
        require(full_path, 0x1D3CA18, "mov", "w2, #0xb")
        require(full_path, 0x1D3CA4C, "mov", "w2, #8")
        require(full_path, 0x1D3CA74, "mov", "w0, #1")
        require(full_path, 0x1D3CA98, "bl", "#0x338ce38")
        require(full_path, 0x1D3CAC0, "bl", "#0x2dacabc")
        require(full_path, 0x1D3CAD4, "mov", "w0, wzr")
        require(sync_load, 0x1D3C628, "bl", "#0x3383fc8")
        require(sync_load, 0x1D3C638, "bl", "#0x3383f84")
        require(async_move, 0x1D3D4FC, "bl", "#0x3383edc")
        require(async_move, 0x1D3D658, "bl", "#0x3383e98")

        # The updater bootstrap has a separate direct-byte path.
        require(updater_loader, 0x1D5C804, "bl", "#0x2c9cecc")
        require(updater_loader, 0x1D5C828, "bl", "#0x2c9b5cc")
        require(updater_loader, 0x1D5C84C, "b", "#0x2efae00")

    manifest = json.loads(SCRIPT_MANIFEST.read_text(encoding="utf-8"))
    manifest_files = {item["file"] for item in manifest["scriptGroup"]["files"]}
    ordered_names = [value for _, value in bundle_slots]
    if manifest_files != set(ordered_names) or manifest["scriptGroup"]["count"] != 7:
        raise ValueError("Android loader list no longer matches the packaged Scripts manifest")

    report = {
        "schemaVersion": 1,
        "kind": "MORIMENS_ANDROID_LUA_BUNDLE_LOADER_INSPECTION",
        "status": "STATIC_LUA_BUNDLE_LOOKUP_ORDER_RECOVERED",
        "sourceHashes": {
            "globalMetadata": sha(METADATA),
            "libil2cpp": sha(IL2CPP),
            "il2cppDump": sha(DUMP),
            "scriptGroupManifest": sha(SCRIPT_MANIFEST),
        },
        "startupBundleSequence": {
            "baseBundles": [
                {"ordinal": index + 1, "file": name, "literal": literal}
                for index, ((_, name), literal) in enumerate(zip(bundle_slots, bundle_literals))
            ],
            "manifestExactSetMatch": True,
            "baseBundleCount": 7,
            "languageBundle": {
                "position": "after all base bundles",
                "emptyOrCn": "text_cn.ab",
                "otherwise": "lowercase(Text_ + CurLang + .ab)",
                "literals": language_literals,
            },
            "totalCountRule": "base list count plus one when the selected language bundle is nonempty",
            "loader": "Framework.LuaAssetBundlesMgr.LoadLuaBundleAsync",
        },
        "bundleFileLookupOrder": [
            {
                "priority": 1,
                "source": "download override",
                "path": "Path.Combine(DownloadHelper.GetDownloadPathDefault(), abPath)",
                "acceptance": "System.IO.File.Exists",
                "assetBundleLoad": "LoadFromFile/LoadFromFileAsync without offset",
            },
            {
                "priority": 2,
                "source": "Android App Bundle file-system mapping",
                "condition": "LoadGlobal.fileManager.IsAab()",
                "path": "LoadGlobal.fileManager.TryGetFile(abPath, out truePath, out offset)",
                "assetBundleLoad": "LoadFromFile/LoadFromFileAsync with crc 0 and recovered offset",
            },
            {
                "priority": 3,
                "source": "packaged StreamingAssets fallback",
                "path": "Path.Combine(Application.streamingAssetsPath, abPath)",
                "assetBundleLoad": "LoadFromFile/LoadFromFileAsync without offset",
            },
        ],
        "luaModuleResolution": {
            "requestedNameTransform": "replace '.' with '/', then format as {0}.lua",
            "externalOverride": "when LuaBytesSupportExternalStorage is enabled, try FileUtils.IsFileExist and LoadFileAllBytes first",
            "bundleKey": "substring before the first '/', lowercased",
            "lazyBundleFallback": "if the named bundle is absent, load lowercased first path component plus .ab",
            "assetPath": "Assets/Lua/ + transformed module filename + .bytes",
            "literals": module_literals,
        },
        "updaterBootstrapLoader": {
            "pathTemplate": "{luaDir}{requestedPath}.lua",
            "reader": "ResourceManager.DownloadHelper.LoadLuaFileAllBytes",
            "relationship": "separate bootstrap byte loader used by Z1ClientUpdater.GameUpdater before the main LuaBehaviour bundle-backed environment",
        },
        "interpretation": "The packaged client first prefers same-name Lua bundles from the default persistent download directory, conditionally resolves an Android App Bundle container path and byte offset, and otherwise falls back to StreamingAssets. Main Lua module names select bundles by their first path component. The seven source literals exactly match the seven resource-83 Scripts-manifest entries and add their load order.",
        "scope": "Static source-hashed IL2CPP metadata, ARM64 call-edge and relocation inspection. No managed method, Lua chunk or bundle was executed.",
        "limitations": [
            "The current downloaded resource-83 bundle bytes are still absent, so Android combat Lua cannot yet be compared with PC combat code",
            "The inspection recovers the persistent lookup rule but not a concrete device Application.persistentDataPath",
            "The resource server endpoint and the later runtime value supplied to FixUrlRoot remain unresolved",
            "Load completion, retry timing and failure recovery are outside this report",
            "No Android formula parity, gameplay validation or holdout credit",
        ],
        "nextEvidenceNeeded": "Capture the seven source-hashed resource-83 Scripts bundles from DownloadHelper.GetDownloadPathDefault beneath the same Android session's Application.persistentDataPath; gamescript.ab is the primary combat-code target.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({
        "status": report["status"],
        "baseBundles": len(ordered_names),
        "manifestExactSetMatch": True,
        "lookupSources": len(report["bundleFileLookupOrder"]),
        "output": str(OUTPUT.relative_to(ROOT)).replace("\\", "/"),
    }, indent=2))


if __name__ == "__main__":
    main()
