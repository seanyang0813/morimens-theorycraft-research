# Replay action regression candidate

`tools/build_replay_action_candidate.mjs` converts one indexed `UseCard` boundary into the existing complete battle-property snapshot scenario. It reads the ignored local Skill, Cmd and MonsterConfig exports and writes JSON to standard output. It does not modify the replay index.

```powershell
node tools/build_replay_action_candidate.mjs research/observations/replay-index.json 0 > research/observations/action-0-candidate.json
```

The adapter derives the played card, its serialized owner and arguments, the same-camp player, the selected target UID, target BattleTag, active target states, skill tags, selected command and one Active-damage row. It uses the captured live property maps directly. The observed `BeHit` record is copied into a separate output field and is never read while constructing or calculating the scenario.

The first supported boundary is intentionally narrow: one Awakener-owned card, one enemy monster target, one unconditional ordinary `BEActiveDamage` row, one hit, no nonzero damage subtype, and no property/state/card/argument mutation between `UseCard` and `BeHit`. Only energy rows after the damage row may accompany it. Ambiguous ownership, targets, hits, command routing or configuration fail instead of selecting a convenient interpretation.

If critical chance depends on RNG, the result has status `PREOUTCOME_INPUT_REQUIRED` and no calculation. An optional third CLI argument accepts a 1-100 pre-outcome critical roll only when that roll was independently captured. The observed `isCrit` field is post-outcome evidence and is not accepted as a substitute.

Every output remains a retrospective regression candidate. A human must still review the action window for triggered or overlapping actions. An already viewed replay can never become a blind holdout, and no candidate is publication evidence until the observation audit accepts its provenance and comparison.
