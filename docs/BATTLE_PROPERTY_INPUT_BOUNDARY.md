# Battle property input boundary

The PC build does not locally assemble every final battle modifier from a character selection inside `BattleUnitAwaker`. `BattleUnitBase:ctor` constructs `BattlePropertyServer` directly from `roleData.properties`, and the property server copies and rounds that supplied map. The battle payload therefore already contains a prepared property vector.

The client does expose preview reconstruction through `AwakerDataUtils.GetAwakerBaseAttrValue`: it selects the character base value, resolves the level/quality upgrade formula and attribute-talent level, and evaluates the primary-stat formula. That boundary supports the existing level/Gnostic primary-stat modules. It does not prove how Soulforge, both Wheels, trinket substats, team passives, season talents and battle-start states were folded into the battle payload.

For an auditable gameplay prediction, the calculator must receive either:

1. a captured pre-action battle `properties` snapshot from the same run; or
2. separately reconstructed and evidenced transformations for every source that produces that snapshot.

Character-preview screenshots are insufficient when conditional exploration effects are active. The saved Frenzy Arachne record shows the build and post-action states, but it does not freeze the full pre-hit `roleData.properties` map. Its 2,205 Strike total therefore remains an observation, not a prediction target that may be used to solve missing modifiers.
