# Executable observation contracts

The research gate now requires each candidate real observation to include a `prediction` object:

```json
{
  "scenarioFile": "research/observations/example/scenario.json",
  "scenarioSha256": "<SHA-256 of the exact file bytes>",
  "runtimeFingerprint": "<fingerprint from the prepared runtime manifest>",
  "metric": "preHitDamage"
}
```

Supported metrics are preHitDamage and modeledHpLost. Their scopes differ: a displayed pre-hit label must not be compared with an HP decrease as though they were interchangeable. Metric-to-observation correspondence still needs evidence review.

The gate checks the scenario hash, executes the shared engine through tools/replay_observation.mjs, verifies the runtime manifest, and requires the recorded combat build to equal the scenario build. It rejects a reported predictedDamage that differs from the recomputed value, even when reported and observed numbers match. Skipped or unsupported calculations cannot produce eligible predictions. The report retains the model's scope and unresolved dependencies for review.

For a holdout, predictionFrozenBeforeOutcomeEvidence must be an object with path and sha256 pointing to a local JSON freeze record. That record must contain the identical prediction contract, predictedDamage, and beforeOutcomeEvidence identifying independent chronology evidence. Hash equality does not establish chronology: manual review must still prove the prediction existed before outcome inspection. A text assertion or a file without the matching contract is insufficient.

The two existing saved observations remain incomplete and receive no validation credit. Synthetic audit regression tests exercise replay and tamper rejection but are never written into the real-observation collection. Exact replay only makes an observation eligible for evidence review; it cannot authorize publication or establish full mechanic coverage.
