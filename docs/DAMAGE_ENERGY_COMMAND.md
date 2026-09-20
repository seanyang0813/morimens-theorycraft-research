# Mixed damage and energy commands

`runDamageEnergyCommand` imports every row and supports ordinary active damage to UpperTarget plus ultimate-energy gain to CmdCaster. It preserves enemy HP/shield and caster energy between rows. Conditions and parameters may read live UpperTarget.hp and CmdCaster.ulti_energy alongside explicitly supplied numeric variables. Formula traces, energy applications and command-row evaluation traces are retained.

The support inspector now has an explicit `damage-and-energy` profile; its default damage-only profile is unchanged. Unknown handlers, target selectors, expression functions, VFX, timing and other unsupported fields block the entire command. The runner returns UNSUPPORTED_COMMAND without a partial calculation. Active damage that requires death resolution stops later rows and marks execution incomplete; it does not assume post-death energy gain is valid.

Run `node tools/run_damage_energy_command.mjs research/examples/damage-energy-command.json`. The example includes actual exported command 2112 with explicit synthetic arguments 120/10, target HP 1000, caster energy 95, maximum 100 and neutral modifiers. It models HP 880 and energy 100. Source hash and assumptions are in the adjacent provenance JSON. This is not a reconstructed character build or gameplay prediction.

The composition uses the command-row scheduler and independently probed damage/energy components. The complete mixed command has not been run as a connected original-runtime comparison. It omits card costs, lifecycle, callbacks, presentation and timing by explicit assumption. All targets/build attributes are supplied, not automatically reconstructed. A separate bounded runner now supports a damage/energy prefix followed by one unconditional terminal self-state; see `TERMINAL_STATE_COMMAND.md`. Source IDs are explicit; the base runner does not claim automatic skill-to-command provenance. The JSON CLI is also exposed in the local unpublished Actions workbench; it is not deployed.

## Local workbench

The Actions page accepts both card-action inputs and the separate mixed-command schema. Its damage-plus-ultimate-energy example displays HP, shield and ultimate energy per row; the energy column explicitly distinguishes this from card payment energy. Reversing command order reorders and renumbers the rows in the editable input. The saved trace now includes input JSON, result and verified engine fingerprint. Unsupported commands display per-row blockers with no calculated damage.

The browser loader verifies and imports the same authored modules used offline. Tests exercise the checked module graph and UI behavior through a fake DOM, including reversal, rejected state effects and clearing stale results. No real browser interaction or visual layout QA was performed, respecting the user's computer-use constraint. These checks do not establish gameplay accuracy or deployment readiness.
