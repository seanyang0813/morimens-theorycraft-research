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

The Tentacle command's `PlayerRole.tentacle_dmg` is a special parser alias to
`BattleUnitPlayer:GetTentacleDamage()`, not a direct read of the stored
`tentacle_dmg` property. The installed resource-151 player method matches 377
synthetic original-runtime executions. Its decoded method body and the parser
alias body match resource 144, even though their containing modules differ.
With stored `tentacle_dmg=38`, `tentacle_base_dmg=103` and
`basic_damage_per=86`, neutral inside factors produce a computed player value
of 230. A card expression multiplying that by `occupation_master=92` and
dividing by 200 ceilings to 106 before target multipliers. The installed
`TentacleDamageForPowerPercent` constant is -100%, so the Power-layer term is
numerically zero in this build. See
`research/evidence/pc-res151-player-tentacle-runtime.json` and
`research/evidence/pc-res151-tentacle-source-parity.json`.

After that correction, a strictly filtered retrospective subset has 34 exact
noncritical Tentacle pre-hit comparisons from 34 actions in four replays, with
zero mismatches. The filter requires a directly matching caster/skill identity,
one exact `BETentacleAttack` row, a living monster and zero conditional Awaker
damage bonuses; recorded target Tentacle, Vulnerable and flat modifiers are
applied. Five additional known critical outcomes match the international Crit
DMG branch and none matches the Japan branch. That branch check does not prove
the replay region or random draw. The recorded combat build is unknown and all
outcomes were inspected first, so this is component consistency only, not a
blind holdout. See
`research/evidence/tentacle-replay-simple-consistency.json`.

The `calculate-direct-tentacle-command` agent operation now joins these
separately checked stages for the exact direct row
`PlayerRole.tentacle_dmg*CmdCaster.occupation_master/200,1,0`. Its public
example traces 230 player value to 106 effect damage to 235 pre-hit damage
under explicitly supplied international critical and target modifiers. The
composed path agrees with all 39 selected retrospective staged comparisons;
these are the same inspected actions and provide no new holdout credit. The
operation is fixed to that row shape and stops before BeHit/HP. See
`research/examples/theorycraft-installed-direct-tentacle-command.json`.

The installed `BattleZoneUtil.GetTentacleCritDmg` is byte-identical to resource
144 and matches 308 synthetic runtime cases. International mode applies
`ceil(outside Crit DMG + average Awaker Crit DMG - 50)`; Japan mode returns the
outside Crit DMG property. This is a conditional bonus *after* a critical hit;
the critical chance and random roll are separate. See
`research/evidence/pc-res151-tentacle-crit-runtime.json`.

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
