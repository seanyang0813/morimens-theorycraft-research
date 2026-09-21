# Blind native-replay holdout workflow

This workflow separates deterministic prediction from outcome reveal for a newly recovered replay. It does not make a historical replay's engine-code version known.

Replay-embedded resource catalogs can now distinguish pinned resource-144 and resource-150 `Cmd`/`Skill` data when at least one embedded row changed between those catalogs. That attribution strengthens input provenance but does not establish the engine bytecode version or repair chronology: a result calculated after outcomes were decoded remains retrospective.

`tools/freeze_blind_replay_prediction.mjs` scans actions in chronological order and selects the first complete deterministic Active candidate with a complete direct-hit identity boundary. It replaces the recorded hit with an identity-only marker before calculation. Target, caster and skill identity are disclosed conditions of the prediction; target selection itself is not predicted. Recorded damage, critical flag, old HP, Block loss and HP-loss fields are excluded. Target HP and Block come from the card-use boundary. The public evidence contains only the replay container hash, catalog hashes, an identity commitment, scenario inputs and the frozen result; player and replay identifiers remain private.

Run the freeze against private ignored artifacts:

```text
node tools/freeze_blind_replay_prediction.mjs --index research/observations/<private>/index.json --decoded research/observations/<private>/decoded.json --id replay-holdout-001
```

For a fresh controlled replay that is independently tied to the installed
resource-150 session, freeze the build at the same time:

```text
node tools/freeze_blind_replay_prediction.mjs --index research/observations/<private>/index.json --decoded research/observations/<private>/decoded.json --id replay-holdout-001 --recorded-build pc-res150-build51 --build-evidence research/evidence/pc-res144-to-res150-combat-build.json
```

The resource-150 replay adapter is intentionally narrower than the historical
resource-144 adapter. It accepts only complete live property maps with no active
target states. Its offense, utility, critical and final-target calculations are
covered by the installed resource-150 runtime comparisons. Raw pre-constructor
maps and target-state classification fail closed. Supplying the current build
for a historical recording is invalid: the build report identifies installed
code, while same-session recording/retrieval still requires separate provenance
and manual review.

Commit and push the three files under `research/evidence/holdouts/replay-holdout-001/` before revealing. Then run:

```text
node tools/reveal_blind_replay_prediction.mjs --index research/observations/<private>/index.json --freeze research/evidence/holdouts/replay-holdout-001/prediction-freeze.json --observation tests/observations/replay-holdout-001.json
```

The reveal command requires the scenario, pre-outcome evidence and freeze to match files already committed at `HEAD`. It verifies the private replay hash and identity commitment before reading `castDamage`, then writes a sanitized outcome and observation without identifiers.

The resulting observation remains ineligible for the publication gate while `recordedCombatBuild` is unknown. When a build was frozen, reveal carries it into the observation only after the build report, scenario, pre-outcome evidence and freeze are committed unchanged. Git history establishes prediction-before-reveal chronology, but a build report alone does not prove that a historical replay used the installed engine. A current controlled battle still needs independently reviewed same-session provenance.
