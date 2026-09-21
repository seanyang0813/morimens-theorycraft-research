# Catalog-prepared state-only card

The `prepare-skill-command` theorycraft operation can execute a supported state-only card without accepting caller-authored command rows or catalog state definitions. The host selects the skill and command from the requested resource build, prepares `ArgN`, resolves the skill target against an explicit role registry, imports every command row, and assembles state maximum/property expressions from the hashed `State` export. Live role properties and state runtime identities remain explicit inputs.

`research/examples/theorycraft-prepared-state-card.json` uses exported skill 134203, command 134192 and state 3835. At skill level 1 the catalog prepares `Arg1 = 70`. The command adds 70 layers of temporary critical damage to the selected `PlayerRole`; state 3835 contributes `ChangedLayer` to `crit_damage` and caps at 999,999,999 layers.

The controlled example deliberately gives the recipient `i_crit_damage_per = 50`. The state retains a 70-point contribution, while the recovered positive property-add rule applies `ceil(70 × 1.5) = 105` to the live `crit_damage` property. This distinction matters when the state later ends: retained state contribution and amplified positive storage are separate values. The result exposes the selected catalog rows, definition, expression evaluation, mutation callbacks, live role properties and stored state.

The resource-144 and resource-150 Skill/Cmd/State rows are behavior-identical after excluding ordering metadata. `BattleStateServer` is byte-identical across the two inspected builds, and resource 150 reproduces all 1,806 inherited combat-property mutation fixtures, including `crit_damage` and its positive-add amplification. The whole card execution remains authored component integration rather than a connected original scheduler run.

Run the public resource-144 example with:

```text
node tools/run_theorycraft_request.mjs --input research/examples/theorycraft-prepared-state-card.json
```

This boundary does not yet execute state immunity, pre-creation layer modifiers, per-application or total limits, target generation, cost/payment, callbacks, automatic expiry, or later damage. Those omissions remain in `unresolvedDependencies`; the result is `EXPERIMENTAL` with `finalDamage: null`. It is a theorycraft artifact, not cheese analysis, budget scouting, observed strategy, or independent gameplay validation.
