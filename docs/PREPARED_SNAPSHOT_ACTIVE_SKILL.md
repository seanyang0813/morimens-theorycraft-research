# Catalog-prepared snapshot Active skill

`run-prepared-snapshot-active-skill` connects two existing theorycraft components without asking the caller to copy a damage number between them. It prepares a skill from the build-pinned `Skill` and `BattleApi` exports, imports its selected `Cmd`, evaluates the command parameters from the prepared `ArgN` bindings, derives the recovered repeat count, and runs those hits through the complete-property snapshot sequence.

The bridge is deliberately strict. It accepts a catalog-tagged Awakener damage card with exactly one unconditional `BEActiveDamage` row aimed at `UpperTarget`, ordinary subtype `0`, one explicitly supplied target, and an explicit critical-roll entry for every derived hit. Damage tags and ordinary card context come from the selected Skill row rather than caller input. When the selected Skill has `ParaPlus`, the bridge evaluates that catalog expression from the same explicit variable/state-query environment, creates `ParaPlusN` bindings, and sends the resolved fourth Active parameter through `skillArgsPlus` on every hit. The selected catalog `CmdTarget` expression must match the caller's target binding. Monster intents, mixed commands, unsupported subtypes, missing expression inputs, missing random outcomes, and extra caller fields fail before calculation.

The returned `derivedSequenceInput` makes the handoff auditable: it shows the catalog-derived base value, `skillArgsPlus`, and hit count that reached the property engine. `paraPlus` preserves the selected field, expression reads, function calls and generated bindings. `sourceHashes` bind the preparation to the four loaded exports. The result remains `EXPERIMENTAL` with `finalDamage: null`; costs, card construction, target acquisition, triggers, state changes, callbacks, statistics, retargeting, and death execution are still outside this path.

Schema 2 accepts the common two-row command shape `BEActiveDamage → BEGainUltiEnergy`. It evaluates both rows from the same prepared bindings, finishes the complete-property damage repetitions, then executes the ordinary energy calculation and capped self-storage. If damage reaches zero HP, execution stops before the energy row because death handling may change the remaining command lifecycle. Energy properties, starting/cap state and caster eligibility remain explicit inputs. The original-runtime-matched `CardTypeMatch` rule derives the outside-bonus decision from the selected catalog card types against the exact Skill/Defend/Extend/Strike group. Catalog skill tags and `skillConfigId` are also derived rather than supplied.

Run the synthetic component example with:

```text
node tools/run_theorycraft_request.mjs --input research/examples/theorycraft-prepared-snapshot-active-skill.json
```

The damage-plus-energy example is:

```text
node tools/run_theorycraft_request.mjs --input research/examples/theorycraft-prepared-snapshot-active-energy-skill.json
```

The example's attack and property maps are controlled test inputs. They are not a reconstructed character build, leaderboard observation, cheese report, or gameplay verification.
