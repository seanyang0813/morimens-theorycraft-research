# Role-based setup commands

`engine/role-state-command.mjs` executes setup-only command rows over an explicit
role registry. It exists independently of the damage-oriented state-sequence
runner: no fake enemy, HP snapshot or damage row is required. Each target selector
is bound to a supplied role ID, and each role carries its own type, live properties
and explicit tentacle context.

The supported state rows are `BEAddState`, `BESubStateLayer` and
`BERemoveState`; `BEMonsterBubble` is supported as a presentation row. State definitions,
maximums, property expressions, caster role, skill level and initial properties
are all supplied. Creation and merging use the separately tested state-property,
layer-merge and property-mutation components. Unsupported properties, targets,
conditions and effect types fail closed. Bubble rows emit a presentation record
only for a Monster role. The baseline and installed resource-150 modules are
byte-identical and reproduce the same six runtime fixtures.

Layer subtraction updates `ChangedLayer` contributions before life end. Reaching
zero then reverses any retained non-layer contribution exactly once. Explicit
removal reverses the current stored contributions and preserves the recovered
deletion, property-removal, record, log and `StateLifeEnd` request order. Listener
dispatch and caster-layer attribution during subtraction remain outside the boundary.

Cmd 60401 is the first real setup case. With one Monster bound as `CmdCaster`, the
runner applies states 60089, 2900 and 60404 to that same role while keeping the
intervening bubble row in order. A supplied `Arg1` of 80 produces 80 Strength.
The three Reinforce received-damage properties each change by -20. In the tested
PvE context the role has zero maximum tentacle capacity, so `damage_plus` gains 80
while `tentacle_dmg` is explicitly blocked by the recovered property gate.

This is an authored composition of bounded recovered components. It does not run
the original command scheduler, derive the monster's ATK or Arg1, dispatch state
listeners, clear states, execute damage, or count as gameplay verification.

The runner accepts pinned resource-144 and resource-150 inputs. The prepared
skill, command catalog, experiment snapshot and reported build must agree;
mixed-build execution is rejected.
