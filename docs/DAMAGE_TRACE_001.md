# Trace 001 — 珈伦 Strike, partial evidence chain

**Status: not yet a complete proven attack.** Observed damage is 318. Missing combat state prevents a verified full prediction. This document deliberately retains that gap.

Scope: PC downloaded resource 144 / build 51 code and data; live record displayed 2026/9/19 23:46 in 融灾禁区, 星辰篇, wave 1 Normal. The replay's original combat build is unknown.

| Stage | Source / function | IDs and inputs | Output / evidence |
|---|---|---|---|
| Character | AwakerConfig | 15571, 珈伦; internal English name `Karen` | Skill list contains 4427; CONFIRMED_FROM_DATA |
| Card | Skill | 4427, 打击 / Strike, `Card_Strike`, original coefficients 0.1 and 5 | Damage argument `BattleAtkForce*GrowArgValue1`; CONFIRMED_FROM_DATA |
| Upgrade | BattleApi / `BattleCmdServer` coefficient initialization | `BattleFomula1`: `((SkillLevel-1)*20+100)/100*GrowArgValue`; observed level 3 | Damage coefficient 0.14; CONFIRMED_FROM_CODE_AND_DATA |
| Attack stat | BattleApi `BattleAtkForce` | `ceil(TargetCmdOwner.atk*(1+atk_per/100))` | Combat attack value still missing; base preview is not equipped combat state |
| Event | Cmd 2112 | First effect `BEActiveDamage`, `Arg1`, `UpperTarget`; second effect grants ultimate energy | Active damage branch; CONFIRMED_FROM_DATA |
| Offense | `BattleCmdServer.__GetShowDamage` → `BattleUtilServer.ShowDamageFormula` | Base factors, resolved STR and other flats, inside factors, reductions | Formula recovered; this replay's full resolved input vector unknown |
| Crit | `BattleCmdServer.__GetFinalDamage` | Record shows 51% crit damage; orange critical-colored 318 observed | Exact per-event flag and additional crit modifiers unconfirmed |
| Target | Same function / `GetTargetBeDmgPerMul` | Separate taken-damage slots and Vulnerable | Pre-hit full target state still required |
| HP | `BattleUnitBase.BeHit` | Shield, immunity, thresholds and other hit resolution | Cannot substitute damage statistic for full HP-loss proof |
| Record | Statistics, character tab, turn tab | Strike level 3, boss turn 1 | 318 observed; SUPPORTED_BY_OBSERVATION |

The replay also exposed a card value of 140 during the action sequence. `ceil(140 * 1.51 * 1.5) = 318` is a candidate explanation, not a validated reconstruction: the card's exact evaluation time, critical flag, Vulnerable state and absence of other applicable modifiers must be established independently. The displayed 51% is rounded upward by the record UI; combat initialization and later changes must establish the actual crit input. Do not use the observed 318 to solve missing inputs and then call the resulting equality verification.

Next evidence needed: preserve a pre-hit frame and damage frame, identify the exact event and temporary STR timing, capture equipped attack and relevant passive/relic properties, confirm target state, and establish recorded-build compatibility. Keep this derivation record out of the holdout set.
