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

The tool rejects a different PID, process start time or executable hash. A useful capture normally reports one new reference and one valid container. Multiple candidates require private review before selecting one. Do not open the container or inspect decoded damage.

## 4. Build the outcome-blind capture evidence

Preserve the container hash and object timestamp first. Decode and index only through the repository tools; avoid opening their outputs. Generate the combat-domain report and continue only if it says `PVE_MONSTER_TARGETS`. Then build the public capture candidate with `tools/build_replay_session_capture_evidence.py` and obtain explicit confirmation that the selected record is the controlled battle. Store that confirmation only in a private `MORIMENS_PRIVATE_CONTROLLED_PVE_ATTESTATION`, and promote the candidate with `tools/review_replay_session_capture.py`.

## 5. Freeze before revealing damage

Use `tools/freeze_blind_replay_prediction.mjs` with:

```text
--recorded-build pc-res151-build51
--build-evidence research/evidence/pc-res144-to-res151-combat-build.json
--build-evidence research/evidence/pc-res151-replay-adapter-compatibility.json
```

Commit and push the frozen prediction. Only then reveal the selected damage outcome and compare it through the review tools. Already viewed damage, a restarted process, an uncommitted baseline, PvP/mixed-domain routing or a missing controlled-battle attestation cannot receive holdout credit.
