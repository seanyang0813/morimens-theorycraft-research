# Terminal self-state command

`engine/terminal-state-command.mjs` composes three existing research boundaries without dropping effects:

1. import the complete exported command in one-based row order;
2. execute an Active-damage / ultimate-energy prefix through `runDamageEnergyCommand`;
3. evaluate one final unconditional `BEAddState` targeting `CmdCaster` or the supplied damage target;
4. require the evaluated state ID and layer to match an explicit state definition and request;
5. apply that state through `runStateSequenceExperiment` against the live post-prefix snapshot.

The prepared-skill runner now selects the actual potency-3 command for Skill4163, supplies its calculated Arg bindings and executes Cmd57564 under this contract. A separate real command fixture executes Cmd23548's two Active hits and then applies State2934 Vulnerable to the target; the damage precedes the new Vulnerable property. The Actions workbench accepts the same versioned JSON kind and displays the prefix rows plus the applied state.

The contract currently supports one supplied single target. The final state must be unconditional and owned by either the caster or that target. It does not support a state in the middle of a command, later rows reading the new state, target acquisition, card payment, arbitrary callbacks or automatic state/build assembly. Prefix death stops state application. Component and integration tests do not constitute a connected original execution or gameplay validation.
