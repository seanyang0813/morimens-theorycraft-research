# Next independent gameplay evidence

Computer use is authorized for Morimens. Use the user-designated player record when the service and approved native-window bridge are available, but keep the player UID out of committed artifacts. Existing Frenzy images were inspected offline; they do not provide a complete isolated hit. The before/after Old Embers values are594509 and552052, but intervening actions and overlapping labels prevent assigning their difference to one hit. Vulnerable shows50% at both duration2 and3, consistent with the duration rule at tooltip scope only.

The next capture should resolve one high-difficulty action before expanding coverage:

1. Establish the recorded combat build, or use a fresh controlled battle with known build. The viewing-client build alone does not prove the replay's formula version. The inspected native replay envelope exposes no client, engine, protocol, resource-manifest or build-version field; embedded resource rows establish data compatibility only.
2. Record difficulty, target identity, exact HP/shield and all relevant target states, particularly Old Embers, Vulnerable, immunity and caps. Abbreviated HP labels cannot validate integer HP loss.
3. Record the attacker/card identity and level, final ATK/STR/crit values, equipment/talents, realm mastery/Prism/Beacon, team amplification and any flat Strike buff immediately before the action. Resolve copied-card ownership and preceding pursuit/Wheel counters.
4. Select a deterministic isolated action. Confirm hit count and critical eligibility from evidence, not the desired output. Save the scenario, pre-action evidence and separate evidence showing the executing client build, then use the blind replay freezer with `--recorded-build pc-res150-build51 --build-evidence research/evidence/pc-res144-to-res150-combat-build.json` before inspecting the result. The current-build adapter requires complete live property maps and no active target states. The tool pins the scenario, runtime, prediction, build identity and evidence hashes and refuses overwrite.
5. Capture displayed hit damage, statistics attribution, exact HP change and resource change separately. A match in one does not establish the others. Account for queued effects finishing after pause.
6. Reconstruct a regression observation first. Reserve a new unseen result as a holdout; the already viewed replay outcomes cannot become blind holdouts retrospectively.

The native replay path has preserved 43 real server replays. The 42 unique batch records contain 17,554 records, 437,942 events, 3,341 complete card-use boundaries and 5,954 hits; the latest 28 records are D-Tide waves. Preserve original bytes first, decode with `tools/decode_battle_replay.py --json-encoding latin1 --encoding latin1`, then build a chronological evidence index with `tools/index_decoded_replay.py`. Both outputs belong under ignored `research/observations/`. Review triggered or overlapping actions before treating a window as one execution; one Mouchette window contains two three-hit executions sharing the same card/skill identity.

The exact client-side lookup and download dependency is in `docs/REPLAY_ACQUISITION_PATH.md`: CopyReview facade → record-ID queue → recent-record metadata → battle UUID → OSS metadata → replay container. Do not treat a player UID as a battle UUID or guess object names.

If the interface cannot expose a necessary value, leave that record incomplete and select another controlled action or source. Do not fit unknown modifiers to a displayed total.

Separate pending friend-scenario input: final team Realm Mastery. This is not permission to substitute the Frenzy record's Lv80 character stats for the approved Lv90 example.
