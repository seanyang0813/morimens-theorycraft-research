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

The packaged Android manifest's `Scripts` group names seven expected files at resource 83: `config.ab`, `ejoysdk_lua.ab`, `foundation.ab`, `gamelauncher.ab`, `gamescript.ab`, `share.ab`, and `vue.ab`. Run `.venv/Scripts/python.exe tools/verify_android_script_group.py` to rebuild the frozen manifest report. Pass `--capture-dir PATH` after a local Android capture; the command exits nonzero for a missing, wrong-size, or wrong-hash file. The manifest's `h` field is treated as MD5 because the packaged Android `luascript_update.archive` directly matches both its recorded size and MD5, rather than because the value merely resembles an MD5. Every captured file also receives an independent SHA-256 fingerprint. The current report is `AWAITING_CAPTURE` and establishes no Android formula parity.

## Bootstrap recovery checkpoint

`tools/inspect_android_bootstrap.py` inspects the packaged assets/artres/gameupdate.ab without altering PC extraction indexes. The current UnityPy decoder with the saved bundle key fails at LZ4 decompression; the entry bytes are fingerprinted in research/evidence/android-bootstrap-inspection.json. This does not establish that the APK is corrupt or that the key is wrong; format, flags and encryption handling remain possible causes requiring investigation.

The startup archive begins with the custom Lua header and contains no matching plaintext HTTP URLs in a basic byte scan. That scan does not prove endpoints are absent; they may be encoded, assembled or stored elsewhere. No verified Android combat-bundle download URL has been recovered by this checkpoint. No desktop control, client execution or network request was used.
# Packaged Android update alignment recovery

The later bootstrap probe resolves the packaged gameupdate.ab parse failure. Its UnityFS header reports format 6 / engine 2022.3.61t8 with flags 0x643. The existing key validates the encryption signature. The encryption header ends at offset 120, but the 222-byte compressed metadata begins at offset 128; LZ4 decompression there produces the expected 413 bytes. An in-memory version-field override from 6 to 7 selects UnityPy's header alignment and allows the complete container to parse. The APK is unchanged and the exact override, metadata hash and object counts are in `research/evidence/android-bootstrap-inspection.json`.

The parsed bundle contains UI/asset objects and no TextAssets. This removes a decoder obstacle but recovers no Android combat code and no verified combat-bundle download path. The earlier standard-decoder failure remains recorded separately; it was not evidence of a bad key or corrupt APK. Do not promote this compatibility parse to Android formula validation.
