# Role-based setup commands

`engine/role-state-command.mjs` executes setup-only command rows over an explicit
role registry. It exists independently of the damage-oriented state-sequence
runner: no fake enemy, HP snapshot or damage row is required. Each target selector
is bound to a supplied role ID, and each role carries its own type, live properties
and explicit tentacle context.

The first supported rows are `BEAddState` and `BEMonsterBubble`. State definitions,
maximums, property expressions, caster role, skill level and initial properties
are all supplied. Creation and merging use the separately tested state-property,
layer-merge and property-mutation components. Unsupported properties, targets,
conditions and effect types fail closed. Bubble rows emit a presentation record
only for a Monster role, matching the baseline runtime body.

Cmd 60401 is the first real setup case. With one Monster bound as `CmdCaster`, the
runner applies states 60089, 2900 and 60404 to that same role while keeping the
intervening bubble row in order. A supplied `Arg1` of 80 produces 80 Strength.
The three Reinforce received-damage properties each change by -20. In the tested
PvE context the role has zero maximum tentacle capacity, so `damage_plus` gains 80
while `tentacle_dmg` is explicitly blocked by the recovered property gate.

This is an authored composition of bounded recovered components. It does not run
the original command scheduler, derive the monster's ATK or Arg1, dispatch state
listeners, clear states, execute damage, or count as gameplay verification.
