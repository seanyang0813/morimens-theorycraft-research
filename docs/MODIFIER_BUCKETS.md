# Modifier buckets — PC resource 144 / build 51

These are recovered internal rules, not a gameplay-verified coverage claim. Percentages are percentage points unless described as a product. Same translated wording is insufficient to assign a bucket.

| Effect | Internal ID | Stage | Operation / bucket | Stack rule | Applies to | Evidence / status |
|---|---|---|---|---|---|---|
| Character outside damage | `o_damage_per` | Base | Independent percent factor | Resolved property total | Active utility | `BattleCmdServer.__GetShowDamage`, `BattleUtilServer.ShowDamageFormula`; code + synthetic runtime |
| Character inside base damage | `i_basic_damage_per` | Base | Independent percent factor | Separate from outside damage | Active utility | Same |
| Team base damage | `basic_damage_per`, state 20022 | Base | Independent percent factor | State expression `ChangedLayer` | Active utility | State data + same code |
| Card outside / current-card base damage | `cardOutsideDmgPer`, `curCardDamagePer` | Base | Two independent factors | Do not merge | Active utility | Same code + runtime |
| STR | `damage_plus`, states 2900 / 3130 / 2619 | Flat | Add after base multiplication | Positive contribution gets effectiveness; negative contribution does not | Active; separate Tentacle property application | State data, `__GetShowDamage` |
| STR effectiveness | `awaker_strength_multiple`, card and ultimate equivalents | STR | Sum percentages in one factor | Then multiply `awaker_dmg_power_per_scale` independently | Positive STR | `__GetShowDamage`; code |
| Inside damage slots | `i_damage_per`, `i_damage_per1` … `i_damage_per8` | Offensive subtotal | Nine independent factors | Contributions to the same resolved property accumulate; different slots multiply | Active utility | Property update + formula code; runtime |
| Paired card bonus | `cardDamagePer3`, `card_damage_per3_n2` | Offensive subtotal | Shared additive factor | `1 + a/100 + b/100` | Eligible active cards | Formula code + runtime |
| Spellbound reductions | Five `spellboundDmgPer` inputs | After offensive ceil | Five independent reduction factors | Product of `1-p/100` | Active utility | Formula code + runtime |
| Crit damage | `crit_damage`, card, skill-tag, `card_crit_damage` | Crit | Sum bonuses, then scale sum by `crit_damage_per` | Multiply damage by `1 + scaledSum/100` | Eligible critical active hits | `__GetFinalDamage`; code |
| Generic damage taken | `be_damage_per`, `be_damage_per2`, `be_damage_per3` | Target | Three independent factors | Same property shares accumulator | Active and Tentacle paths | `GetTargetBeDmgPerMul`, Tentacle code |
| Ultimate / instruction damage taken | `be_damage_per4`, `be_damage_per5` | Target | Conditional independent factors | Excluded for state-trigger-add path | Eligible Active events | `GetTargetBeDmgPerMul`; code |
| Vulnerable | State 2934 → `vulnerable_per` | Target | Independent `1+p/100` factor | Ordinary state sets 50; its property expression does not scale with layers | Active and Tentacle | State data + target formula + state property code |
| Psychic Trauma | States 80335 / 80331 → `be_damage_per2` | Target | `ChangedLayer*3` in slot 2 | +3 points per changed stack; same slot adds; multiplies Vulnerable | Active and Tentacle | State data + target formula + state property code |
| Target flat damage | `be_damage_plus` | Target, after products | Flat addition | Add after crit/target products | Active and Tentacle paths | Target formula code |

`BattlePropertyServer.AddProperty/SubProperty` add/subtract changes from stored totals, with special preprocessing for some stats. `BattleStateServer.InitProperty` rounds property application upward. `UpdatePropertyWhenLayerChanges` reevaluates layer-dependent expressions. Thus property accumulation and damage-time multiplication are different operations; a universal rule that every buff independently multiplies is false.

Vulnerable's ordinary state has a large duration-layer maximum (999999999), decrements before a turn and clears before battle end. Extra duration is not automatically another 50% multiplier. Psychic Trauma variant 80335 caps at 10. Variant 80331 uses `15 + CmdCaster.GetStateLayer(133235)*5`; both clear after turn end and before battle end. The additional state 133235 still needs its own source/eligibility trace before exposing the raised cap as selectable user input.

Names shown in the UI as Damage Amplification have an in-game tooltip covering base damage, fixed-value Poison/Counter generation and initial Tentacle damage. This semantic evidence alone does not justify assigning every similarly named source to `o_damage_per`; equipment-to-property mapping remains necessary.
