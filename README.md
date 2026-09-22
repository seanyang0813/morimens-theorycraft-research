# Morimens damage research

Status: research prototype. The general calculator, sequence workbenches and evidence browser run locally, but there is no verified end-to-end gameplay prediction and the accuracy publication gate is **NOT_READY**.

This repository is a source checkpoint for collaboration. It does not claim that the calculator is accurate enough for build recommendations. Generated symbol indexes, copied client files, extraction outputs, local observations, private screenshots and keys are intentionally excluded.

For a quick shareable overview, read [`FRIEND_PREVIEW.md`](FRIEND_PREVIEW.md). An agent or developer continuing the work should start with [`DEVELOPER_HANDOFF.md`](DEVELOPER_HANDOFF.md).

The intended product is described in [`docs/PRODUCT_DIRECTION.md`](docs/PRODUCT_DIRECTION.md): one auditable engine serving both a human sequence/build calculator and an agent-facing simulation/search API.

## Current checkpoint

The reproducible checkpoint is `research/evidence/verification-snapshot.json`, which records the latest full-suite result and test-file count. Two screenshot-based gameplay observation records remain incomplete. Seventy privately preserved native replay containers now decode successfully. The 69 unique batch records index 31,221 records, 758,800 events, 5,542 card uses and 10,336 hits. A complete fail-closed domain audit classifies 49 records as Player-only and 20 as mixed or unresolved; none is pure PvE. The mixed group contains 15 records with both Monster and Player hit targets and five with no complete hit. This archive therefore produces no D-Tide budget frontier and no cheese conclusion. The strict retrospective verification corpus contains 428 identity-bound Active-hit candidates: all come from selected Monster hits inside 19 mixed-domain records, while its 23 Player-only records contribute zero candidates. Of these, 269 deterministic calculations match exactly with zero mismatches, and all 159 chance-dependent cases match one independently evaluated critical/noncritical branch. This is narrow component consistency evidence; it does not reclassify the source records as PvE. Embedded `Cmd`/`Skill` rows attribute the corpus's 35 replays to the resource-144 catalog, three to resource 150 and four to unmatched/intermediate catalogs. A direct resource-150 recalculation audit covers the three resource-150-catalog replays: 79 complete hit snapshots yield thirteen retrospective chance-branch matches with zero mismatches. Their engine-code versions and random draws remain unknown, so this is `RETROSPECTIVE_CURRENT_CATALOG_ENGINE_VERSION_UNCONFIRMED` and receives no holdout or publication credit. A D-Tide prediction was frozen and pushed before reveal, then matched exactly at 21,173 damage. Its recorded engine-code version remains absent, so it is `COMPLETE_BUILD_UNCONFIRMED` and does not pass the publication gate. The separate Old Embers 3x source-statistics regression also remains retrospective and build-unconfirmed. Synthetic runtime comparisons and retrospective catalog attribution do not count as blind gameplay validation. See `docs/REPLAY_BUILD_ATTRIBUTION.md`, `docs/CURRENT_CATALOG_GAMEPLAY_CONSISTENCY.md`, `research/evidence/replay-budget-domain-routing.json` and `research/evidence/replay-regression-domain-routing.json`.

The live PC download has advanced to resource 150 / build 51. Its actual runtime matches resource 144 on 2,262 utility fixtures, 879 ordinary PvE offensive-assembly fixtures, 2,097 no-card target/critical fixtures, 506 card and Strike/Ulti-tag target fixtures, 40 selected property cases, 18 BeHit-through-HP cases, 16 Active routing cases, 24 narrow command-entry cases, 8 event-effect request cases, 4 connected request-to-listener cases, 5 connected HP-listener cases, 4 connected HP-state request cases, 4 connected generated-phase cases, 4 connected high-difficulty phase-command row cases, 7 effect-order orchestration cases, 6 use-card dispatch cases, 222 direct/connected energy-payment cases, 516 ultimate-energy calculation/effect/storage cases, 90 ordinary PvE card-eligibility cases, 8 ordinary card effect-chain cases, 6 connected before-use cases, 8 after-use lifecycle cases, 14 selected replay-frame/queue cases, 8 selected death/respawn cases and 257 selected skill-phase/effect command cases. Eleven selected scheduler/event/trigger/fatal-damage modules are byte-identical across the builds. `BERoleDie` and `BattleUnitMonster` changed, with player/monster respawn eligibility moved into role methods; their selected resource-150 behavior matches all eight inherited death fixtures. Event requests now reach real registered listeners, and RoleHpChanged reaches cached state-trigger request construction and executes the generated target/phase bodies through TriggerCmd with signed HP delta and caster association preserved. Both high-difficulty phase-command catalogs match the installed build, and its compiled condition/parameter closures match the authored phase transition model over 450 boundary cases. Original remove-state and monster-skill-change bodies now cover another 48 transition cases, with byte-identical installed modules. The changed `MonsterBehaviorComp` separately matches all 20 inherited intent-change cases: phase parameter `1` means Insert, so it queues an idle prior intent and installs the transition intent without executing it inside the HP callback. A connected live-registry probe covers 60 existing-counter additions and phase-layer subtractions; 16 absent-state cases continue through original construction and registration, five absent counter cases reach actual `be_damage_statics` storage, and seven second-phase cases store their layer count with the resolved `be_damage_limit`. Five joined cases use original command/effect construction, `TryDoEffect`, and root/subeffect recursion across a narrow callback bridge to original add/subtract/remove/skill bodies, matching the authored phase model. The changed resource-150 parser, expressions, add-state parent and property server reproduce every inherited case. Five more modules at the main skill-phase boundary are also byte-identical; the phase start reaches original effect-manager construction, a real `BEActiveDamage`, real child `BEFunctionEffect` dispatch, original `Damage2SingleTarget`, original `GetRealDmg`, original `BattleUnitBase.BeHit`, original `BattlePropertyServer` HP mutation, the original nonlethal HP/damage event-request order and one lethal monster death/kill-request boundary under explicit neutral PvE inputs. Listener-generated effects and a fully scheduled death tree remain outside the connected run. Active effect initialization has one confirmed build-specific change: resource 150 clamps a nonpositive base repeat before applying repeat modifiers. Both catalogs contain 69 Awake skills and zero directly linked damage rows, while one-level literal traversal reaches one conditional Passive-damage row; their remaining nested state/resource graphs are separate simulator work. Keeper/PvP/forced-play eligibility outside the selected cases, full death scheduling, card-manager mutation internals, transport serialization/replay playback and other untested component internals still require revalidation before a current replay can serve as an end-to-end holdout. See `docs/CURRENT_PC_BUILD.md`, `docs/CONNECTED_EVENT_DELIVERY.md` and `docs/AWAKE_CARD_COMMANDS.md`.

Run from this directory:

```text
.venv/Scripts/python.exe tools/verify_research.py
.venv/Scripts/python.exe tools/test_verify_research.py
```

`verify_research.py --check-publication` exits nonzero while publication review is incomplete. This checkpoint checks tests, observation completeness and website engine-copy consistency; it cannot authorize publication or replace a source/coverage audit. Its TAP log and evidence-file hashes are saved alongside the report.

## Calculator and website

`engine/calculate-damage.mjs` is the strict/experimental single-hit research API. With explicit target state, experimental mode distinguishes incoming damage, the capped HP-loss request and modeled ordinary HP lost. It does not execute combat callbacks or death effects. Strict mode withholds a verified result. The separate phase-cap, Old Embers and fatal-damage modules are bounded research components, not a complete battle simulator. All continue to withhold verified final damage.

`website/dist/index.html` is the local general formula sandbox. The adjacent Actions, States, Timeline, Builds, Property Snapshots and Rules pages expose bounded research components for human or agent-led theorycrafting; they do not yet form a complete battle simulator. Mouchette/Arachne remains a case study at `website/dist/mouchette.html`. The site uses copied versions of allowlisted authored engine modules, checked for byte equality. Run `tools/prepare_local_website.py` after changing a shared module. Browser checks cover every page plus representative formula, action and property-snapshot calculations; full interactive, responsive and WebMCP QA remains incomplete. See `docs/WEBSITE_STATUS.md`.

The build planner and agent API share a catalog-derived Wheel search across all 146 pinned identities. It can filter by name, associated owner, realm, main stat and normalized mechanic tags while keeping passive execution, legality, ranking and optimality explicitly unresolved.

The prediction freezer can also pin a paid catalog-backed state-to-Active chain. Its contract includes the exact engine dependency graph and the selected build's Skill, BattleApi, Cmd and State hashes, so an agent or human can replay an unchanged pre-outcome calculation. The supplied example is a reproducibility fixture rather than gameplay validation.

The project separates mechanics reconstruction, budget-comp scouting, cheese analysis, forward theorycrafting and verification. Each artifact has one track; findings can motivate a new artifact in another track but cannot inherit that track's claim. Private replay tools can emit identifier-free action summaries and Pareto budget frontiers without inventing a weighted investment score. See `docs/ANALYSIS_TRACKS.md` and `docs/REPLAY_ANALYSIS_WORKFLOWS.md`.

Agents can call the same bounded engine through `engine/theorycraft-api.mjs` or `node tools/run_theorycraft_request.mjs --input request.json`. Every response is explicitly tagged `theorycrafting` and carries its claim boundary: it cannot present the result as an observed cheese strategy, leaderboard prevalence or independent verification. The versioned request selects one explicit operation; it does not silently fill missing combat state or promote an experimental result to verified.

The agent API includes `calculate-snapshot-active-damage` for complete captured resource-144 or resource-150 battle-property maps. Schema 1 stops at pre-hit damage. Schema 2 continues through immunity, shield or Puncture handling, retained-HP conversion, incoming limits, death resistance and HP subtraction. It records every property read and rejects partial snapshots, making it suitable for freezing a bounded pre-hit or modeled-HP-loss prediction when a fresh replay supplies the required pre-action evidence. `finalDamage` remains null until independent gameplay validation passes.

`run-snapshot-active-sequence` repeats the same complete-property Active path while carrying recovered HP and Block changes between hits. It recomputes block-sensitive damage after shield depletion, validates all supplied hits and stops before unsupported post-death execution. Other state/event mutations remain explicit unresolved dependencies.

`run-wheel-active-timeline` composes explicitly ordered recovered Wheel events with that complete-property Active path. It exposes the exact temporary properties applied to each hit, preserving the fact that post-use and post-pursuit effects change only later hits. Schema 1 checks one caster baseline against the Wheel state. Schema 2 carries separate complete caster/player maps on every hit and overlays only shared Wheel contributions, preventing Mouchette and Arachne from silently sharing base properties. See [`docs/WHEEL_ACTIVE_TIMELINE.md`](docs/WHEEL_ACTIVE_TIMELINE.md), [`research/examples/theorycraft-wheel-active-timeline.json`](research/examples/theorycraft-wheel-active-timeline.json) and [`research/examples/theorycraft-multi-caster-wheel-active-timeline.json`](research/examples/theorycraft-multi-caster-wheel-active-timeline.json).

`compare-wheel-active-timelines` aligns two such executions by stable step identity. It distinguishes a pure reorder from changed inputs and reports per-step differences in damage, HP, Block, temporary properties and Wheel counters. The Wheel lab exposes the same verified-runtime pin-and-compare workflow.

`run-paid-wheel-active-timeline` adds ordinary PvE card legality and energy payment before explicit Wheel-aware hit sequences. Rejected cards expose neither damage nor a Doomsday post-use transition; accepted cards carry energy, target state and Wheel counters forward. Schema 2 preserves different caster/player maps across paid team actions. See [`research/examples/theorycraft-paid-wheel-active-timeline.json`](research/examples/theorycraft-paid-wheel-active-timeline.json).

`search-paid-wheel-orders` evaluates every permutation of the supplied paid Wheel-aware actions within an explicit cap, including schema 2 actions from different characters. It returns the highest modeled HP-loss legal order and its full trace, with optimality limited to the enumerated action set and supported mechanics.

`run-ulti-energy-effect` exposes the ordinary ultimate-energy calculation, effect repetition and capped Awakener storage path for both supported PC builds. Resource-150 support is backed by 516 exact executions of the installed modules against inherited fixtures. Callers still supply the resolved energy properties, card/tag eligibility, source, target order and starting energy.

`run-prepared-snapshot-active-skill` derives tags, card context, base damage, `ParaPlus` and repetition from build-pinned Skill/BattleApi/Cmd exports before running the complete-property sequence. Schema 2 also executes the dominant simple mixed shape, one ordinary Active row followed by caster ultimate-energy gain, carrying the derived skill identity and tags into the current-build-verified energy path. Callers still supply live property maps, resolved target, expression inputs, critical draws and explicit energy state. Other mixed commands, monster intents, other damage subtypes and lifecycle effects fail closed. See `docs/PREPARED_SNAPSHOT_ACTIVE_SKILL.md`.

The agent API can also enumerate ordinary PvE cards that are legal from an
explicit dispatch, energy, hand and status snapshot. It reports global and
per-card rejection gates without spending resources or executing effects. This
is the first general state-to-actions boundary for future sequence agents; it
does not infer card state, targets or outcomes.

The agent API can prepare a real exported skill and optionally execute its complete selected command when it fits a supported narrow profile. Skill, BattleApi and Cmd data are loaded and hashed by the host; callers supply progression and runtime facts rather than replacement command rows. See `research/examples/theorycraft-prepare-skill-request.json` and `docs/PREPARE_SKILL_COMMAND.md`.

The same catalog-backed boundary now executes ordinary PvE Defend cards whose exact command shape is `BEGainBlock → BEGainUltiEnergy`. Both Block and energy properties derive from one complete live snapshot with property-read provenance. See `docs/PREPARED_SNAPSHOT_BLOCK_SKILL.md` and `research/examples/theorycraft-prepared-snapshot-block-skill.json`.

Supported state-only cards can likewise import their command and State definitions from the pinned catalogs. The temporary-critical-damage example preserves the distinction between retained state contribution and amplified property storage on both PC builds. See `docs/PREPARED_STATE_CARD.md` and `research/examples/theorycraft-prepared-state-card.json`.

`run-prepared-state-active-sequence` carries one such catalog-backed role mutation into a later prepared Active card when the state recipient and damage caster are explicitly the same role. Its ordered-chain companion repeats supported prepared Active cards while carrying target HP, Block and exposed caster energy. The paid companion checks ordinary PvE play conditions and spends action energy before exposing each card's effects. These paths reject pre-state snapshot drift and record every changed property, declared caster-state layer, payment and target transition. See `docs/PREPARED_STATE_ACTIVE_SEQUENCE.md` and the corresponding `theorycraft-*-state-active-*.json` examples under `research/examples`.

`search-card-orders` exhaustively evaluates every permutation of the supplied resolved card instances within an explicit evaluation cap. It accepts only completed or target-defeating terminal sequences as candidates and includes the winning execution trace. Its optimality claim is limited to that enumerated input set and the runner's documented experimental scope.

The build planner and `assemble-build-components` API operation now produce one contribution ledger for recovered character CON/ATK/DEF progression, explicit Season/Soulforge primary-stat promotion and both optional Wheel main stats. Build-plan schema 2 records enhancement and refinement separately for each of two Wheel slots; schema 1 remains readable for legacy imports. The planner offers separate installed resource-150 and historical resource-144 datasets and refuses to cross them; the current payload is backed by 2,700 exact executions of the original primary-stat lookup for 60 resolved characters. Unknown level, Gnostic rank, advancement talent/level, selected-Wheel enhancement/refinement, or unresolved client identity is returned as a typed issue. Advancement passive states, broader Wheel passives, equipment legality and battle-start effects remain unresolved and are never treated as zero.

For local agent workflows, `assemble-wheel-loadout-properties` resolves both selected resource-144 Wheels' initial direct-property expressions from their explicit refinement levels and returns per-Wheel plus summed ledgers. Raw serialized-battle values stay separate from local-client initialization rounding, and every trigger graph remains visibly unresolved.

Three source-derived transition operations cover the first reconstructed Wheel triggers. One advances Doomsday Rampage after a played Strike, retaining the pre-event flat-damage snapshot and adding the rounded ATK-scaled layer for later Strikes up to eight. One emits Light of Intellect's once-per-turn Strike retrieval request after a Keeper skill, including the refinement chance, availability and turn-clear boundary. The third advances Eternal Weave and Rota Fortunae after an Arachne-owned pursuit, applying their separate counters and team-amplification additions. All require explicit combat state and return no damage total.

The local website exposes these operations in `wheel-events.html`. Users can edit exact JSON state, load one example for each recovered event family, or run an ordered multi-turn sequence. The sequence carries temporary contributions separately from base properties: Doomsday, Light of Intellect, Eternal Weave and temporary team amplification reset after a turn, while Rota Fortunae's trigger counter persists until battle end. The verified runtime keeps `finalDamage` null.

The ordered Actions runner now supports a strict single-parameter Block-gain subset for the caster or supplied target. Its formula, recipient modifiers and storage cap match 911 copied-original runtime executions in total, and later damage consumes target Block in row order. Automatic property assembly, multi-target Block, optional state descendants and Block-trigger events remain outside that subset.

The same runner supports a strict single-parameter Heal subset. Formula, recipient and HP-storage boundaries match 871 copied-original runtime executions, including maximum-HP overflow and the distinction between a locally reported negative Heal and HP clamped at zero. Target healing changes the live HP used by later damage rows. Multi-target/repeated healing, Heal events and revival remain unresolved.

The earlier equipped Mouchette PDF omitted intrinsic Arachne realm effects and is not a complete team prediction. Its builder is disabled. Final investigation Realm Mastery is still needed for the corrected scenario; see `docs/ARACHNE_SIGNATURE_COMPARISON.md`.

The mechanics track now has a general Wheel-to-client-state crosswalk. Exact
icon-asset joins uniquely map 141 of 146 public SKeyDB Wheel identities to a PC
client Weapon row and initial state; one is missing and four are ambiguous and
therefore rejected. Those unique states lead to 229 trigger-command references
across 190 command IDs, all present in the client catalog, alongside 63 direct
property maps. This is the entry boundary for reconstructing passive state
graphs, not passive execution or a build recommendation. See
`research/evidence/wheel-state-crosswalk-audit.json` and
`tools/audit_wheel_state_crosswalk.py`.

Literal state-add links expand that boundary to a static potential graph of 353
states, 260 distinct trigger commands and 32 effect types. The graph records
cycles and dynamic state identities explicitly; it is an implementation map,
not permission to execute every branch or a claim that every effect activates.
The sanitized per-Wheel capability index is available at
`research/evidence/wheel-mechanics-capability-catalog.json` and in the prepared
website package for agent or human discovery.

Agents can query that index without entering the theorycraft track by running
`node tools/search_wheel_mechanics.mjs --input research/examples/mechanics-search-wheel-capabilities.json`.
The versioned response remains labeled `analysisTrack: "mechanics"` and exposes
only static fingerprints and their limitations.

The local mechanics resolver can also convert an explicit Wheel refinement
level into its source-bound initial StateArg values. Its restricted arithmetic
matches 232 executions of the original PC `FuncTable` with zero mismatches. See
`research/evidence/wheel-refinement-runtime-audit.json` and
`research/examples/mechanics-resolve-eternal-weave-refinement.json`.

## Offline replay pipeline

An explicitly exported PC replay can now be processed without running game logic or reading process memory:

1. `tools/decode_battle_replay.py` calls copied client LZ4/cmsgpack modules to decode the replay under ignored `research/observations/`.
2. `tools/index_decoded_replay.py` reconstructs role, card and active-state maps at every `UseCard` boundary and preserves selected-target commands and following hit windows.
3. `tools/build_replay_action_candidate.mjs` can bind a narrow unambiguous hit, including a selected hit inside a supported multi-target action, into the complete-property damage scenario while keeping its observed result separate.
4. `tools/freeze_blind_replay_prediction.mjs` selects a deterministic direct hit, keeps only target/caster/skill identity from the hit routing, removes every numeric outcome field, restores target HP/block from the action boundary and writes a non-overwritable public prediction freeze. The resulting claim is damage conditional on the frozen identity; it does not claim to predict target selection. `tools/reveal_blind_replay_prediction.mjs` refuses to read the result until the freeze artifacts are committed unchanged at `HEAD`.

The native decoder has passed a synthetic round trip and 172 authorized server replay containers. The first 69 unique-record archive contributes 428 retrospective exact gameplay consistency checks. A later 102-record PvE Boss tranche contributes 1,736 more strict Active candidates: 182 deterministic checks and 1,554 independently evaluated critical-branch checks, with zero mismatches. Those later records form ten exact budget-comparison groups and twenty-six nondominated roster/investment candidates. The checks are retrospective and recorded engine builds remain unresolved, so none receives blind-holdout credit. `tools/process_private_replay_batch.py` performs resumable parallel decode/compact preparation; `tools/audit_replay_batch.mjs` reruns domain and candidate audits from batch directories; `tools/summarize_replay_capture_round.py` and `tools/sanitize_budget_frontiers.py` publish identifier-free, track-specific reports. `docs/REPLAY_ACQUISITION_PATH.md` traces the authenticated client dependency from player record lookup to downloaded JSON without storing a player identifier. See `docs/LOCAL_REPLAY_RECOVERY.md`, `docs/REPLAY_ACTION_CANDIDATE.md` and `docs/BLIND_REPLAY_HOLDOUT.md` for the explicit limits.

The blind replay workflow also has a narrow resource-150 path for a fresh controlled capture: complete live property maps, current-catalog target-state classification, and a build commitment frozen with recognized evidence before reveal. It uses exact current `State`, `Constant` and `BattleApi` mappings plus cross-build-runtime-matched offense, utility, critical and final-target domains. Historical recordings and raw pre-constructor maps remain outside that current-build claim.

An identifier-free retrospective readiness audit found 69 deterministic Mouchette ordinary-Active hits with zero mismatches in the 102-record PvE tranche, including 17 Mortal Blast and 24 Shining Tornado hits with captured critical-chance ceilings of at least 100. This supplies a practical recipe for a fresh controlled prediction-before-reveal run; it is not holdout credit, a theorycraft recommendation or a cheese finding. See `research/evidence/mouchette-holdout-readiness.json` and `docs/BLIND_REPLAY_HOLDOUT.md`.

`research/evidence/current-session-replay-baseline-002.json` commits to the live resource-151 process's pre-battle replay-reference inventory without publishing any reference. The build is identified separately, all six client modules in the bounded live-property replay adapter are byte-identical to resource 150, and its five config tables are Lua-semantically equivalent after explicit representation normalization. `research/evidence/pc-res151-replay-adapter-compatibility.json` records the complete dependency composition. Other simulator and theorycraft paths remain outside resource-151 support. One newly isolated container matches the controlled team's level pattern and remains an unreviewed same-battle capture candidate. Its retrospective resource-151 audit finds six chance-branch matches with zero mismatches after rejecting 71 out-of-scope hits. This is review-pending retrospective evidence, not a blind holdout. See `research/evidence/controlled-pve-retrospective-audit-004.json`.

The copied PC transport schema has also been inspected with the client's native `sproto.core`. It contains generic transport/login protocols rather than replay endpoint schemas and exposes no literal combat-build fingerprint. That negative result is reproducible through `tools/inspect_pc_protocol_bundle.py`; it means an old replay still needs independent version evidence before it can count as strict validation.

The source-hashed static audit follows non-PvP supported-tag Awakener skills to their commands and currently finds all 121 linked commands containing ordinary Active damage have row shapes the PvE replay adapter can parse. This is potential replay-regression coverage only; it is not gameplay support or accuracy evidence.

## Evidence and next validation

- `docs/VERIFICATION_REPORT.md`: research history and validation scope.
- `docs/MODIFIER_BUCKETS.md`: recovered modifier operations.
- `docs/HP_EVENTS_AND_MULTIHIT.md`: HP mutation, queue and fatal-damage boundaries.
- `docs/HIGH_DIFFICULTY.md`: prioritized Frenzy record and Old Embers mechanics.
- `docs/NEXT_GAMEPLAY_CAPTURE.md`: missing evidence for an independent prediction.
- `research/evidence/registry.json`: source fingerprints and claim-specific scope.

PC downloaded resource144/build51 and Android resource83 are distinct builds. The packaged Android startup archive now parses without execution into seven Lua prototypes; its only literal URL is telemetry and it contains no literal resource-download endpoint. Downloaded Android combat bundles are still absent, so this does not establish formula parity. Original installations remain read-only sources. Copied native libraries, keys, extracted proprietary content and private screenshots must never be included in website output.

Publication still requires the original user's full gate: supported-stage evidence, passing regressions, exact real observations where deterministic, independently frozen holdouts, no unexplained systematic discrepancy and source traceability. A zero gameplay denominator cannot pass.
