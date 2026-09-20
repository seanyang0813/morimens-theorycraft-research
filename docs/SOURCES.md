# Evidence sources

## Local original sources

`research/builds/pc.json` and `android.json` contain source/copy paths, sizes, hashes and research date. PC Steam app 3052450, build 23408611; downloaded combat resources 144 / content build 51. Android package `com.qookkagames.z1.gw.hk`, version 2.5.1 / code 30, bundled resources 83 / build 54. Do not merge the builds' mechanics.

`research/symbols/text-assets.json` maps copied bundles to extracted TextAssets. `lua-index.json` maps module names to original Lua source names and private prototype paths. The relevant original modules are `BattleUtilServer`, `BattleCmdServer`, `BattleUnitBase`, `BattlePropertyServer`, `BattleStateServer`, `BEActiveDamage`, `BEPureDamage`, `BEFixedDamage`, `BETentacleAttack`, `BattleReplayPlayer` and `BattleRecord`.

Direct data exports in `research/extracted/config/` include AwakerConfig, Skill, Cmd, State, BattleApi and BattleConfig. They are obtained by loading copied config chunks with an identity `System.readonly` helper, not by guessing localized text.

## Runtime tests

`tools/runtime_oracle.py` invokes copied original bytecode using the copied original XLua library. `tests/synthetic/original-runtime.json` records the utility oracle's source hash and expected outputs. Dependencies are narrowly stubbed; these are synthetic tests, not recorded battles.

`tools/target_runtime_oracle.py` similarly executes original `__GetFinalDamage` and `GetTargetBeDmgPerMul` with explicit synthetic actor/target adapters. Its fixture manifest declares excluded card/skill-tag inputs. `research/evidence/registry.json` records source hashes, scope and evidence status; `tools/build_evidence_registry.py` verifies hashes when regenerating it.

## Gameplay and in-game descriptions

`tests/observations/replay-001-colleen-strike.json` records the incomplete real replay candidate. Private screenshots are under `research/observations/replay-001/`. The game's Damage Amplification tooltip is saved as `damage-amp-definition.png`. Raw screenshots can contain account identifiers; do not include the research directory in public site output.

## Extraction quality

Readable decompilation is a derived aid, not original source. The integer-tag correction requires fresh extraction from original chunks to preserve negative constants. Direct config exports and original-runtime tests do not depend on decompiler text. Record ambiguous or poorly structured branches as unresolved until checked against original execution or instructions.

Official patch notes and public gameplay still need version-matched review. No community formula is currently used as verified implementation evidence.
