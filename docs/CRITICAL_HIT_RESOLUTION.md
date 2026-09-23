# Critical-hit resolution boundary

The implementation in `engine/crit-resolution.mjs` translates `BattleCmdServer:CalcCrit`, `__CalcCardCrit`, and `__CalcAwakerCrit` from PC resource build 144/build 51. `tools/crit_oracle.py` executes those original copied Lua methods in an isolated XLua state with explicit synthetic objects. The JavaScript translation matches all 263 generated oracle cases exactly.

The original order is observable and preserved:

1. A present card guarantees a crit against a blocking target when `card_crit2block > 0`, or whenever `card_certain_crit > 0`.
2. An Awakener checks `certain_crit`, Strike-specific certainty, block-specific certainty, then the strict greater-than-HP and lower-than-HP ratio rules.
3. The player `certain_crit` property is checked.
4. Ordinary chance adds card crit, caster crit, Awakener player crit, Awakener card crit, and mapped Strike/ultimate tag crit. It multiplies by `(100 + crit_per) / 100`, subtracts target `anti_crit`, and ceilings once.
5. The result is a crit when the ceiled chance is greater than or equal to the battle RNG draw from 1 through 100.

The resolver accepts a captured roll but never generates one. With no roll, chances from 1 through 99 return `RNG_REQUIRED`. Certain-crit branches need no draw. An ordinary chance at least 100 or below 1 has a deterministic result, but the original code still advances its RNG stream. This is sufficient for an isolated hit prediction and insufficient to reconstruct later random outcomes without the original stream state.

The [resource-151 replay RNG audit](../research/evidence/replay-rng-boundary-20260923.json) checked the latest controlled-capture candidate without publishing its seed. Its battle descriptor contains a nonzero `randomseed` and `svrRunBattle=true`, but the decoded replay has no serialized `randomState` or `rngState` field. The installed resource-151 `CRand.lua` and `Rand.lua` assets are byte-identical to the copied resource-144 wrappers. In the recovered resource-144 `BattleEngine:InitRand`, server-run battles use `CRand`, which delegates to native `require("rand")`; client-run battles use `Rand`, which delegates to Lua `math.random`. The native PRNG implementation and the intervening draw sequence have not been reconstructed for this replay. Its seed therefore cannot be supplied as a pre-hit `critRoll`, and this audit supplies no holdout credit. Reproduce the identifier-free audit with `tools/audit_replay_rng_boundary.py` and a private decoded replay plus the installed `share.ab`.

The runtime oracle is synthetic evidence about the recovered methods. It is not independent gameplay validation and does not satisfy the publication gate.
