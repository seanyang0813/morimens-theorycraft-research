# Catalog-prepared snapshot Active skill

`run-prepared-snapshot-active-skill` connects two existing theorycraft components without asking the caller to copy a damage number between them. It prepares a skill from the build-pinned `Skill` and `BattleApi` exports, imports its selected `Cmd`, evaluates the command parameters from the prepared `ArgN` bindings, derives the recovered repeat count, and runs those hits through the complete-property snapshot sequence.

The bridge is deliberately strict. It accepts a catalog-tagged Awakener damage card with exactly one unconditional `BEActiveDamage` row aimed at `UpperTarget`, ordinary subtype `0`, one explicitly supplied target, and an explicit critical-roll entry for every derived hit. Damage tags and ordinary card context come from the selected Skill row rather than caller input. When the selected Skill has `ParaPlus`, the bridge evaluates that catalog expression from the same explicit variable/state-query environment, creates `ParaPlusN` bindings, and sends the resolved fourth Active parameter through `skillArgsPlus` on every hit. The selected catalog `CmdTarget` expression must match the caller's target binding. Monster intents, mixed commands, unsupported subtypes, missing expression inputs, missing random outcomes, and extra caller fields fail before calculation.

The returned `derivedSequenceInput` makes the handoff auditable: it shows the catalog-derived base value, `skillArgsPlus`, and hit count that reached the property engine. `paraPlus` preserves the selected field, expression reads, function calls and generated bindings. `sourceHashes` bind the preparation to the four loaded exports. The result remains `EXPERIMENTAL` with `finalDamage: null`; costs, card construction, target acquisition, triggers, state changes, callbacks, statistics, retargeting, and death execution are still outside this path.

Schema 2 accepts the common two-row command shape `BEActiveDamage → BEGainUltiEnergy`. It evaluates both rows from the same prepared bindings, finishes the complete-property damage repetitions, then executes the ordinary energy calculation and capped self-storage. If damage reaches zero HP, execution stops before the energy row because death handling may change the remaining command lifecycle. Energy properties and starting/cap state remain explicit inputs. The bridge requires a self-target Awakener and therefore derives caster eligibility. The original-runtime-matched `CardTypeMatch` rule derives the outside-bonus decision from the selected catalog card types against the exact Skill/Defend/Extend/Strike group. Catalog skill tags and `skillConfigId` are also derived rather than supplied.

Schema 3 accepts two or more selected-target `BEActiveDamage` rows followed by one unconditional caster `BEGainUltiEnergy` row. It resolves the catalog's `FrontEnemy` target from an explicit role snapshot using the recovered lock, taunt, eligibility and position rules. Each row condition is evaluated in order. A condition updates `LastConditionRet`, exposed to the next condition as numeric zero or one; unconditional rows leave it unchanged. `CmdCaster.GetPotencyLevel()` comes from the preparation progression input, while declared state queries remain explicit. Only rows whose conditions pass consume critical-roll entries. Each executed row derives its own repeat count, ordinary/Puncture subtype and `ParaPlus`, and all resulting hits share the sequential HP/Block state before the energy row. The repetition additions come directly from `damagetimes_plus` and `damagetimes_per` in the complete caster property snapshot, using the original getter's zero default when absent; schema 3 rejects a separate caller-authored repeat-modifier object.

The resource-144 and resource-150 catalogs both exercise this path in tests. Skill 4165 / command 393 performs one ordinary hit, optionally a second when caster state 55487 is present, then gains energy. Skill 4203 / command 1363 uses a potency/state condition and `LastConditionRet` fallback: its first branch produces four Puncture hits, while the fallback produces one ordinary hit, then both branches gain energy. Forty-eight original `FuncTable` executions cover the three exported conditions and their short-circuit call order. The composed command path remains component evidence: later rows retain the selected target, state does not mutate between these damage rows, and post-death retargeting or command continuation is unresolved.

Run the synthetic component example with:

```text
node tools/run_theorycraft_request.mjs --input research/examples/theorycraft-prepared-snapshot-active-skill.json
```

The damage-plus-energy example is:

```text
node tools/run_theorycraft_request.mjs --input research/examples/theorycraft-prepared-snapshot-active-energy-skill.json
```

The conditional multi-row and Puncture example is:

```text
node tools/run_theorycraft_request.mjs --input research/examples/theorycraft-prepared-conditional-active-energy-skill.json
```

The example's attack and property maps are controlled test inputs. They are not a reconstructed character build, leaderboard observation, cheese report, or gameplay verification.
