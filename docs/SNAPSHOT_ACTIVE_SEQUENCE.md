# Complete-property Active hit sequence

`engine/snapshot-active-sequence.mjs` composes repeated schema-2 property-snapshot calculations over one target. It is a theorycraft operation named `run-snapshot-active-sequence` in `engine/theorycraft-api.mjs`.

The caller supplies complete caster, player and initial target property maps plus one explicit record per hit. Each hit supplies its base value, tags, card properties and context, critical roll or deterministic null, target context and Ordinary/Puncture subtype. The runner calls the same bounded `calculateSnapshotActiveDamage` path for every hit.

Only two recovered mutations carry forward automatically:

- target `hp` becomes the preceding hit's modeled HP result;
- target `block` becomes the preceding hit's shield result.

This makes later block-sensitive damage respond to shield depletion. The runner validates all hits before execution, including a suffix that would be skipped after lethal damage, and requires unique hit IDs. It stops before the first hit whose target is already at zero HP.

The sequence requires `interveningEffects: "assumed-absent"`. The target battle tag and state-ID set must remain constant across hits. State layers, property callbacks, triggered effects, damage statistics, death execution and `be_damage_statics` updates are not simulated. Each child result and the sequence result keep `finalDamage: null`.

Run the checked example through the shared agent API:

```text
node tools/run_theorycraft_request.mjs --input research/examples/snapshot-active-sequence-request.json
```

The example is synthetic component input. It is not a character build, observed strategy, cheese claim or gameplay validation.

The observation dispatcher and prediction freezer accept a completed sequence's `modeledHpLost` metric. A real use still requires separate pre-outcome evidence, recognized recorded-build evidence and the existing commit-before-reveal chronology. This support does not grant verification credit to the synthetic example.
