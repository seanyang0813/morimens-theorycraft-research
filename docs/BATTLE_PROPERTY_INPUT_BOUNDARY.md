# Battle property input boundary

The PC build does not locally assemble every final battle modifier from a character selection inside `BattleUnitAwaker`. `BattleUnitBase:ctor` constructs `BattlePropertyServer` directly from `roleData.properties`, and the property server copies and rounds that supplied map. The battle payload therefore already contains a prepared property vector.

The client does expose preview reconstruction through `AwakerDataUtils.GetAwakerBaseAttrValue`: it selects the character base value, resolves the level/quality upgrade formula and attribute-talent level, and evaluates the primary-stat formula. That boundary supports the existing level/Gnostic primary-stat modules. It does not prove how Soulforge, both Wheels, trinket substats, team passives, season talents and battle-start states were folded into the battle payload.

For an auditable gameplay prediction, the calculator must receive either:

1. a captured pre-action battle `properties` snapshot from the same run; or
2. separately reconstructed and evidenced transformations for every source that produces that snapshot.

Character-preview screenshots are insufficient when conditional exploration effects are active. The saved Frenzy Arachne record shows the build and post-action states, but it does not freeze the full pre-hit `roleData.properties` map. Its 2,205 Strike total therefore remains an observation, not a prediction target that may be used to solve missing modifiers.

`engine/battle-property-snapshot-damage.mjs` now provides the adapter for a future capture. It accepts either the complete raw `roleData.properties` maps, applying the constructor ceiling exactly once, or complete live `BattlePropertyServer` maps without re-rounding. Missing keys follow the original `GetProperty` zero default and are recorded in a read trace. A captured card map can enter the runtime-checked card setup path, including instruction-card inside/outside factors, card damage buckets, card strength, Strike outside-damage cap, card and owner-card critical damage, instruction damage taken and card block-barrier damage. The supported scope is a PvE Awakener ordinary direct Active hit; Card_Awake, state-trigger-add and alternate formula modes fail rather than being inferred.

`engine/target-damage-eligibility.mjs` derives the monster property buckets, all ten configured target-state buckets, and block-barrier eligibility from a captured monster battle tag and active state IDs. `MonsterGrade1` and `MonsterGrade2` intentionally activate both the general normal-monster bucket and their grade-specific bucket, matching the client substring lookup. State `3638` activates the same barrier branch for owner and card damage. Buff/debuff presence remains explicit because it depends on the live state-manager classification rather than the numeric property maps.

Critical outcome is derived from the captured maps and tags through `engine/crit-resolution.mjs`. Card, Awakener, player, block and strict target-HP certain-crit branches are resolved before the ordinary chance branch. The ordinary branch combines card, caster, player and tag chance, applies caster percentage scaling and target anti-crit, ceilings the result, and compares it inclusively with a 1–100 roll. A chance from 1 through 99 requires an integer `targetContext.critRoll` captured before the observed hit. Supplying the observed crit result is not accepted. Chances outside that interval have a knowable result without the roll, although the original game still consumes an RNG draw in that branch, so later RNG-stream reconstruction remains separate work.

This adapter is eligible for `tools/freeze_gameplay_prediction.mjs` with the `preHitDamage` metric. A freeze still needs evidence that the maps are complete and came from the same pre-action boundary. The adapter does not make the existing screenshots complete retroactively.
