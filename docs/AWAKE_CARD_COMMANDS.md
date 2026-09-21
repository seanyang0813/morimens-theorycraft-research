# Awake-card command boundary

`Card_Awake` is a command category rather than an ordinary direct-damage tag in the inspected PC catalogs. `tools/audit_awake_card_commands.py` follows every Awake skill's direct `CmdList` and `tempCmdList` reference and inventories its command rows.

Resource 144/build 51 contains 69 Awake skills, 64 linked commands and 314 directly linked rows. Resource 150/build 51 retains the same skill and command counts and has 315 rows; the additional row is `BERemoveState`. Neither catalog contains a directly linked `BEActiveDamage`, `BEActiveDamage.State`, `BEPassiveDamage`, `BEFixedDamage`, `BEPureDamage` or `BETentacleAttack` row for an Awake skill.

Most direct rows add states or energy. The remainder creates or moves cards, changes tentacle limits/counts, selects temporary targets, triggers states, or invokes custom/nested command effects. Following the three unique literal command references one level reaches 11 rows in each build. One is `BEPassiveDamage`; it is reached through a potency-gated customized command. The other literal branches swap states. One `BERunCardCmd` row remains dynamic because it executes the command of a card selected from the consumed deck.

This explains why `prepareCardPveOffense` rejects `Card_Awake`: the ordinary Active-damage assembler is not the relevant execution path. A theorycraft simulator must execute the Awake command graph and resulting state/resource transitions, including the conditional Passive branch, instead of forcing the card through the Active formula.

This is a source-hashed catalog audit, not runtime or gameplay validation. The literal traversal is one level only; the dynamic selected-card command, recursive state-trigger graphs, conditions, targets and effect execution remain separate work.
