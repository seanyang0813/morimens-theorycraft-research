# Recovered formula — PC resource 144 / content build 51

Status: code recovered; offensive utility independently translated and tested against original bytecode. Not yet independently validated against gameplay. No publication gate passed.

The engine currently accepts explicitly resolved internal inputs. It does not yet infer them safely from character names, translated tooltips or equipment.

## Offensive utility

Let B be raw event value times six separate base factors: awakerOutsideDamagePer, awakerInsideBasicDamagePer, playerOutsideDamagePer, cardOutsideDmgPer, curCardDamagePer and basicDamagePer (each 1+p/100), then the supplied skillTypeOutsideDmgPer and skillTypeDmgPer products. These skill-type inputs are multipliers, not percent points.

F is the sum of cardDamagePlus, strength, ultiDamgePlus (original spelling), strikecard_damage_plus, skillArgsPlus and awakerDamagePlus. B's factors do not multiply F.

The subtotal B+F is multiplied by enhancement, weakness, each of nine awakerInsideDamagePer slots, playerInsideDamagePer, dimension_fix_per, cardInsideDmgPer and cardDamagePer2. The pair cardDamagePer3 and card_damage_per3_n2 adds within one factor. awaker_CmdCard_dmg_per and awaker_ulti_dmg_per are separate factors, followed by skillTypeInsideDmgPer.

Round up after subtracting 0.00001 and impose minimum 1. Multiply five separate spellbound reduction factors, round down after adding 0.00001, and impose minimum 1 again. Exact floating-point evaluation order is preserved in `engine/show-damage.mjs`; algebraically equivalent rewrites can differ at boundaries.

## STR preparation

BattleCmdServer.__GetShowDamage adds player and caster damage_plus where applicable. Positive strength is multiplied by `1 + awaker_strength_multiple/100 + card_strength_multiple/100 + ulti_strength_multiple/100`, then by `1 + awaker_dmg_power_per_scale/100`. This positive-only condition matters for negative STR. Do not scale a value twice if it has already been resolved.

## Crit and target processing

__GetFinalDamage adds caster, card, skill-tag and caster-card crit-damage contributions, scales that sum by crit_damage_per, and applies `1 + resultingCritDamage/100` on eligible critical hits. Target be_damage_per slots multiply separately. Vulnerable is another factor, followed by conditional enemy category/state/buff/debuff/block factors. be_damage_plus is added after those products. Finally ceil and minimum 1, without the offensive utility's epsilon.

Formula subtypes may exclude self or target processing. This is not yet exposed as supported public input. Crit probability, forced overrides and per-hit sampling require separate validation; a supplied crit outcome is not a prediction of RNG.

The card/Strike branch now has 282 exact original-runtime comparisons in `tests/card-target.test.mjs`. The four crit sources are caster crit_damage, card crit_damage, caster crit_damage_from_strikecard and caster card_crit_damage. They sum before caster crit_damage_per scales the sum. Non-critical outcomes omit all four contributions. In this internal API, a resolved crit-damage bonus of 150 means a 2.5x critical factor, before other factors; this does not settle whether a user's informal "150% crit damage" means that stat or a 1.5x total multiplier.

GetTargetBeDmgPerMul always includes target slots 1-3, adds slot 4 only for an Ulti tag, and adds slot 5 only for an instruction card. Its state-trigger-add early return omits slots 4/5. The card's block/barrier percentage is eligible when target block is positive OR the configured barrier-state query succeeds; both conditions together still contribute the same factor once. The new oracle controls those conditions rather than reconstructing actual barrier-state IDs. The existing active-target API consumes already-resolved eligible slots; callers must not pass every displayed property indiscriminately.

## Boundaries

## Card-specific preparation

The explicit-card adapter `engine/card-offensive-setup.mjs` has 330 exact original-runtime comparisons. For a non-Awake card in the tested PvE path, card_damage_per2 enters its separate inside factor. Instruction cards also enable caster i_damage_per_card, o_damage_per_card and awaker_CmdCard_dmg_per. A positive card o_damage_per_strikecard_limit caps that tag's outside percentage before the tag product is formed; zero/negative limits do not cap it.

The card's card_damage_per is a base-stage factor; card_damage_plus is flat; card_strength_multiple participates in the positive-STR effectiveness sum. card_damage_per3 and the instruction-card caster property card_damage_per3_n2 share one additive percentage factor. IsStateTriggerAdd clears cardDamagePer2, cardDamagePer3, card_damage_per3_n2, awaker_ulti_dmg_per and awaker_CmdCard_dmg_per, but does not blanket-clear every card contribution. Card identity, ownership, the instruction flag and state-trigger status must be resolved for actual events rather than inferred from animation or names. Awake tags and exclusive formula subtypes remain excluded from this adapter.

ShowDamageFormula is not final HP loss. Shields, damage immunity, HP-loss caps, active-damage thresholds and death resistance occur later. Fixed, Pure and Tentacle use distinct entry paths. No generic DEF divisor appears in the traced active target/hit path. See DEFENSE.md for the narrower conclusion and unresolved stat mapping.
