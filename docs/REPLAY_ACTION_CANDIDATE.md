# Replay action regression candidate

`tools/build_replay_action_candidate.mjs` converts one indexed `UseCard` boundary into the existing complete battle-property snapshot scenario. It reads the ignored local Skill, Cmd and MonsterConfig exports and writes JSON to standard output. It does not modify the replay index.

```powershell
node tools/build_replay_action_candidate.mjs research/observations/replay-index.json 0 > research/observations/action-0-candidate.json
```

The adapter derives the played card, its serialized owner and arguments, the same-camp player, the selected target UID, target BattleTag, active target states, skill tags, selected command and one Active-damage row. It uses the reconstructed damage-input property maps at the matched hit rather than the earlier card-use maps. This allows recorded BeforeUseCard and other pre-hit property/state changes to enter the formula without simulating or guessing them.

`BattleUnitBase:BeHit` mutates block and HP before it calls `BattleRecord:OnBeHit`. The chronological index therefore restores the target's damage-input HP from `beHitConfig.oldHp` and its block from the post-event property value plus `beHitConfig.blockLose`. Other role/card properties and active states use the latest values recorded before `BeHit`. Missing reconstruction fields mark the hit boundary incomplete.

The first supported boundary remains intentionally narrow: one Awakener-owned card, one enemy monster target, one unconditional ordinary `BEActiveDamage` row, one hit and no nonzero damage subtype. Only energy rows after the damage row may accompany it. Ambiguous ownership, targets, hits, command routing or configuration fail instead of selecting a convenient interpretation.

If critical chance depends on RNG, the result has status `PREOUTCOME_INPUT_REQUIRED` and no calculation. An optional third CLI argument accepts a 1-100 pre-outcome critical roll only when that roll was independently captured. The observed `isCrit` field is post-outcome evidence and is not accepted as a substitute.

The observed `BeHit` record is copied into a separate output field and is never read to construct the scenario. After the calculation exists, `comparison` reports predicted `preHitDamage` against `beHitConfig.castDamage`; this is the pre-shield incoming damage carried into `BeHit`, not HP lost. Every output remains a retrospective regression candidate. A human must still review the action window for triggered or overlapping actions. An already viewed replay can never become a blind holdout, and no candidate is publication evidence until the observation audit accepts its provenance and comparison.
