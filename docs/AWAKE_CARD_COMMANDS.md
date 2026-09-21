# Awake-card command boundary

`Card_Awake` is a command category rather than an ordinary direct-damage tag in the inspected PC catalogs. `tools/audit_awake_card_commands.py` follows every Awake skill's direct `CmdList` and `tempCmdList` reference and inventories its command rows.

Resource 144/build 51 contains 69 Awake skills, 64 linked commands and 314 directly linked rows. Resource 150/build 51 retains the same skill and command counts and has 315 rows; the additional row is `BERemoveState`. Neither catalog contains a directly linked `BEActiveDamage`, `BEActiveDamage.State`, `BEPassiveDamage`, `BEFixedDamage`, `BEPureDamage` or `BETentacleAttack` row for an Awake skill.

Most direct rows add states or energy. The remainder creates or moves cards, changes tentacle limits/counts, selects temporary targets, triggers states, or invokes custom/nested command effects. This explains why `prepareCardPveOffense` rejects `Card_Awake`: the ordinary direct-damage assembler is not the relevant execution path. A theorycraft simulator must execute the Awake command graph and resulting state/resource transitions instead of forcing the card through a damage formula.

This is a source-hashed catalog audit, not runtime or gameplay validation. `BEExecuteCmd`, `BERunCardCmd` and customized effects can reach nested commands, so zero directly linked damage rows does not prove that an Awake play can never cause later damage. Those nested graphs and state callbacks remain separate work.
