# Blind native-replay holdout workflow

This workflow separates deterministic prediction from outcome reveal for a newly recovered replay. It does not make a historical replay's engine-code version known.

`tools/freeze_blind_replay_prediction.mjs` scans actions in chronological order and selects the first complete candidate that has one living enemy, a complete first pre-hit boundary and a deterministic Active calculation. It replaces the recorded hit with an identity-only marker before calculation. Recorded damage, critical flag, old HP, Block loss and HP-loss fields are excluded. Target HP and Block come from the card-use boundary. The public evidence contains only the replay container hash, catalog hashes, an identity commitment, scenario inputs and the frozen result; player and replay identifiers remain private.

Run the freeze against private ignored artifacts:

```text
node tools/freeze_blind_replay_prediction.mjs --index research/observations/<private>/index.json --decoded research/observations/<private>/decoded.json --id replay-holdout-001
```

Commit and push the three files under `research/evidence/holdouts/replay-holdout-001/` before revealing. Then run:

```text
node tools/reveal_blind_replay_prediction.mjs --index research/observations/<private>/index.json --freeze research/evidence/holdouts/replay-holdout-001/prediction-freeze.json --observation tests/observations/replay-holdout-001.json
```

The reveal command requires the scenario, pre-outcome evidence and freeze to match files already committed at `HEAD`. It verifies the private replay hash and identity commitment before reading `castDamage`, then writes a sanitized outcome and observation without identifiers.

The resulting observation remains ineligible for the publication gate while `recordedCombatBuild` is unknown. Git history establishes prediction-before-reveal chronology, but it does not prove historical engine compatibility. A current controlled battle with independently recorded build provenance or a recovered replay engine fingerprint is still required.
