# Blind native-replay holdout workflow

This workflow separates deterministic prediction from outcome reveal for a newly recovered replay. It does not make a historical replay's engine-code version known.

Replay-embedded resource catalogs can now distinguish pinned resource-144 and resource-150 `Cmd`/`Skill` data when at least one embedded row changed between those catalogs. That attribution strengthens input provenance but does not establish the engine bytecode version or repair chronology: a result calculated after outcomes were decoded remains retrospective.

`tools/freeze_blind_replay_prediction.mjs` scans actions and every complete direct-hit boundary within each action in chronological order, selecting the first deterministic Active candidate. A chance-dependent or otherwise unsupported earlier hit is recorded as a blocker and does not hide a later eligible boundary in the same action. The freezer replaces the candidate hit with an identity-only marker before calculation. Target, caster and skill identity are disclosed conditions of the prediction; target selection itself is not predicted. Recorded damage, critical flag, old HP, Block loss and HP-loss fields are excluded. Target HP and Block come from the card-use boundary. The public evidence contains only the replay container hash, catalog hashes, an identity commitment, scenario inputs and the frozen result; player and replay identifiers remain private.

Run the freeze against private ignored artifacts:

```text
node tools/freeze_blind_replay_prediction.mjs --index research/observations/<private>/index.json --decoded research/observations/<private>/decoded.json --id replay-holdout-001
```

For a fresh controlled replay that is independently tied to the installed
resource-150 session, freeze the build at the same time:

```text
node tools/freeze_blind_replay_prediction.mjs --index research/observations/<private>/index.json --decoded research/observations/<private>/decoded.json --id replay-holdout-001 --recorded-build pc-res150-build51 --build-evidence research/evidence/pc-res144-to-res150-combat-build.json --capture-evidence research/evidence/<reviewed-session-capture>.json
```

For resource 151, the freeze requires both installed-build identity and the
exact bounded adapter carry-forward:

```text
node tools/freeze_blind_replay_prediction.mjs --index research/observations/<private>/index.json --decoded research/observations/<private>/decoded.json --id replay-holdout-001 --recorded-build pc-res151-build51 --build-evidence research/evidence/pc-res144-to-res151-combat-build.json --build-evidence research/evidence/pc-res151-replay-adapter-compatibility.json --capture-evidence research/evidence/<reviewed-session-capture>.json
```

Resource-151 support is limited to the same complete live-property ordinary
Active adapter. Six required client modules are byte-identical to resource 150,
and Skill, Cmd, State, BattleApi and Constant have no Lua-semantic gameplay
changes. This carry-forward does not enable other simulator operations.

For resource 150 or 151, the freezer now requires a reviewed
`MORIMENS_REPLAY_SESSION_CAPTURE_EVIDENCE` whose exact container hash, PvE
domain, recorded build, private baseline/delta/attestation commitments and all
six same-session checks match the decoded replay. It adds that artifact as a
second pre-outcome evidence file. Reveal verifies that every frozen evidence
file is committed unchanged at `HEAD`; a build report alone cannot create a
current-build holdout.

The resource-150 replay adapter is intentionally narrower than the historical
resource-144 adapter. It accepts only complete live property maps. Target-state
classification comes from all 6,959 installed resource-150 State rows, while
the relevant Constant and BattleApi mappings match the baseline exactly. Its
offense, utility, critical and final-target calculations are covered by the
installed resource-150 runtime comparisons. Raw pre-constructor maps fail
closed. Supplying the current build
for a historical recording is invalid: the build report identifies installed
code, while same-session recording/retrieval still requires separate provenance
and manual review.

Commit and push the three files under `research/evidence/holdouts/replay-holdout-001/` before revealing. Then run:

```text
node tools/reveal_blind_replay_prediction.mjs --index research/observations/<private>/index.json --freeze research/evidence/holdouts/replay-holdout-001/prediction-freeze.json --observation tests/observations/replay-holdout-001.json
```

The reveal command requires the scenario, pre-outcome evidence and freeze to match files already committed at `HEAD`. It verifies the private replay hash and identity commitment before reading `castDamage`, then writes a sanitized outcome and observation without identifiers.

The resulting observation remains ineligible for the publication gate while `recordedCombatBuild` is unknown. When a build was frozen, reveal carries it into the observation only after the build report, scenario, pre-outcome evidence and freeze are committed unchanged. Git history establishes prediction-before-reveal chronology, but a build report alone does not prove that a historical replay used the installed engine. A current controlled battle still needs independently reviewed same-session provenance.

For a future controlled battle, `tools/commit_replay_session_baseline.py` verifies the live installation against the recognized combat-build report and publishes only a hash commitment to an ignored private pre-battle reference inventory. The commitment is not recorded-build evidence on its own. Later review must prove the same process and executable, a newly appearing replay reference, a post-baseline object timestamp, PvE domain, and prediction-before-reveal chronology.

After the private delta is captured, `tools/build_replay_session_capture_evidence.py` can bind those mechanical checks into a public candidate without publishing identifiers. The candidate remains ineligible until the user explicitly confirms that the new record is the controlled PvE battle and that the loaded record is the same battle. Store that confirmation as an ignored private attestation and run `tools/review_replay_session_capture.py`; only its reviewed output may be included in the frozen build evidence. This verification artifact establishes provenance only. It cannot be reused as a cheese, budget-scouting or theorycraft conclusion.

Sparse live property maps use the original `GetProperty` zero default. Replay
indexing therefore reconstructs an omitted post-hit `block` key as zero while
still rejecting a present nonnumeric value. Candidate selection also requires
recorded `damageType == 1`; a later Fixed or other secondary hit sharing the
same caster and skill identity cannot be misclassified as ordinary Active
damage. `UpperTarget` may use the recorded hit identity when selection-command
transport is absent, because the prediction explicitly conditions on target
identity and does not claim to predict target selection.

## Mouchette deterministic holdout recipe

`research/evidence/mouchette-holdout-readiness.json` records an identifier-free
planning audit over 102 already decoded PvE replays. It finds 69 deterministic
Mouchette ordinary-Active hits with zero mismatches. The set includes 17 Mortal
Blast, 24 Shining Tornado, 27 Dramatic Encounter and one Strike hit; every
captured critical-chance ceiling is at least 100. Because the archive was
decoded before calculation and its recorded engine builds are unknown, these
matches are retrospective and receive no holdout or publication credit.

The next controlled run should commit the live-session replay baseline before
battle, capture Mouchette with a calculated critical-chance ceiling of at least
100, and play Mortal Blast or Shining Tornado. Freeze the first complete
deterministic ordinary-Active candidate before revealing damage, with the
resource-151 build identity and bounded adapter compatibility evidence included.
The live snapshot must establish the critical-chance condition; the archive does
not prove that any current account or battle has it. This recipe belongs only to
the verification track and makes no theorycraft, cheese or budget-build claim.
