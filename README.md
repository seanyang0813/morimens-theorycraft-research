# Morimens damage research

Status: research prototype. The general calculator, sequence workbenches and evidence browser run locally, but there is no verified end-to-end gameplay prediction and the accuracy publication gate is **NOT_READY**.

This repository is a source checkpoint for collaboration. It does not claim that the calculator is accurate enough for build recommendations. Generated symbol indexes, copied client files, extraction outputs, local observations, private screenshots and keys are intentionally excluded.

For a quick shareable overview, read [`FRIEND_PREVIEW.md`](FRIEND_PREVIEW.md). An agent or developer continuing the work should start with [`DEVELOPER_HANDOFF.md`](DEVELOPER_HANDOFF.md).

## Current checkpoint

The reproducible checkpoint is `research/evidence/verification-snapshot.json`, which records the latest full-suite result and test-file count. Two screenshot-based gameplay observation records remain incomplete. Eleven privately preserved high-difficulty native replays now decode successfully; the ten-record batch indexes 86,317 events, 589 card uses and 900 hits. The strict adapter reaches 178 Active-hit candidates: 122 deterministic calculations match exactly with zero mismatches, and all 56 chance-dependent cases match one independently evaluated critical/noncritical branch. Thirteen branch cases occur across two additional records on the same high-difficulty stage as the Mouchette case. Each candidate routes through its replay's embedded Skill/Cmd/Monster/Awakener rows. The outcomes were recovered before calculation and the replays have no explicit engine-code version, so zero independently frozen holdouts qualify for publication review. The separate Old Embers 3x source-statistics regression also remains retrospective and build-unconfirmed. Synthetic runtime comparisons do not count as gameplay validation.

Run from this directory:

```text
.venv/Scripts/python.exe tools/verify_research.py
.venv/Scripts/python.exe tools/test_verify_research.py
```

`verify_research.py --check-publication` exits nonzero while publication review is incomplete. This checkpoint checks tests, observation completeness and website engine-copy consistency; it cannot authorize publication or replace a source/coverage audit. Its TAP log and evidence-file hashes are saved alongside the report.

## Calculator and website

`engine/calculate-damage.mjs` is the strict/experimental single-hit research API. With explicit target state, experimental mode distinguishes incoming damage, the capped HP-loss request and modeled ordinary HP lost. It does not execute combat callbacks or death effects. Strict mode withholds a verified result. The separate phase-cap, Old Embers and fatal-damage modules are bounded research components, not a complete battle simulator. All continue to withhold verified final damage.

`website/dist/index.html` is the local general formula sandbox. The adjacent Actions, States, Timeline, Builds and Rules pages expose bounded research components for human or agent-led theorycrafting; they do not yet form a complete battle simulator. Mouchette/Arachne remains a case study at `website/dist/mouchette.html`. The site uses copied versions of allowlisted authored engine modules, checked for byte equality. Run `tools/prepare_local_website.py` after changing a shared module. A bounded browser smoke test loads every page and exercises the general formula and one Actions example; full interactive, responsive and WebMCP QA remains incomplete. See `docs/WEBSITE_STATUS.md`.

The ordered Actions runner now supports a strict single-parameter Block-gain subset for the caster or supplied target. Its formula, recipient modifiers and storage cap match 911 copied-original runtime executions in total, and later damage consumes target Block in row order. Automatic property assembly, multi-target Block, optional state descendants and Block-trigger events remain outside that subset.

The same runner supports a strict single-parameter Heal subset. Formula, recipient and HP-storage boundaries match 871 copied-original runtime executions, including maximum-HP overflow and the distinction between a locally reported negative Heal and HP clamped at zero. Target healing changes the live HP used by later damage rows. Multi-target/repeated healing, Heal events and revival remain unresolved.

The earlier equipped Mouchette PDF omitted intrinsic Arachne realm effects and is not a complete team prediction. Its builder is disabled. Final investigation Realm Mastery is still needed for the corrected scenario; see `docs/ARACHNE_SIGNATURE_COMPARISON.md`.

## Offline replay pipeline

An explicitly exported PC replay can now be processed without running game logic or reading process memory:

1. `tools/decode_battle_replay.py` calls copied client LZ4/cmsgpack modules to decode the replay under ignored `research/observations/`.
2. `tools/index_decoded_replay.py` reconstructs role, card and active-state maps at every `UseCard` boundary and preserves selected-target commands and following hit windows.
3. `tools/build_replay_action_candidate.mjs` can bind a narrow unambiguous hit, including a selected hit inside a supported multi-target action, into the complete-property damage scenario while keeping its observed result separate.
4. `tools/freeze_blind_replay_prediction.mjs` selects a deterministic one-enemy first hit, removes outcome fields, restores target HP/block from the action boundary and writes a non-overwritable public prediction freeze. `tools/reveal_blind_replay_prediction.mjs` refuses to read the result until the freeze artifacts are committed unchanged at `HEAD`.

The native decoder has passed a synthetic round trip and eleven authorized server replays. The index/adapter have synthetic integration coverage and 178 retrospective exact gameplay consistency checks. `docs/REPLAY_ACQUISITION_PATH.md` traces the authenticated client dependency from player record lookup to downloaded JSON without storing a player identifier. See `docs/LOCAL_REPLAY_RECOVERY.md`, `docs/REPLAY_ACTION_CANDIDATE.md` and `docs/BLIND_REPLAY_HOLDOUT.md` for the explicit limits.

The copied PC transport schema has also been inspected with the client's native `sproto.core`. It contains generic transport/login protocols rather than replay endpoint schemas and exposes no literal combat-build fingerprint. That negative result is reproducible through `tools/inspect_pc_protocol_bundle.py`; it means an old replay still needs independent version evidence before it can count as strict validation.

The source-hashed static audit follows non-PvP supported-tag Awakener skills to their commands and currently finds all 121 linked commands containing ordinary Active damage have row shapes the PvE replay adapter can parse. This is potential replay-regression coverage only; it is not gameplay support or accuracy evidence.

## Evidence and next validation

- `docs/VERIFICATION_REPORT.md`: research history and validation scope.
- `docs/MODIFIER_BUCKETS.md`: recovered modifier operations.
- `docs/HP_EVENTS_AND_MULTIHIT.md`: HP mutation, queue and fatal-damage boundaries.
- `docs/HIGH_DIFFICULTY.md`: prioritized Frenzy record and Old Embers mechanics.
- `docs/NEXT_GAMEPLAY_CAPTURE.md`: missing evidence for an independent prediction.
- `research/evidence/registry.json`: source fingerprints and claim-specific scope.

PC downloaded resource144/build51 and Android resource83 are distinct builds. Original installations remain read-only sources. Copied native libraries, keys, extracted proprietary content and private screenshots must never be included in website output.

Publication still requires the original user's full gate: supported-stage evidence, passing regressions, exact real observations where deterministic, independently frozen holdouts, no unexplained systematic discrepancy and source traceability. A zero gameplay denominator cannot pass.
