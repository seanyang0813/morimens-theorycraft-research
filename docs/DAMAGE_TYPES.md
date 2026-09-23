# Damage categories

The matrix below concerns PC144 copied code, not a verified public category matrix.

The installed PC resource-151 client now has a bounded Fixed/Pure carry-forward
check: its copied original effect methods, effect base and selected current
dependencies reproduce 372 Fixed and 322 Pure synthetic pre-hit cases exactly.
The comparison intercepts `BeHit` and therefore does not establish HP loss,
catalog argument preparation or independent gameplay accuracy. See
`research/evidence/pc-res151-fixed-pure-runtime.json`.
The shared experimental `calculateDamage` API now accepts resolved Fixed/Pure
pre-hit inputs for resource 150/151 and rejects current-build HP resolution.
It still returns `finalDamage: null`.

For Tentacle, the installed resource-151 `SchoolCompPVE.CalcTentacleDmg`
matches the copied original module byte-for-byte. A resolved-input calculator
matches 414 executions of that installed method with one synthetic Awakener and
a deterministic critical roll. Four target damage percentages multiply; crit,
Vulnerable, enemy-type/buff/debuff/block/barrier and per-state factors multiply
outside them. Target flat damage and the command's ParaPlus are added before
one ceiling and a minimum of one. The preceding `BETentacleAttack` effect
ceil, target selection, repeats and chance roll are separate dependencies. See
`research/evidence/pc-res151-tentacle-prehit-runtime.json` and
`research/examples/theorycraft-installed-tentacle-prehit.json`. This path also
returns `finalDamage: null` and rejects HP resolution.

In 102 private PvE replay records, 905 complete Tentacle hits appear across 17
replays and 204 action windows. Only 58 have both immediate caster and skill
identity matching the played card; 39 of those have one direct
`BETentacleAttack` command row and 19 require nested/other source tracing.
These are coverage counts, not Tentacle damage predictions or holdout evidence.
See `research/evidence/tentacle-replay-coverage.json`.

A separate outcome-first PvE replay audit reconstructs 85 Fixed pre-hit values
exactly from captured card arguments, six conditional command rows, live state
layers, target Fixed properties and the player's dimension modifier. Those hits
come from 30 actions in one recorded battle; twelve have a nonzero dimension
modifier and one has a nonzero Fixed target property. The conditional boosted
branch was not observed. Its original combat build is unknown, so this is
retrospective component consistency, not an independent holdout or proof of the
installed build. See `research/evidence/fixed-replay-consistency.json`.

| Stage | Active | Tentacle | Fixed | Pure |
|---|---|---|---|---|
| Offensive utility | ShowDamageFormula | Distinct installed SchoolCompPVE calculation | Bypassed by effect | Bypassed by effect |
| STR | Added in active setup | No automatic STR addition in the resolved pre-hit method | No automatic addition | No automatic addition |
| Crit | Yes, eligibility/overrides | Separate Tentacle roll and bonus | false | false |
| Generic target factors | be_damage_per family | be_damage_per 1–3 plus tentacle | be_fixed_damage_per 1–5 | Not applied in BEPureDamage |
| Vulnerable | Separate factor | Separate factor | Not in effect | Not in effect |
| Shared hit resolver | Yes | Yes | Yes | Yes |
| Psychic Trauma mapping | `be_damage_per2` | `be_damage_per2` | Not in effect | Not in effect |

Pure: nonpositive base values are skipped; positive values ceil; isCrit=false. Fixed: multiply its five target factors, ceil, apply CalFinalVal, minimum 1, then BeHit. CalFinalVal and upstream parameter expressions remain dependencies, so a raw Fixed number is not yet a complete supported scenario.

Upstream expressions can already contain calculated values. Bypassing an automatic stage does not mean an effect's input could never have been derived from that stage. Status application must be tracked separately from subsequent damage triggers to prevent double application.

BEActiveDamage recalculates hit count with additive and percentage modifiers and clamps it to at least one. Parameter generation, inter-hit state events and target death can change later hits. No complete battle simulator is being built.
