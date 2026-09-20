# Command-driven damage and HP

`engine/active-command-experiment.mjs` exports `runActiveCommandExperiment`; `node tools/run_active_command.mjs input.json` exposes the same JSON interface to agents.

Input requires schemaVersion 1, kind `morimens-active-command-experiment`, build `pc-res144-build51`, interveningEffects `assumed-absent`, normalized rows, variables, offense, targetModifiers, targetState, repeatModifiers and immune. Every row must use BEActiveDamage and UpperTarget. Numeric variables are explicitly supplied; the reserved `UpperTarget.hp` always reads current target HP. The offense is the existing resolved show-damage input map without value and with skillArgsPlus exactly zero. Target modifiers use the existing active-target schema. targetState supplies living hp and block; repeatModifiers supplies plus and per.

Each accepted row initializes its repetition count, then reads parameters before each hit, calculates the active pre-hit formula and applies the existing ordinary shield/HP model. Output contains per-hit arithmetic/evidence, command condition and parameter-read traces, initial/final target state and partial results. Any lethal transition marks the experiment incomplete because death handling and retargeting remain unresolved. Skipped conditions do not produce hits.

The synthetic test command `UpperTarget.hp*.1,3` with neutral modifiers and 1,000 HP yields losses 100, 90 and 81; this demonstrates live command binding, not a real card claim. Other tests cover shared shield, immunity, rejected unknown inputs and lethal stop. The composed path has not been executed as a connected original runtime or compared with gameplay. Underlying component evidence is retained in each calculation.

Only ordinary subtype zero is supported. Fourth parameters/ParaPlus, active state-add variants, other effects, random or multiple targets, event listeners, caps, death resistance and automatic skill/build assembly are not connected here. The zero skillArgsPlus restriction follows the inspected GetSkillArgsPlus branch when no ParaPlus name is supplied; it is not permission to discard a real card's ParaPlus. Unsupported commands must be rejected, not coerced into this scope. The card-action timeline now accepts this experiment's command payload and connects its execution to prior resource checks/payment and shared target state; see CARD_ACTION_TIMELINE.md. The standalone command API still does not perform payment.
# Live expression adapters

The JavaScript API accepts an optional second argument with explicit
`allowedFunctions` and `callFunction` fields. These are passed to the command
condition and parameter interpreter; function calls are traced and reevaluated
at the same boundaries as other parameters. No function is enabled by default.
The JSON CLI alone does not supply these adapters. The state-sequence API binds
its declared static/live state queries through this interface, allowing prior
buff operations to affect later attack conditions and base expressions.

This is authored integration of the expression and Active components, not a
connected original command/state/damage execution claim. Callback side effects
must not be mistaken for implemented game events or gameplay evidence.
