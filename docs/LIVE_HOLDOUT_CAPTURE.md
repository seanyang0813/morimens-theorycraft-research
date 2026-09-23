# Live replay holdout capture

`tools/capture_live_replay_session.py` preserves the replay provenance needed for a blind current-build check. It reads only a user-selected `Morimens.exe` process, writes replay references and containers below gitignored `research/raw`, and prints only counts and container hashes. It does not decode a replay or reveal damage.

## 1. Commit a baseline before the battle

Launch Morimens and keep that process open. Before playing the controlled battle, obtain its PID and capture the private replay inventory:

```powershell
$p = Get-Process Morimens
python tools/capture_live_replay_session.py baseline --pid $p.Id --output research/raw/holdout-session-baseline.json
```

Convert it to an identifier-free public commitment:

```powershell
python tools/commit_replay_session_baseline.py --private-baseline research/raw/holdout-session-baseline.json --build-evidence research/evidence/pc-res144-to-res151-combat-build.json --install-root "C:\Program Files (x86)\Steam\steamapps\common\Morimens" --output research/evidence/holdout-session-baseline.json
git add research/evidence/holdout-session-baseline.json
git commit -m "Commit replay holdout baseline"
git push origin main
```

The public commit must exist before the battle. Do not reuse a baseline after Morimens exits, restarts, or updates.

## 2. Play and load exactly one controlled PvE record

Use the same running process. Record the stage, action, pre-action properties, target state and intended card privately. Prefer one deterministic isolated action. After the battle, open its record so the replay reference is present in that same process.

## 3. Preserve the same-process delta

```powershell
$p = Get-Process Morimens
python tools/capture_live_replay_session.py delta --pid $p.Id --baseline research/raw/holdout-session-baseline.json --output research/raw/holdout-session-delta.json
```

The tool rejects a different PID, process start time or executable hash. A useful capture normally reports one new reference and one valid container. New baselines retain the discovery source of each reference. If a field-only reference later gains an object reference, the delta reports it as `objectPromotionCount`, separate from `newReferenceCount`; this is a diagnostic candidate, not proof of a fresh battle. Legacy baselines without discovery provenance keep new-reference-only behavior. `fieldOnlyCandidateCount` and `unavailableContainerCount` distinguish unmaterialized field references from retrievable records without printing replay identifiers. The API can encode raw compressed bytes in a Latin-1 JSON envelope; the capture checks both UTF-8 and Latin-1 JSON and records the encoding without unpacking `compStr`. Multiple candidates require private review before selecting one. Do not open the container or inspect decoded damage.

The delta summary also counts containers whose server `Last-Modified` is before the baseline as `olderContainerCount`. Such a container was merely loaded into memory later; it cannot establish a new post-baseline battle. A later `Last-Modified` is only a necessary timestamp check, not proof that the selected replay is the controlled fight. Missing timestamps remain unknown and require review.

### 2026-09-23 D-Tide attempt

After the committed second baseline, an agent-controlled D-Tide Normal Wave 1 fight ended in defeat on round 3. The account was level 33 against the wave's recommended level 36; its selected characters were levels 50, 30, 40 and 40. The result screen displayed a replay-copy option, but it yielded no usable code through the UI. A same-process delta captured at 08:26:14 UTC read 4,480,606,208 bytes and found zero replay references or valid containers. Damage values were visible while the agent piloted the fight. This attempt is therefore neither a captured replay nor a blind holdout, and it adds no publication credit. No revival items were spent. The private delta is `research/raw/dtide-failed-wave1-delta-20260923.json` (gitignored).

For the next attempt, use a clearable PvE stage, commit a fresh baseline before entering, and load a completed battle record before taking the delta. Do not inspect damage during play if the resulting record is intended as a blind holdout; a copied record alone cannot repair prior outcome exposure.

### 2026-09-23 completed story-record check

Opening an existing chapter 5-14 Normal win in the same game process produced two new replay containers relative to the second baseline. Both classify as `PVE_MONSTER_TARGETS` from replay-embedded Boss configurations with Monsters. The selected chapter record was matched privately against the in-client player and stage metadata; the other container was incidental. The strict resource-151 calculator audit found 19 and 27 ordinary Active-hit candidates respectively. All 46 matched one post hoc crit branch, with zero deterministic candidates and zero branch mismatches. The identifier-free counts and container hashes are in `research/evidence/story-pve-retrospective-audit-20260923.json`. These are retrospective regressions from existing records, not controlled post-baseline battles or blind holdouts. No publication credit is claimed.

### 2026-09-23 exploratory chapter run

A third public baseline was committed and pushed before entering chapter 1-13 Normal. The run contains multiple combats and visible results, so it is exploratory rather than the prescribed single unseen controlled battle. An intermediate same-process delta found one valid container, but its server `Last-Modified` preceded the baseline; it was an older replay loaded after the commitment and cannot receive holdout credit. The investigation is still in progress. The in-client exit option warns that abandoning it forfeits subsequent rewards, so the run was left intact. A new baseline and one isolated fight are needed for the strict holdout.

### 2026-09-23 fourth baseline and chapter 5-14 attempt

The third exploratory investigation was abandoned after its visible outcomes made it unsuitable for a blind holdout. A fourth public baseline was committed and pushed before selecting another stage, with three private replay references in the still-running resource-151 process. Chapter 1-15 Normal proved to be story-only. Chapter 5-14 Normal reached combat after one noncombat event, but card, end-turn and auto-battle inputs did not advance the first turn; the in-game menu still responded. Restarting that battle left the same first-turn state. A same-process delta at 09:33:16 UTC found one reference absent from the baseline, but **zero valid replay containers** and zero objects modified after the baseline. Its private output is `research/raw/holdout-session-delta-20260923-06.json` (gitignored). No completed battle record or holdout exists from this attempt, and it adds no publication credit. Keep the baseline and this delta as a diagnostic pair; a future attempt must complete and load a record before freezing any prediction.

### Completed Chapter 1-7 capture diagnostic

A fifth public baseline was committed and pushed before entering Chapter 1-7 Normal in the same running resource-151 process. In-game auto battle cleared its investigation and the stage Record screen listed the account's completed final battle. Loading that record and scanning the unchanged process at 10:29:11 UTC yielded ten references absent from the baseline and ten valid containers. Five containers had server modification times after the baseline and embedded the Chapter 1-7 stage. Private account matching showed that **only one** was this account's newly completed battle; the other four were other players' records loaded by the leaderboard screen. The selected container was independently classified `PVE_MONSTER_TARGETS`, and its complete index has 31 records, 633 events, seven card uses and nine hits. The resource-151 adapter found two ordinary Active-hit candidates; both match one critical branch, with zero deterministic checks and zero branch mismatches. The identifier-free report is `research/evidence/chapter-1-7-exploratory-pve-audit-20260923.json`; its private delta and audit remain gitignored.

Damage appeared during play, and the investigation had several combats. This is a successful **capture-pipeline diagnostic**, not a blind holdout or publication credit. The next validation must isolate a new fight, freeze its prediction before viewing the outcome, and review its matching record separately from leaderboard entries.

Further UI inputs did advance the same chapter 5-14 run. Three ordinary battles ended in victory using in-game auto battle, followed by map events and a locked gate requiring a key. The run was still on the investigation map when a same-process delta was captured at 09:51:05 UTC. The delta saw three replay references (one absent from the baseline), but **zero valid replay containers** and zero objects modified after the baseline; its private output is `research/raw/holdout-session-delta-20260923-08.json` (gitignored). The new reference alone cannot establish a usable battle replay. Damage was visible on the combat victory screens, so this run is exploratory even if the gate is later cleared. It adds no blind holdout or publication credit.

### 2026-09-23 character-trial diagnostic

After abandoning the locked chapter run, the agent entered the previously cleared Ogier consciousness-trial battle at recommended level 25 with the account's level 50/30/40/40 team. In-game auto battle won the ordinary fight and granted a card imprint. The subsequent map gate required a rusted key, so the investigation did not finish. A fresh private same-process baseline had three references at 10:00:31 UTC. Its private delta at 10:04:56 UTC still had three references, **zero new references and zero valid containers**. The trial's earlier Record screen also showed no clear record for this stage. The files are `research/raw/holdout-session-baseline-20260923-09.json` and `research/raw/holdout-session-delta-20260923-09.json` (gitignored). This private baseline was not committed publicly before the fight, and the visible fight was exploratory; it provides no holdout or publication credit.

### 2026-09-23 current Chapter 5-14 Normal run

A new public baseline was committed and pushed before entering Chapter 5-14 Normal in the same resource-151/build-51 process. Two ordinary fights completed with in-game auto battle while the investigation remained open. A same-process scan at 14:49:41 UTC found two references absent from the three-reference baseline, but both were field-only and **neither replay container was retrievable**. The investigation reached a gate requiring a separate rusted key; the Record screen has not been loaded. The identifier-free diagnostic is `research/evidence/story-5-14-live-replay-diagnostic-20260923.json`, with the raw delta gitignored. Damage was visible during play, so these fights are exploratory and add no holdout credit. A later scan after a completed stage Record is loaded may show whether those references become containers; it cannot retroactively make the visible outcomes blind.

### 2026-09-23 resource-153 Chapter 1-7 record-list diagnostic

A public resource-153/build-51 baseline was committed and pushed before a fresh Chapter 1-7 Normal investigation. The investigation cleared, but damage and victory were visible during auto battle. The stage's Record list then loaded ten previously absent replay references in the same process; all ten containers were retrievable. Nine objects were modified after the baseline, while one was older. A subsequent private account, team-level, stage and timestamp check matched exactly one container to this account's newly completed final battle. The other nine are incidental records. The private delta and decoded batch remain gitignored; the [identifier-free own-battle diagnostic](../research/evidence/res153-own-chapter-1-7-capture-diagnostic-20260923.json) commits to their hashes.

All ten containers classify as `PVE_MONSTER_TARGETS`. The resource-153 adapter audit found 323 complete hit snapshots, 61 supported ordinary Active candidates, one exact deterministic match and 60 matches to one possible critical branch, with zero mismatches. The [identifier-free aggregate](../research/evidence/res153-record-list-retrospective-audit-20260923.json) commits to the private audit hash. These are retrospective component checks, not an exact recorded-build claim, a blind holdout, or publication credit. The critical draws are unavailable, and the first selected record belongs to another player; this account's record is a separate container in the batch.

A follow-up checked the installed resource-153 `BattleCardServer.lua` against resource 151: the selected 31,006-byte module is byte-identical. Its card-type path resolves progression-keyed `Type` lists and a positive `card_type_strike` override. Adding that bounded route to the replay adapter raised the same batch from 61 to 74 supported ordinary Active candidates: one deterministic match and 73 critical-branch matches, still with zero mismatches. The account-matched battle contributes four of the critical-branch matches and no deterministic match. The [card-type source commitment](../research/evidence/pc-res153-card-type-routing.json) and [updated identifier-free audit](../research/evidence/res153-record-list-type-routing-audit-20260923.json) keep this retrospective. Serialized card-type overrides and attach-post card routing remain unsupported, and the holdout count is unchanged.

The next audit checked each chance-dependent candidate against the replay's recorded `isCrit` flag rather than accepting either possible branch. All 73 selected branches match the recorded pre-hit damage exactly, including all four in the account-matched battle; no flags were missing or branch decisions ambiguous. The [crit-flag aggregate](../research/evidence/res153-record-list-crit-flag-audit-20260923.json) commits to the private audit. This is a stronger post-outcome regression, not a pre-outcome crit prediction or an independent holdout.

## 4. Build the outcome-blind capture evidence

### 2026-09-23 Chapter 1-7 controlled-run diagnostic

The same running resource-151/build-51 process completed Chapter 1-7 Normal with in-game auto battle. An identifier-free baseline was committed and pushed immediately before the boss fight (`research/evidence/holdout-session-baseline-20260923-14.json`). The account's newly completed stage record appeared at the top of the Record list and was loaded without inspecting combat damage. The private same-process delta contains ten valid replay containers absent from that baseline; only one has a post-baseline object modification time. Its embedded account identifier matches the visible account, its stage and Normal difficulty match the selected record, and its container hash is `dc58bedc376d3085cbaf60b73c17be1024f120ee992b1ec566b79a29eb37aab8`. An outcome-free check classifies its ten complete hit snapshots as `PVE_MONSTER_TARGETS`. The mechanically checked, still-unreviewed provenance artifact is `research/evidence/holdout-session-capture-candidate-20260923-14.json`.

The private index contains 47 records, 787 events, nine card uses and ten hits. Before any outcome reveal, the strict blind selector found no deterministic ordinary Active hit: the two supported Active opportunities require an unrecorded critical roll. This capture therefore provides a pipeline diagnostic only, with zero frozen predictions, zero blind holdouts and no publication credit. The capture candidate remains unreviewed; no user attestation has been recorded.

### 2026-09-23 Chapter H1-3 Hard boss capture

The account completed Chapter H1-3 Hard with three stars in the same running resource-151/build-51 process. A public pre-boss baseline was committed and pushed before entering that battle (`research/evidence/holdout-session-baseline-20260923-17.json`). The stage's Record list then showed the account's new clear. Loading that entry yielded exactly one new valid replay container in the same-process delta, with a server modification time after the baseline. Its embedded account and stage metadata matched the selected client record. The identifier-free capture candidate is `research/evidence/hard-h1-3-capture-candidate-20260923-17.json`.

The replay is a PvE Boss record with 61 records, 1,103 events, 12 card uses and 27 complete hit snapshots. The strict resource-151 ordinary Active adapter supports 11 of those hits; all 11 match one possible critical branch, with zero deterministic checks and zero branch mismatches. The remaining 16 hits are excluded for specific selector reasons recorded in `research/evidence/hard-h1-3-exploratory-pve-audit-20260923.json`. Damage numbers appeared during the live battle, so this is a retrospective pipeline and branch-consistency check, **not** a blind holdout or publication credit. The capture candidate remains unreviewed, and the recorded engine build is not claimed from the catalog match alone.

### 2026-09-23 second Chapter 1-7 final-battle diagnostic

The agent finished the ongoing Chapter 1-7 Normal investigation in the same resource-151/build-51 process. Immediately before entering its final battle, an identifier-free baseline was committed and pushed as `8a03962` (`research/evidence/holdout-session-baseline-20260923-fixed-boss.json`). A post-battle scan, without opening the Record list, found exactly one new valid replay container; its server modification time was after the baseline. The replay has 37 records, 585 events, five card uses and nine complete hit snapshots and classifies as `PVE_MONSTER_TARGETS`. The mechanically checked capture candidate is `research/evidence/holdout-20260923-fixed-boss-capture-candidate.json`. The Record was **not** loaded and matched, so this candidate remains unreviewed.

Before reading any hit's recorded damage or critical flag, the strict selector found no exact deterministic prediction. One action lacked a pre-hit boundary, three eligible hits required an unavailable critical RNG draw, and one lacked a captured Awakener owner. The new conditional-branch freezer treated RNG rolls 1 and 100 as *hypothetical* inputs for the first eligible hit and committed both possible pre-hit results, 45 critical and 30 non-critical, as `07d9501` (`research/evidence/holdout-20260923-fixed-boss-conditional-branches.json`). Only after that commit was pushed did the reveal tool inspect the selected hit: its recorded flag was non-critical and `castDamage` was 30, matching the precommitted non-critical branch with difference zero. The identifier-free comparison is `research/evidence/holdout-20260923-fixed-boss-branch-result.json`.

Reproduce the branch diagnostic with `tools/freeze_conditional_replay_branches.mjs` before outcome inspection and `tools/reveal_conditional_replay_branches.mjs` afterward; the latter verifies the freeze bytes against the supplied Git commit. The private decoded replay and index remain gitignored. This one conditional match tests a narrow formula path. It does **not** identify the RNG draw, verify target selection, promote the capture candidate, count as an exact blind holdout or satisfy the publication gate.

Preserve the container hash and object timestamp first. Decode and index only through the repository tools; avoid opening their outputs. Generate the combat-domain report and continue only if it says `PVE_MONSTER_TARGETS`. Then build the public capture candidate with `tools/build_replay_session_capture_evidence.py` and obtain explicit confirmation that the selected record is the controlled battle. Store that confirmation only in a private `MORIMENS_PRIVATE_CONTROLLED_PVE_ATTESTATION`, and promote the candidate with `tools/review_replay_session_capture.py`.

## 5. Freeze before revealing damage

Use `tools/freeze_blind_replay_prediction.mjs` with:

```text
--recorded-build pc-res151-build51
--build-evidence research/evidence/pc-res144-to-res151-combat-build.json
--build-evidence research/evidence/pc-res151-replay-adapter-compatibility.json
--capture-evidence research/evidence/<reviewed-session-capture>.json
```

For a resource-151 Fixed prediction, also pass `--build-evidence research/evidence/pc-res151-fixed-pure-runtime.json`. The compact replay index used by the selector must be generated with the current `tools/compact_replay_candidate_index.py`; it retains action-start roles and states needed to check Fixed inputs without reading the recorded amount. The freezer rejects a resource-150/151 claim unless that reviewed capture matches the decoded container hash, PvE domain, recorded build and every same-session provenance check. Commit and push the frozen prediction and all referenced evidence. Only then reveal the selected damage outcome and compare it through the review tools. Already viewed damage, a restarted process, an uncommitted baseline, PvP/mixed-domain routing or a missing controlled-battle attestation cannot receive holdout credit.
