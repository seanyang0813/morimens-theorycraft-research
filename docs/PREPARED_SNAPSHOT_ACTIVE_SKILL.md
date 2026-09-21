# Catalog-prepared snapshot Active skill

`run-prepared-snapshot-active-skill` connects two existing theorycraft components without asking the caller to copy a damage number between them. It prepares a skill from the build-pinned `Skill` and `BattleApi` exports, imports its selected `Cmd`, evaluates the command parameters from the prepared `ArgN` bindings, derives the recovered repeat count, and runs those hits through the complete-property snapshot sequence.

The bridge is deliberately strict. It accepts a catalog-tagged Awakener damage card with exactly one unconditional `BEActiveDamage` row aimed at `UpperTarget`, ordinary subtype `0`, no `ParaPlus`, one explicitly supplied target, and an explicit critical-roll entry for every derived hit. Damage tags and ordinary card context come from the selected Skill row rather than caller input. The selected catalog `CmdTarget` expression must match the caller's target binding. Monster intents, mixed commands, unsupported subtypes, missing random outcomes, and extra caller fields fail before calculation.

The returned `derivedSequenceInput` makes the handoff auditable: it shows the catalog-derived base value and hit count that reached the property engine. `sourceHashes` bind the preparation to the four loaded exports. The result remains `EXPERIMENTAL` with `finalDamage: null`; costs, card construction, target acquisition, triggers, state changes, callbacks, statistics, retargeting, and death execution are still outside this path.

Run the synthetic component example with:

```text
node tools/run_theorycraft_request.mjs --input research/examples/theorycraft-prepared-snapshot-active-skill.json
```

The example's attack and property maps are controlled test inputs. They are not a reconstructed character build, leaderboard observation, cheese report, or gameplay verification.
