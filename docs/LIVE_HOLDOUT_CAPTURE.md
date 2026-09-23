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

The tool rejects a different PID, process start time or executable hash. A useful capture normally reports one new reference and one valid container. The API can encode raw compressed bytes in a Latin-1 JSON envelope; the capture checks both UTF-8 and Latin-1 JSON and records the encoding without unpacking `compStr`. Multiple candidates require private review before selecting one. Do not open the container or inspect decoded damage.

### 2026-09-23 D-Tide attempt

After the committed second baseline, an agent-controlled D-Tide Normal Wave 1 fight ended in defeat on round 3. The account was level 33 against the wave's recommended level 36; its selected characters were levels 50, 30, 40 and 40. The result screen displayed a replay-copy option, but it yielded no usable code through the UI. A same-process delta captured at 08:26:14 UTC read 4,480,606,208 bytes and found zero replay references or valid containers. Damage values were visible while the agent piloted the fight. This attempt is therefore neither a captured replay nor a blind holdout, and it adds no publication credit. No revival items were spent. The private delta is `research/raw/dtide-failed-wave1-delta-20260923.json` (gitignored).

For the next attempt, use a clearable PvE stage, commit a fresh baseline before entering, and load a completed battle record before taking the delta. Do not inspect damage during play if the resulting record is intended as a blind holdout; a copied record alone cannot repair prior outcome exposure.

### 2026-09-23 completed story-record check

Opening an existing chapter 5-14 Normal win in the same game process produced two new replay containers relative to the second baseline. Both classify as `PVE_MONSTER_TARGETS` from replay-embedded Boss configurations with Monsters. The selected chapter record was matched privately against the in-client player and stage metadata; the other container was incidental. The strict resource-151 calculator audit found 19 and 27 ordinary Active-hit candidates respectively. All 46 matched one post hoc crit branch, with zero deterministic candidates and zero branch mismatches. The identifier-free counts and container hashes are in `research/evidence/story-pve-retrospective-audit-20260923.json`. These are retrospective regressions from existing records, not controlled post-baseline battles or blind holdouts. No publication credit is claimed.

## 4. Build the outcome-blind capture evidence

Preserve the container hash and object timestamp first. Decode and index only through the repository tools; avoid opening their outputs. Generate the combat-domain report and continue only if it says `PVE_MONSTER_TARGETS`. Then build the public capture candidate with `tools/build_replay_session_capture_evidence.py` and obtain explicit confirmation that the selected record is the controlled battle. Store that confirmation only in a private `MORIMENS_PRIVATE_CONTROLLED_PVE_ATTESTATION`, and promote the candidate with `tools/review_replay_session_capture.py`.

## 5. Freeze before revealing damage

Use `tools/freeze_blind_replay_prediction.mjs` with:

```text
--recorded-build pc-res151-build51
--build-evidence research/evidence/pc-res144-to-res151-combat-build.json
--build-evidence research/evidence/pc-res151-replay-adapter-compatibility.json
--capture-evidence research/evidence/<reviewed-session-capture>.json
```

The freezer rejects a resource-150/151 claim unless that reviewed capture matches the decoded container hash, PvE domain, recorded build and every same-session provenance check. Commit and push the frozen prediction and all referenced evidence. Only then reveal the selected damage outcome and compare it through the review tools. Already viewed damage, a restarted process, an uncommitted baseline, PvP/mixed-domain routing or a missing controlled-battle attestation cannot receive holdout credit.
