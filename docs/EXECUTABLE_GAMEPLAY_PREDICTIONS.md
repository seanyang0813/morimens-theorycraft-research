# Executable observation contracts

The research gate now requires each candidate real observation to include a `prediction` object:

```json
{
  "scenarioFile": "research/observations/example/scenario.json",
  "scenarioSha256": "<SHA-256 of the exact file bytes>",
  "runtimeFingerprint": "<fingerprint from the prepared runtime manifest>",
  "runtimeContract": {
    "schemaVersion": 1,
    "algorithm": "sha256",
    "fullRuntimeFingerprint": "<same prepared-runtime fingerprint>",
    "entryModules": ["<scenario dispatcher and selected adapter>"],
    "files": {"<used engine module>": "<SHA-256>"},
    "fingerprint": "<SHA-256 of this scoped contract>"
  },
  "metric": "preHitDamage"
}
```

Supported metrics are preHitDamage and modeledHpLost. Their scopes differ: a displayed pre-hit label must not be compared with an HP decrease as though they were interchangeable. Metric-to-observation correspondence still needs evidence review. Single-hit experimental scenarios and complete battle-property snapshot scenarios support the applicable pre-hit metric. Completed resolved-hit timelines, Old Embers hit timelines, card-action timelines and ordered-state commands support modeledHpLost. Partial timelines are rejected rather than freezing a misleading prefix total.

The gate checks the scenario hash, executes the shared engine through tools/replay_observation.mjs, verifies the current runtime manifest, and requires the recorded combat build to equal the scenario build. New freezes also pin a scenario-scoped dependency contract. This lets an old prediction remain executable after an unrelated calculator module is added, while any change to the dispatcher or engine modules used by that scenario still rejects replay. Legacy freezes without this contract continue to require the exact whole-runtime fingerprint; they are not silently upgraded. The gate rejects a reported predictedDamage that differs from the recomputed value, even when reported and observed numbers match. Skipped or unsupported calculations cannot produce eligible predictions. The report retains the model's scope and unresolved dependencies for review.

For a holdout, predictionFrozenBeforeOutcomeEvidence must be an object with path and sha256 pointing to a local JSON freeze record. That record must contain the identical prediction contract, predictedDamage, and beforeOutcomeEvidence identifying independent chronology evidence. Hash equality does not establish chronology: manual review must still prove the prediction existed before outcome inspection. A text assertion or a file without the matching contract is insufficient.

Create that record before revealing or inspecting the outcome:

```powershell
node tools/freeze_gameplay_prediction.mjs --scenario research/observations/<case>/scenario.json --metric preHitDamage --evidence research/observations/<case>/pre-hit.png --output research/observations/<case>/prediction-freeze.json
```

The command verifies the prepared runtime, derives and hashes the selected scenario's engine dependency graph, runs the exact scenario, hashes every input, and refuses to overwrite an existing freeze. Its printed `path` and `sha256` become the observation's `predictionFrozenBeforeOutcomeEvidence`. The gate independently checks the freeze, scenario, scoped runtime contract, and every pre-outcome evidence hash. The screenshot or log must actually show the frozen pre-action state; hashes preserve bytes but do not prove chronology or relevance without manual review.

The two existing saved observations remain incomplete and receive no validation credit. Synthetic audit regression tests exercise replay and tamper rejection but are never written into the real-observation collection. Exact replay only makes an observation eligible for evidence review; it cannot authorize publication or establish full mechanic coverage.
