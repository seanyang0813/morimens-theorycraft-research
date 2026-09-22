# Developer / agent handoff

## Start here

This repository is an experimental reconstruction of Morimens combat mechanics and a general theorycraft workbench. Mouchette/Arachne is a case study, not the product boundary.

Run the full checkpoint from the repository root:

```powershell
python tools/verify_research.py
```

The verifier needs Python and Node.js. The authored JavaScript tests use Node's built-in test runner and do not require npm installation. To refresh the static workbench after changing an allowlisted engine module:

```powershell
python tools/prepare_local_website.py
python tools/verify_research.py
```

The expected current result is `publicationStatus: NOT_READY`. A nonzero `--check-publication` result is correct until gameplay evidence satisfies the gate. The native replay decoder has now expanded 70 authorized real server replays. The 69 unique batch records contain 31,221 records, 758,800 events, 5,542 complete card-use boundaries and 10,336 hits. All 69 have fail-closed domain routing: 49 are Player-only, 15 contain both Player and Monster hits, five contain no complete hit, and none is pure PvE. They therefore produce no D-Tide budget frontier or cheese conclusion. The index preserves nonobject presentation payloads, empty Lua maps, property changes serialized before `AddNewCard`, and empty property maps introduced by `ChangeCardId`. A strict adapter binds captured properties, states, card arguments, skill routing and a selected Active hit while keeping the observed result separate. With `--decoded-replay`, it routes through Skill, Cmd, MonsterConfig and AwakerConfig rows embedded in that replay. It accepts the replay's one-past-end Lua argument cursor and conservative repeated-hit groups. The retrospective verification audit has 269 deterministic exact checks and 159 chance-dependent branch matches with zero mismatches; all 428 candidates are selected Monster hits from 19 mixed-domain records, while 23 Player-only corpus records contribute zero. One D-Tide case was frozen in commit `1b0a804` before reveal and matched exactly at 21,173 damage in commit `57606c1`. Its recorded engine build is still unknown, so it remains `COMPLETE_BUILD_UNCONFIRMED`. The source-hashed row audit remains a static compatibility measure; runtime and gameplay eligibility are separate.

The product target is one shared engine with a transparent human workbench and a structured agent interface for simulation and bounded sequence search. Read `docs/PRODUCT_DIRECTION.md` before changing the UI or public API.

## Architecture

- `engine/`: strict, immutable JavaScript research components. Unsupported or ambiguous inputs should fail or return an explicit unsupported status rather than silently dropping effects.
- `tests/`: component, integration and website tests. `tests/synthetic/` contains frozen outputs from isolated original-runtime probes; these are not gameplay validation.
- `tools/`: CLIs, fixture builders and original-runtime oracle scripts. Oracle scripts require local ignored client material and are not needed to run the frozen test suite.
- `website/dist/`: dependency-free static research workbench. Authored engine copies are generated from the allowlist in `website/engine-modules.json` and verified byte-for-byte.
- `research/evidence/registry.json`: claim-level evidence index and source hashes.
- `research/evidence/verification-snapshot.json`: latest authoritative gate snapshot.
- `docs/`: mechanic scopes, recovered behavior, known gaps and evidence strength.

## Current integration frontier

The general runners can model resolved Active, Passive, Fixed and Pure hits; HP limits; energy and card payment; bounded multi-hit timelines; selected state lifecycle/property effects; and some imported command shapes. The current command frontier is a damage/energy prefix followed by a contiguous suffix of unconditional `BEAddState` rows. Each suffix row may target the caster or selected damage target, repeated definitions merge in command order, and prefix death prevents the suffix. Prepared skills and the Actions workbench use this runner. See `engine/terminal-state-command.mjs` and `docs/TERMINAL_STATE_COMMAND.md`.

`engine/prepared-snapshot-active-skill.mjs` is the strict catalog-to-property bridge for a catalog-tagged Awakener card. It derives tags, ordinary card context, base value, `ParaPlus` bindings and repeat count from the build-pinned exports, then calls the complete-property sequence runner. Schema 2 additionally executes exactly one following caster `BEGainUltiEnergy` row through the two-build energy path. It stops before that row on lethal damage and rejects monster intents, other mixed commands, nonordinary subtypes, unresolved expression inputs and implicit critical outcomes. See `docs/PREPARED_SNAPSHOT_ACTIVE_SKILL.md`.

Resource 151 is supported by the narrow replay-embedded, complete-live-property Active adapter and four matching agent-CLI operations: snapshot damage, repeated snapshot damage, catalog-prepared snapshot Active damage, and preparation-only skill inspection. The CLI loads the actual resource-151 Skill/BattleApi/Cmd/State exports and rejects every other resource-151 operation. `research/evidence/pc-res151-replay-adapter-compatibility.json` composes the exact six-module byte-equality boundary with five Lua-semantically equivalent config tables. A resource-151 prediction freeze must carry that report plus `pc-res144-to-res151-combat-build.json`. Do not widen this to Wheel, energy, state, card-manager, lifecycle or other general theorycraft paths without a complete dependency audit.

`engine/prepared-state-active-chain.mjs` composes one supported catalog-backed role-state card with an ordered list of prepared Active skills. It requires one explicit recipient/caster identity and shared pre-sequence snapshots, then carries state-derived caster properties and declared layers plus target HP, Block and exposed caster energy. This is the first catalog-backed multi-card state handoff; costs, zones, expiry, callbacks, retargeting and reactive effects remain outside it. See `docs/PREPARED_STATE_ACTIVE_SEQUENCE.md`.

`engine/paid-prepared-state-active-chain.mjs` adds ordinary non-keeper PvE play checks and energy payment before each card in that chain on both pinned PC builds. Rejected and post-lethal cards expose no effects and consume no energy. Distinct card instances and per-card hand/status facts remain explicit; hand mutation, draws, refunds, changing costs and turn gates are unresolved.

`engine/ordered-state-command.mjs` is the next boundary beyond terminal suffixes: it preserves interleaved state-addition, removal, layer-subtraction, ultimate-energy gain, single-parameter Block/Heal and restricted Active/Passive/Fixed/Pure damage order. Later damage expressions can query states created by earlier rows; attacks consume target Block; target Heal changes live HP; and `CmdCaster.ulti_energy` reflects earlier supported energy rows. Active damage consumes supported live state properties; Passive and Fixed rows currently use explicit static target-modifier snapshots. Pure retains `includeStats` metadata without executing statistics. Block and Heal numerical paths have 1,782 exact copied-original component executions; mixed row composition remains authored. Automatic battle-property assembly remains a separate evidence problem because the client battle constructor receives a server-prepared `roleData.properties` vector; see `docs/BATTLE_PROPERTY_INPUT_BOUNDARY.md`. Broader command execution, live energy in mutation expressions, multi-target/repeating Block/Heal effects, encounter phases and reactive event graphs remain incomplete.

## Validation frontier

There are two screenshot-based gameplay records plus 70 privately preserved native replays. One is an exact prediction-before-reveal holdout, but it is not publication-reviewable because the recorded combat build is absent. The next decisive validation work is described in `docs/NEXT_GAMEPLAY_CAPTURE.md`:

1. Reconstruct one controlled high-difficulty action with known build and exact pre-hit state.
2. Save and hash the executable prediction before examining the outcome.
3. Use the first completed case as regression evidence.
4. Freeze a different unseen case as an independent holdout.

Use `tools/freeze_gameplay_prediction.mjs` for manually reconstructed scenarios. For native replays, `tools/freeze_blind_replay_prediction.mjs` selects the first supported deterministic direct hit without using its damage amount, critical result, HP loss or Block loss. It freezes target/caster/skill identity as a disclosed condition, so the holdout tests damage resolution rather than target selection. The tool writes a non-overwritable scenario/evidence/freeze set, and commits must precede `tools/reveal_blind_replay_prediction.mjs`. The reveal tool refuses to inspect the selected result unless all freeze artifacts are committed unchanged at `HEAD`. Both paths verify the current runtime and fail closed on partial or chance-dependent cases.

Do not fit unknown modifiers to an already viewed total. Synthetic original-runtime matches prove component behavior only.

## Publishing boundary

The source may be shared as an explicitly unverified research checkpoint. Do not describe the calculator as accurate or deploy it as a verified build recommender until `python tools/verify_research.py --check-publication` passes and the evidence review confirms the gate. Never commit `research/raw/`, `research/extracted/`, `research/observations/`, generated symbol indexes, copied binaries, keys or private screenshots.
