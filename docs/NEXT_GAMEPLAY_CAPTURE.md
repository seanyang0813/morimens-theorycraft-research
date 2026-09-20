# Next independent gameplay evidence

Do not reopen the game or use the desktop until the user's computer-use restriction is lifted. Existing Frenzy images were inspected offline; they do not provide a complete isolated hit. The before/after Old Embers values are594509 and552052, but intervening actions and overlapping labels prevent assigning their difference to one hit. Vulnerable shows50% at both duration2 and3, consistent with the duration rule at tooltip scope only.

The next capture should resolve one high-difficulty action before expanding coverage:

1. Establish the recorded combat build, or use a fresh controlled battle with known build. The viewing-client build alone does not prove the replay's formula version.
2. Record difficulty, target identity, exact HP/shield and all relevant target states, particularly Old Embers, Vulnerable, immunity and caps. Abbreviated HP labels cannot validate integer HP loss.
3. Record the attacker/card identity and level, final ATK/STR/crit values, equipment/talents, realm mastery/Prism/Beacon, team amplification and any flat Strike buff immediately before the action. Resolve copied-card ownership and preceding pursuit/Wheel counters.
4. Select a deterministic isolated action. Confirm hit count and critical eligibility from evidence, not the desired output. Save the scenario and pre-action evidence, then run `tools/freeze_gameplay_prediction.mjs` before inspecting the result. The tool pins the scenario, runtime, prediction and evidence hashes and refuses overwrite.
5. Capture displayed hit damage, statistics attribution, exact HP change and resource change separately. A match in one does not establish the others. Account for queued effects finishing after pause.
6. Reconstruct a regression observation first. Reserve a new unseen result as a holdout; the already viewed replay outcomes cannot become blind holdouts retrospectively.

If the game provides an explicit replay export, preserve its original bytes first. Decode it with `tools/decode_battle_replay.py`, then build a chronological evidence index with `tools/index_decoded_replay.py`. Both outputs belong under ignored `research/observations/`. The native-codec path avoids manually reading thousands of property/state changes from the interface, but it remains unvalidated on a real server replay until an export is supplied.

If the interface cannot expose a necessary value, leave that record incomplete and select another controlled action or source. Do not fit unknown modifiers to a displayed total.

Separate pending friend-scenario input: final team Realm Mastery. This is not permission to substitute the Frenzy record's Lv80 character stats for the approved Lv90 example.
