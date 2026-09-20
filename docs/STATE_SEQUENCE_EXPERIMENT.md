# Buff-to-attack sequence experiment

Run a local JSON sequence:

```
node tools/prepare_state_sequence_example.mjs
node tools/run_state_sequence.mjs research/examples/state-sequence.json
```

This general component composition accepts state additions, explicit removals and Active command
rows within one turn. The state manager constructs or merges instances; property
expressions evaluate against live Layer/ChangedLayer values; stored property
changes bind to later damage calculations. HP and shield carry between attacks.
The output includes expression reads, constructor/manager/merge traces, property
mutation callbacks, modeled hits and retained state contributions. Final verified
damage remains null and the status is EXPERIMENTAL.

The current bindings are actor basic_damage_per and target be_damage_per,
be_damage_per2, be_damage_per3 and vulnerable_per. Static damage inputs must omit
these fields so there is one authoritative live value. Other damage modifiers,
crit decisions, external state queries and build attributes remain explicit.
Each state-query function accepts either a numeric state-ID map for static inputs
or an explicit owner binding such as
`"CmdCaster.GetStateLayer": {"liveOwner":"actor"}`. Live bindings read the current
simulated registry when a state expression executes. Missing states return zero;
the first matching non-deleted state supplies its stored layer count. Actor/target
binding is explicit rather than inferred from function names. A live binding cannot
also contain static values. These bindings apply to state expressions and Active
command row conditions/parameters. Conditions read the registry when reached;
Active parameters query it at initial binding and again for each executed hit.
The command trace records each query and returned value. This does not introduce
between-hit trigger execution; listener effects are still assumed absent.
Unknown functions/queries, duplicate property definitions,
unsupported properties and turn-boundary operations fail explicitly.

The example copies Psychic Trauma state 80331's MaxLayer and ExistProperty
expressions from the extracted PC export. A separate provenance file hashes that
export. Everything else is explicitly synthetic: base attack 100, 10000 target HP,
neutral modifiers and no caster state 133235. The demonstrated hits are 100, 130,
145 and 145 as repeated ten-layer requests reach the fifteen-layer cap. Reordering
the first attack and buff changes the first hit from 100 to 130. This demonstrates
model behavior, not a character build or an independently observed game result.

A separate synthetic integration test uses a marker state to raise a second
state's cap through a live query, changing a later hit from 115 to 133. Marker
definitions can explicitly contain no property changes. The lookup itself has
24 connected original BattleCmdTargetsExp.GetStateLayer / manager GetState cases;
the complete two-state interaction remains authored composition evidence.

The `addState` operation takes already-resolved manager requests and bypasses
immunity, pre-creation stack multipliers and per-application/total limit calculations.
The `applyState` operation instead takes `definitionId` and a `request` object
containing `layer` (numeric or null for the original default), `immune`, `context`,
`modifiers`, `dimensionStateIds`, `perLimit` and `totalLimit`. Context and every
modifier family must be explicit as specified in STATE_LAYER_PIPELINE.md. Limit
fields accept supplied numeric callback results, null when the callback is absent,
or explicit rule arrays wrapped as `{"rules":[...]}`. Statistics rules require
stateIds/limit/used; total rules require stateIds/limit and read the live registry.
Property mapping and statistics accumulation are not derived; see STATE_LAYER_LIMITS.md.
Dimension-list matches require an explicit
`dimensionContext` with `hasCasterUid`, `hasRole`, `friendly`, `hasPlayer` and
`percent`; see DIMENSION_FINAL_VALUE.md. Missing context or the original
missing-player failure stops calculation rather than assuming neutrality. The request trace captures
initial ceiling, immunity, modifier arithmetic and limit callback ordering before
manager creation. The input immunity decision and modifier mappings are supplied,
not reconstructed from complete battle state.

Integration checks cover fractional requested layers, amplification, limit-result
overwrites, immune rejection and zero-limit rejection. A targeted original-runtime
probe in `research/evidence/state-sequence-rounding-probe.json` confirms that the
synthetic base-100 / be_damage_per2=9 case rounds to 110, matching the composed
model's floating-point target formula rather than idealized decimal arithmetic.

The current composition explicitly assumes other event
listeners absent, does not cross a turn boundary, and emits StateOnAdd trace items
without executing listeners. Psychic Trauma's original expiry conditions are not
removed from the game data; they simply do not execute in this within-turn scope.
No team/card routing, source tracking, trigger commands, expiry or automatic
buff/debuff-dependent damage eligibility is inferred. Death stops the sequence.

Component arithmetic has original-runtime evidence, but this complete sequence is
an authored integration test. There is no connected original full-battle oracle
or independent gameplay validation. The local website's Buff sequences page
(`website/dist/states.html`) runs the same engine through the checked-byte loader.
Its example, input editor, first-two-step swap, mutation table and full trace are
tested with a DOM adapter. Browser-runtime loading agrees with the CLI (520 total
modeled HP loss for the example, 550 after swapping the opening two steps). No
actual browser visual/interaction review has been performed. The trace includes
input and runtime fingerprint but does not archive a replayable runtime bundle.
It is the integration foundation for broader state/card sequencing, not
the final feature scope of the theorycraft tool.

The visual step list supports moving any step earlier/later, duplication, removal
and one-level undo. Edits update the same JSON input and rerun the engine. The list
retains unexecuted steps after a simulation stop, while the result table contains
only executed steps. Controls reject stale input if the JSON has been edited
since rendering, preventing an old row button from moving the wrong operation.
These controls have DOM-adapter tests; actual browser layout and interaction QA
remain pending.

An explicit removal step is `{"type":"removeState","definitionId":80331}`.
It marks the live instance deleted before subtracting its retained property
contributions, emits a StateLifeEnd trace without executing listeners, and leaves
the deleted instance in the registry for separate cleanup. Repeating removal is
inert. Reapplication creates a new instance; live queries skip the deleted one.
Removal does not guess a turn boundary or execute automatic expiry/dispel rules.
The property-removal chain has 432 connected original LifeEnd/RemoveProperty/
recipient-routing/property-storage cases, including repeated removal. The full
buff/attack/removal sequence remains authored composition evidence.

### Explicit immunity rules

`applyState.request.immune` accepts either a supplied boolean or `{buffType, properties, specificRules}`. `buffType` is `none`, `buff`, or `debuff`; `properties` must contain numeric `immue_buff`, `immue_debuff`, and `immue_both_buff`. Each specific rule contains `property`, `stateIds`, and numeric `value`. The state ID comes from the referenced definition. See [state immunity](STATE_IMMUNITY.md) for the original-runtime evidence and boundaries. Positive requests expose `immunityCalculation` with the decision and read order; nonpositive requests skip it. This adds rule execution, not automatic property derivation from equipment or builds.

### Actor critical-damage state

The live actor-property boundary now includes `crit_damage`, bound to the active-damage input `awakerCritDamage`. Its positive mutation requires an explicit `i_crit_damage_per` actor property; this value is passed through the recovered combat-property mutation rule instead of assuming zero. Static `awakerCritDamage` in `attackBase.targetModifiers` is rejected when the live binding is active.

Actual exported state 2669 can therefore be used as a definition with `MaxLayer = 999999999` and `ExistProperty.crit_damage = ChangedLayer`. A regression sequence verifies neutral critical damage, a 10-layer application with 50% positive-add amplification, and explicit removal. The three modeled critical hits are 100, 115, and 105. The final five-point remainder is intentional within the recovered component composition: positive property addition is amplified to 15, while removal reverses the state’s retained contribution of 10 and negative mutation bypasses positive-add amplification. The trace exposes the +15 and -10 callback payloads.

This is not a claim that a real build has 50% `i_crit_damage_per`, nor gameplay validation of state 2669. The state export, state contribution behavior, property mutation behavior, and damage formula have separate source/runtime evidence; their sequence here is an authored integration check. Trigger listeners and automatic build-property assembly remain absent.
