# Preparing actual skill command inputs

`engine/prepare-skill-command.mjs` connects scalar skill-field routing, coefficient-list selection, growth expressions, parameter evaluation and argument normalization. The result contains a selected command ID, ArgN bindings and the full selection/arithmetic trace. It does not execute the command or construct a complete build.

Run `node tools/prepare_skill_command.mjs research/examples/prepare-skill-command-request.json` for a diagnostic using actual exported skill 4163. The request explicitly supplies skill level 6, internal breakthrough/potency 0/3 and BattleAtkForce 258. The export selects command 57564, original coefficients 0.1/5, growth values 0.2/10, raw parameters 51.6/10 and final arguments 52/10. This is controlled-input preparation, not a claim that a particular character/build has those properties.

The CLI reads local Skill, BattleApi and Cmd exports and includes each export's SHA-256. Requests require skillId, skillLevel, isAwaker, breakSkillLevel, potencyLevel, overrides, variables, conditionResults and stateQueries. Missing runtime conditions or state-query values fail explicitly. State queries bind named single-integer-argument functions to supplied numeric values; no absent-state default is invented. The engine API accepts explicit callbacks instead of these JSON maps.

Output reports command effect types and row count, with executable=false. In the example the command includes BEActiveDamage, BEGainUltiEnergy and BEAddState; it is unsafe to silently retain only its damage row. That exact shape can now execute only through the explicit terminal-state experiment, which requires the selected state definition, layer request and live property snapshots. Automatic character-to-skill lookup, equipment and state assembly, dynamic refresh timing and general handler support remain unfinished.

The underlying selectors and numeric argument components have original-runtime evidence at documented boundaries. Their entire combination on actual skill exports has composition tests, not a connected original end-to-end execution or independent gameplay validation. List-form parameter expressions, original missing-coefficient defaulting and other unsupported input forms remain explicit errors.

## Whole-command compatibility inspection

The preparation CLI now includes `commandSupport`, a row-by-row report from `engine/inspect-command-support.mjs`. It retains every row and identifies unsupported handlers, target bindings, fields, and expression syntax. Unknown condition functions are not evaluated or silently treated as false. Even structurally compatible input remains `executable: false`: runtime parameter restrictions, numeric inputs, lifecycle, ordering, costs, and listeners still require resolution.

`node tools/inspect_command_support.mjs` audits all 7,539 exported commands and writes the source-fingerprinted `research/evidence/command-support-audit.json`. The importer now retains `BaseSortID` separately and preserves contiguous one-based row order. Original `GenerateEffectList` probes confirm row-index order despite conflicting sort IDs. The resulting strict static profile accepts 48 commands structurally; this is not execution or gameplay coverage. Other independent gaps remain visible despite that common blocker, led by 8,651 `BEAddState` rows. Missing condition-function bindings also count as expression blockers in this no-context audit; they are not proof that the original expression is invalid.

This is an authored compatibility diagnostic, not original-runtime or gameplay evidence. It gives humans and agents explicit integration work rather than a partial damage-only result for a mixed command.

`engine/import-command-rows.mjs` outputs normalized rows plus retained metadata. Sparse lists and malformed identities fail rather than changing Lua `ipairs` semantics. All other fields, including VFX and timing, remain in the rows and retain their compatibility blockers. The original row-order probe also verifies the skip-phase delay override against absent, empty, and nonempty `NotAwakerCardPerform`; timing is not yet integrated into execution.

## Connected experimental execution

`runPreparedSkillExperiment` now connects preparation, selected target-field resolution, full command import, compatibility checks, ArgN binding, and the active-command experiment. The CLI accepts an optional second JSON path:

```
node tools/prepare_skill_command.mjs research/examples/prepared-active-skill-request.json research/examples/prepared-active-skill-context.json
```

This example uses actual exported skill 4100 and command 743 with deliberately synthetic attack 100, target HP 1000, and neutral modifiers. Its parameters become 120/1 and the modeled HP loss is 120. These values are a component-composition demonstration, not a reconstructed build or gameplay observation.

The selected `CmdTarget` expression must be explicitly bound to the supplied single UpperTarget. Caller ArgN overrides are rejected; command arguments come from skill preparation. Unsupported rows yield `UNSUPPORTED_COMMAND`, a complete compatibility report, and no calculation. Runtime expression/subtype errors remain errors. No rows are filtered out.

Costs, lifecycle, animation timing, state/trigger effects and automatic target resolution remain absent by explicit assumption. Arguments are frozen at preparation, and full original skill execution has not been matched end-to-end. The result retains `finalDamage: null`; calculated experimental HP loss and its trace are nested under `calculation`. The website has not yet incorporated this offline entry point.

## Selected skill to mixed damage/energy command

The same preparation entry point now accepts an experiment of kind `morimens-damage-energy-command`, without a caller-supplied command or ArgN values. It selects the corresponding support profile, imports the selected command, binds computed arguments and runs both damage and energy. The supplied energy source skillConfigId must match the selected exported skill ID. Unsupported rows still stop the entire command before damage.

The preparation entry point also accepts `morimens-terminal-state-command`. The actual potency-selected Skill4163 / Cmd57564 path now prepares its arguments, executes the Active damage and ultimate-energy rows, and then applies State2669 through the state-sequence engine. The current boundary is deliberately narrow: the state must be the final row, unconditional, caster-owned and fully supplied, and no later row may observe it.

The preparation entry point also accepts `morimens-role-state-command` for
setup-only skills. The first real case is skill 60397: an explicit
`CmdCaster.atk` of 1000 resolves and rounds `Arg1` to 80, selects exported command
60401, and executes all four supported state/presentation rows against the bound
role registry. The command rows and `Arg1` cannot be replaced by the caller.
State definitions and initial role properties remain explicit execution inputs;
automatic monster/build assembly and original full-scheduler validation remain
unfinished.

```
node tools/prepare_skill_command.mjs research/examples/prepared-damage-energy-request.json research/examples/prepared-damage-energy-context.json
```

The example uses exported skill 4046 at skill level 6, internal progression 0/0 and deliberately synthetic attack 100. Its prepared arguments are 20/10 and command 2112 performs both rows: target HP 1000 becomes 980; caster energy 95 becomes 100 under a 100 maximum. Card presence, matching, Strike tag and neutral modifier properties are explicitly supplied in context. These are controlled example inputs, not a realistic reconstructed level/build claim. CLI output includes Skill/BattleApi/Cmd export hashes.

The scope is selected command execution under absent-lifecycle assumptions, not the entire skill lifecycle: skill ExistState, costs, passive/trigger effects, target acquisition and automatic type/property assembly remain unfinished. Mixed command rows currently have no expression-function adapter; state queries may still be supplied to skill-argument preparation. Arguments are frozen after preparation. The website does not yet expose this entry point.

## Shared agent API

The versioned theorycraft API exposes the same bridge as operation `prepare-skill-command`. Its input is a `morimens-prepared-skill-request` containing the exact serializable preparation maps above and either `execution: null` or an exact execution context. The local API host loads and hashes the Skill, BattleApi and Cmd exports; callers cannot replace command rows inside the request.

Run the preparation-only example with:

```
node tools/run_theorycraft_request.mjs --input research/examples/theorycraft-prepare-skill-request.json
```

Preparation-only output has status `PREPARED`, `finalDamage: null`, selected arguments, every top-level command effect type, the full compatibility report and unresolved dependencies. An execution request returns `EXPERIMENTAL` only when the whole selected command fits one of the existing narrow execution profiles. Unsupported effects are reported and prevent partial execution.
