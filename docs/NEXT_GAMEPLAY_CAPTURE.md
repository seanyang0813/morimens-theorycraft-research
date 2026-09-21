# Next independent gameplay evidence

Computer use is authorized for Morimens. Use the user-designated player record when the service and approved native-window bridge are available, but keep the player UID out of committed artifacts. Existing Frenzy images were inspected offline; they do not provide a complete isolated hit. The before/after Old Embers values are594509 and552052, but intervening actions and overlapping labels prevent assigning their difference to one hit. Vulnerable shows50% at both duration2 and3, consistent with the duration rule at tooltip scope only.

The next capture should resolve one high-difficulty action before expanding coverage:

1. Establish the recorded combat build, or use a fresh controlled battle with known build. The viewing-client build alone does not prove the replay's formula version.
2. Record difficulty, target identity, exact HP/shield and all relevant target states, particularly Old Embers, Vulnerable, immunity and caps. Abbreviated HP labels cannot validate integer HP loss.
3. Record the attacker/card identity and level, final ATK/STR/crit values, equipment/talents, realm mastery/Prism/Beacon, team amplification and any flat Strike buff immediately before the action. Resolve copied-card ownership and preceding pursuit/Wheel counters.
4. Select a deterministic isolated action. Confirm hit count and critical eligibility from evidence, not the desired output. Save the scenario and pre-action evidence, then run `tools/freeze_gameplay_prediction.mjs` before inspecting the result. The tool pins the scenario, runtime, prediction and evidence hashes and refuses overwrite.
5. Capture displayed hit damage, statistics attribution, exact HP change and resource change separately. A match in one does not establish the others. Account for queued effects finishing after pause.
6. Reconstruct a regression observation first. Reserve a new unseen result as a holdout; the already viewed replay outcomes cannot become blind holdouts retrospectively.

The native replay path is now exercised on seven real server replays. Preserve original bytes first, decode with `tools/decode_battle_replay.py --json-encoding latin1 --encoding latin1`, then build a chronological evidence index with `tools/index_decoded_replay.py`. Both outputs belong under ignored `research/observations/`. The first sample produced 165 records, 4,046 events, 32 complete card-use boundaries and 68 hit records. Six additional selected-profile records add 1,647 records, 44,532 events, 303 card uses and 432 hits. Review triggered or overlapping actions before treating a window as one execution; one Mouchette window contains two three-hit executions sharing the same card/skill identity.

The exact client-side lookup and download dependency is in `docs/REPLAY_ACQUISITION_PATH.md`: CopyReview facade → record-ID queue → recent-record metadata → battle UUID → OSS metadata → replay container. Do not treat a player UID as a battle UUID or guess object names.

If the interface cannot expose a necessary value, leave that record incomplete and select another controlled action or source. Do not fit unknown modifiers to a displayed total.

Separate pending friend-scenario input: final team Realm Mastery. This is not permission to substitute the Frenzy record's Lv80 character stats for the approved Lv90 example.
