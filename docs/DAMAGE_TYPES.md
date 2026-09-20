# Damage categories

All statements below concern PC144 copied code, not a verified public category matrix.

| Stage | Active | Tentacle | Fixed | Pure |
|---|---|---|---|---|
| Offensive utility | ShowDamageFormula | Distinct tentacle setup | Bypassed by effect | Bypassed by effect |
| STR | Added in active setup | Separate setup, pending | No automatic addition | No automatic addition |
| Crit | Yes, eligibility/overrides | Separate crit calculation | false | false |
| Generic target factors | be_damage_per family | be_damage_per 1–3 plus tentacle | be_fixed_damage_per 1–5 | Not applied in BEPureDamage |
| Vulnerable | Separate factor | Separate factor | Not in effect | Not in effect |
| Shared hit resolver | Yes | Yes | Yes | Yes |
| Psychic Trauma mapping | `be_damage_per2` | `be_damage_per2` | Not in effect | Not in effect |

Pure: nonpositive base values are skipped; positive values ceil; isCrit=false. Fixed: multiply its five target factors, ceil, apply CalFinalVal, minimum 1, then BeHit. CalFinalVal and upstream parameter expressions remain dependencies, so a raw Fixed number is not yet a complete supported scenario.

Upstream expressions can already contain calculated values. Bypassing an automatic stage does not mean an effect's input could never have been derived from that stage. Status application must be tracked separately from subsequent damage triggers to prevent double application.

BEActiveDamage recalculates hit count with additive and percentage modifiers and clamps it to at least one. Parameter generation, inter-hit state events and target death can change later hits. No complete battle simulator is being built.
