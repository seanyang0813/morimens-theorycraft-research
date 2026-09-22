# PC / Android comparison

| Property | PC installed | PC downloaded | Android bundled |
|---|---|---|---|
| Resource version | 106 | 144 | 83 |
| Build version in content manifest | 48 | 51 | 54 |
| Branch | Z1G_2025_11_OB | Z1G_2025_11_OB | Z1G_2025_11_OB |
| Metadata format | 31 | N/A | 31 |

Android manifest: package `com.qookkagames.z1.gw.hk`, versionName `2.5.1`, versionCode `30`. These values were parsed from binary AndroidManifest.xml rather than inferred from the filename.

PC Steam build ID is not a content version. Likewise manifest buildVersion values are platform-specific identifiers and must not be compared as a universal release ordering.

Android native XLua is easier to inspect statically than the packed Windows library. It can clarify loading mechanisms, but its combat behavior cannot be silently substituted for PC resource 144.

The bundled Lua archive is byte-identical between the two copies, but the APK does not contain the same downloaded combat/config bundles as PC resource 144. The PC downloaded bundles are now decoded and indexed. All formula claims and oracle fixtures currently target those PC resources only. No cross-version combat equivalence has been established.

## Reproducible local comparison

Run `.venv/Scripts/python.exe tools/compare_client_manifests.py`. It reads all three saved content manifests, hashes them, inspects the APK ZIP entry catalog, and compares the startup archive bytes. Results are saved in `research/evidence/client-manifest-comparison.json`.

The inspected bundles are `config.ab`, `share.ab`, `gamescript.ab`, `foundation.ab`, and `gamelauncher.ab`. All five have different manifest hashes between PC downloaded resource 144 and Android bundled resource 83. None has a matching basename in the APK entry catalog. Different hashes establish a bundle-level difference only; compression, platform packaging, and unrelated content can differ without changing a particular combat formula. The comparison therefore does not claim formula divergence.

The startup archive SHA-256 is `1d8d936951837af84f3b4904ba75c6370b0fc414dac84a7c80be7ab75f8d441e` on both platforms. Identical startup bytes do not substitute for absent downloaded combat modules.

The next evidence needed for Android combat support is a version-fingerprinted copy of its downloaded `share.ab` and `config.ab`, plus `gamescript.ab` for team/property setup. Compare recovered modules and configuration records before deciding which PC rules can be reused. Native runtime behavior and independent Android gameplay still need separate verification. Until then, the API rejects Android builds and the website must not advertise Android verification.

The packaged Android manifest's `Scripts` group names seven expected files at resource 83: `config.ab`, `ejoysdk_lua.ab`, `foundation.ab`, `gamelauncher.ab`, `gamescript.ab`, `share.ab`, and `vue.ab`. Run `.venv/Scripts/python.exe tools/verify_android_script_group.py` to rebuild the frozen manifest report. Pass `--capture-dir PATH` for a directory already containing the seven files, or `--persistent-data-root PATH` for a copied Unity persistent-data root. The latter checks exactly `DownLoad` and `_game_data_/DownLoad`, rejects the same filename appearing in both, and does not guess any other device path. The command exits nonzero for a missing, ambiguous, wrong-size, or wrong-hash file. The manifest's `h` field is treated as MD5 because the packaged Android `luascript_update.archive` directly matches both its recorded size and MD5, rather than because the value merely resembles an MD5. Every captured file also receives an independent SHA-256 fingerprint. The current report is `AWAITING_CAPTURE` and establishes no Android formula parity.

## Bootstrap recovery checkpoint

`tools/inspect_android_bootstrap.py` inspects the packaged assets/artres/gameupdate.ab without altering PC extraction indexes. The current UnityPy decoder with the saved bundle key fails at LZ4 decompression; the entry bytes are fingerprinted in research/evidence/android-bootstrap-inspection.json. This does not establish that the APK is corrupt or that the key is wrong; format, flags and encryption handling remain possible causes requiring investigation.

The startup archive begins with the custom Lua header and contains no matching plaintext HTTP URLs in a basic byte scan. That scan does not prove endpoints are absent; they may be encoded, assembled or stored elsewhere. No verified Android combat-bundle download URL has been recovered by this checkpoint. No desktop control, client execution or network request was used.

`tools/inspect_android_startup_lua.py` now goes beyond that byte scan. The
copied legitimate loader deserializes the byte-identical protected startup
archive without executing it, exposing seven Lua prototypes and 109 ordered
string constants. Its sole literal URL belongs to the telemetry reporter; no
literal resource-download candidate occurs in this startup component. The
public report contains hashes and counts rather than the endpoint. An endpoint
can still be assembled dynamically, supplied by a server, encrypted or loaded
from a later bundle, so downloaded Android script capture remains necessary.
# Packaged Android update alignment recovery

The later bootstrap probe resolves the packaged gameupdate.ab parse failure. Its UnityFS header reports format 6 / engine 2022.3.61t8 with flags 0x643. The existing key validates the encryption signature. The encryption header ends at offset 120, but the 222-byte compressed metadata begins at offset 128; LZ4 decompression there produces the expected 413 bytes. An in-memory version-field override from 6 to 7 selects UnityPy's header alignment and allows the complete container to parse. The APK is unchanged and the exact override, metadata hash and object counts are in `research/evidence/android-bootstrap-inspection.json`.

The parsed bundle contains UI/asset objects and no TextAssets. All 130
MonoBehaviour type trees are readable. Their 428 string fields contain no
literal HTTP URL and no nonempty field whose path is named like a URL, host,
server, CDN or download setting. This removes a decoder obstacle and checks the
serialized configuration surface, but recovers no Android combat code or
verified combat-bundle download path. Values may still be assembled at runtime
or obtained from a service. The earlier standard-decoder failure remains
recorded separately; it was not evidence of a bad key or corrupt APK. Do not
promote this compatibility parse to Android formula validation.

## Managed update surface

`tools/inspect_android_il2cpp_update.py` parses the packaged IL2CPP v31 string
literal table and a local Il2CppDumper symbol inventory. The 17,688 managed
string literals contain 30 absolute URL matches: 26 standards namespaces,
three framework/documentation links and one localhost value. None is a
resource-download endpoint. This is a stronger bounded absence result than a
raw printable-string scan because it walks the metadata's declared literal
table.

The managed update surface exposes `DownloadHelper`, `VersionInfoFile` and
`ResourceUpdateHelper`, including URL normalization/fetch helpers and patch
integrity checks. ARM64 call-edge inspection shows that the client's root
helper tail-calls `UnityEngine.Application.get_persistentDataPath`; its default
download helper combines that root with `DownLoad`, while a separate helper
returns `_game_data_/DownLoad`. The metadata also supplies the resource format
`/_game_data_/DownLoad/{0}` and names `_version.json`, `_ab_info.json`,
`ejoy_pack_config.json`, `patches_info.json` and `pred_tag_file`. This identifies
client-defined locations to inspect beneath Unity's persistent-data root. It
does not reveal that root's concrete device path or the server endpoint. The
public report is `research/evidence/android-il2cpp-update-inspection.json`; it
contains hashes, symbols, call edges and aggregate URL classifications, not
endpoint values.

Rebuild the private symbol inventory and public report with:

```powershell
research/raw/tools/Il2CppDumper/Il2CppDumper.exe research/raw/android/unpacked/lib/arm64-v8a/libil2cpp.so research/raw/android/unpacked/assets/bin/Data/Managed/Metadata/global-metadata.dat research/raw/android/il2cpp-dump
.venv/Scripts/python.exe tools/inspect_android_il2cpp_update.py
```

The dumper may warn that the ARM64 player is protected, but it must finish with
`Done!`; the inspection then verifies every required type, field, method and
literal before writing the report.

## Native-library endpoint audit

`tools/inspect_android_native_endpoints.py` performs a separate bounded scan of
all three packaged ARM64 libraries: `libil2cpp.so`, `libtuanjie.so` and
`libxlua.so`. It extracts unique printable ASCII and UTF-16LE strings of 4–4096
characters and rejects longer binary runs rather than truncating them into
false literals. The exact binary hashes, extraction counts and classifications
are published in `research/evidence/android-native-endpoint-inspection.json`;
endpoint values remain in an ignored private inventory.

The 54 URL-shaped matches consist of one standards URL, three Android/LLVM or
curl documentation URLs, 43 malformed or non-DNS fragments and seven clipped
markup hosts. There are zero resource/download candidates and zero remaining
unclassified external URLs. This closes the printable native-literal branch of
the endpoint search. It does not exclude encoded, encrypted, assembled,
service-supplied or downloaded values, so device filesystem capture remains the
next evidence needed for Android combat support.

The generated XLua binding further narrows that boundary. Static ARM64 call
edges show `ResourceManagerDownloadHelperWrap._m_FixUrlRoot_xlua_st_` reading
Lua stack argument 1 with `lua_tostring`, calling `DownloadHelper.FixUrlRoot`,
and returning one value with `lua_pushstring`. `FixUrlRoot` calls `FixPath`,
checks whether the result ends in `/`, and otherwise appends `/`; it introduces
no host or scheme. A scan of every file-backed executable segment in
`libil2cpp.so` finds exactly one direct ARM64 `BL` caller: the generated XLua
wrapper itself. The packaged startup Lua archive contains neither a literal
resource endpoint nor a string-constant reference to `FixUrlRoot`,
`DownloadHelper` or `GetTextFromUrl`. Therefore this public normalizer receives
its base string from later Lua/runtime data. Indirect native calls remain
outside the direct-call scan. A later downloaded Lua component or a service
response is still the unresolved source at this boundary. The source-hashed
call-edge report is `research/evidence/android-url-bridge-inspection.json`.

## Lua bundle lookup order

`tools/inspect_android_lua_bundle_loader.py` follows the main Android Lua
loader through relocated string literals and ARM64 call edges. The static
initializer builds this exact ordered base-bundle list:

1. `gamelauncher.ab`
2. `config.ab`
3. `foundation.ab`
4. `gamescript.ab`
5. `share.ab`
6. `vue.ab`
7. `ejoysdk_lua.ab`

The set matches all seven entries in the packaged resource-83 Scripts group.
The loader then appends a language bundle: empty or `cn` selects
`text_cn.ab`; another language selects the lowercase form of
`Text_<language>.ab`. Its tracked total is the seven-item list count plus one
when that language result is nonempty.

For each bundle, `LuaAssetBundlesMgr.GetLuaBundleFullPath` first tests
`Path.Combine(DownloadHelper.GetDownloadPathDefault(), abPath)`. If that file
does not exist and the runtime file manager reports Android App Bundle mode,
it asks `TryGetFile` for a container path and byte offset. The final fallback
is `Path.Combine(Application.streamingAssetsPath, abPath)`. The synchronous
and asynchronous loaders use Unity's offset overload only for the App Bundle
mapping branch.

Main Lua module resolution replaces dots with slashes and appends `.lua`. When
external Lua bytes are enabled it tries a direct file first. Bundle lookup
uses the lowercased first path component, lazily loads `<component>.ab` when
needed, and reads `Assets/Lua/<module>.lua.bytes`. The earlier updater has a
separate direct-byte loader for `{luaDir}{requestedPath}.lua` through
`DownloadHelper.LoadLuaFileAllBytes`.

This closes the client-side bundle-name, priority and module-to-bundle routing
questions. It does not supply the missing resource-83 bundle bytes or the
concrete device persistent-data root. The next Android combat step is still a
same-session capture of the seven manifest-hashed Scripts files, with
`gamescript.ab` as the primary target. The source-hashed report is
`research/evidence/android-lua-bundle-loader-inspection.json`.
