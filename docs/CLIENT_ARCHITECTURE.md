# Client architecture — preliminary, 2026-09-19

## Confirmed from local files

- PC Steam app 3052450, build 23408611, discovered through Steam library configuration and app manifest.
- Tuanjie/Unity player: `TuanjiePlayer.dll`; bundle header identifies `2022.3.61t8`.
- IL2CPP: `GameAssembly.dll` and valid magic/version-31 `Morimens_Data/il2cpp_data/Metadata/global-metadata.dat`.
- XLua: PC `Morimens_Data/Plugins/x86_64/xlua.dll`; Android `lib/arm64-v8a/libxlua.so`.
- Separate installed and downloaded resource manifests; scripts group explicitly contains `gamescript.ab`, `config.ab`, `foundation.ab`, `gamelauncher.ab`, `share.ab`.
- Metadata contains `LuaLoader`, `LoadLuaBytesFromFileSystem`, `StartLoadLuaBundle`, `LoadLuaBundleAsync`, and `Bytes/StartUp.txt`.
- Startup and script archive have Lua 5.4-like magic with a nonstandard format byte (`1b4c75615430...`). Downloaded module decoding is now recovered.
- Windows XLua PE has `.themida` and `.boot` sections; its exported key accessor RVA is not backed by ordinary file bytes. Android accessor can be inspected statically instead.
- Android `xlua_get_key` at ELF address 0x6da6c reads a pointer at 0x274798; the ELF relocation resolves to 0x21f54f. This establishes a local loader key source. The value is deliberately omitted from published documentation.

## Recovered loading path

The engine hashes the XLua key before installing the bundle key. Offline emulation of that leaf routine produces a key accepted by the UnityPy bundle-signature check. Five downloaded bundles expose 3,214 Lua TextAssets. Their inventory and hashes are in `research/symbols/text-assets.json`.

The LuaEnv constructor installs a public key through `lua_spl`. With that same initialization, the copied Windows XLua library parses the original chunks. Constants, nested prototypes, locals and upvalues are indexed without executing chunks. Instructions use a separate per-prototype decoder; offline emulation of the Android leaf decoder and removal of its synthetic opcode permits standard Lua 5.4 decompilation. The Android implementation is used as a decoding tool, not substituted as the PC combat rules.

`tools/runtime_oracle.py` executes only the copied BattleConst and BattleUtilServer modules in an isolated Lua state with standard libraries and a restricted dependency loader. It has no game-process connection. The original ShowDamageFormula agrees with the independent JavaScript translation on 2,262 synthetic cases.

## Combat and replay architecture

The downloaded `share` bundle contains `Battle.DbgEngine` modules, including BattleCmdServer, BattleUnitBase, damage effects, stat processing and event records. The word Server in a module name does not prove that computation occurs exclusively remotely. A full local implementation is present; actual authority for each live game mode remains to be traced through the battle startup flags.

BattleReplayPlayer receives a battle descriptor and recorded command/result frames, decompresses LZ4 and MessagePack data, and sends those frames into the render-side battle manager. Replay setup sets `svrRunBattle=false` and `isReplay=true`. Watching recorded damage is therefore distinct from running our formula against itself. The replay downloader obtains authorized object headers through the normal game protocol; no backend authentication or remote probing is part of this research.

Concrete arithmetic paths: BEActiveDamage → BattleCmdServer.GetRealDmg → __GetShowDamage → BattleUtilServer.ShowDamageFormula → __GetFinalDamage → BattleUnitBase.BeHit → BattleUnitUtil.CalcBlockedDamage → HP resolution. Pure, Fixed and Tentacle branch before the shared hit resolver.
