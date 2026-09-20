# Replay action regression candidate

`tools/build_replay_action_candidate.mjs` converts one indexed `UseCard` boundary into the existing complete battle-property snapshot scenario. It reads the ignored local Skill, Cmd and MonsterConfig exports and writes JSON to standard output. It does not modify the replay index.

```powershell
node tools/build_replay_action_candidate.mjs research/observations/replay-index.json 0 > research/observations/action-0-candidate.json
```

The adapter derives the played card, its serialized owner and arguments, the same-camp player, hit target UID, target BattleTag, active states, skill tags, selected command and one eligible Active-damage row. It uses the reconstructed damage-input property maps at the matched hit rather than the earlier card-use maps. This allows recorded BeforeUseCard and other pre-hit property/state changes to enter the formula without simulating or guessing them.

Conditional row selection and numeric parameters may read captured `CmdCaster`, `PlayerRole`, `UpperTarget`, `OwnerCard`, or `CurCard` state layers, Awakener potency/breakthrough, their live property maps, and `math.ceil`/`math.floor`. Lua-style comparison, `not`, `and`, and `or` are accepted inside numeric parameters while the final value must remain finite and numeric. Every ordinary Active row is evaluated and exactly one must be eligible. Unresolved functions or variables fail. The output retains the condition trace and chosen row. `UpperTarget` requires a matching recorded target-selection command; automatic `FrontEnemy`, `RandomEnemy`, and `AllEnemy` selectors use the matched hit target as retrospective identity evidence. `MaxHpEnemy`, `MinHpEnemy`, `MaxHpAndBlockEnemy`, and `MinHpAndBlockEnemy` are reconstructed from all captured living enemies and must select the recorded target under the original first-in-registry tie behavior.

`IsSuperUtlSkill()` is resolved from the captured caster properties. The adapter follows the client rule that a positive `ulti_skill_level_up` forces Super Ultimate; otherwise `doubleUltiEnergy` must be true and current `ulti_energy` must meet the rounded maximum derived from `ulti_energy_max`, its percentage/flat cost modifiers, and `ulti_energy_max_per`. The derived maximum, inputs, and decision are retained in `superUltimateResolution` for review.

`BattleUnitBase:BeHit` mutates block and HP before it calls `BattleRecord:OnBeHit`. The chronological index therefore restores the target's damage-input HP from `beHitConfig.oldHp` and its block from the post-event property value plus `beHitConfig.blockLose`. Other role/card properties and active states use the latest values recorded before `BeHit`. Missing reconstruction fields mark the hit boundary incomplete.

The supported boundary remains intentionally narrow: one Awakener-owned card, one enemy monster target, exactly one eligible ordinary `BEActiveDamage` row, one hit and no nonzero damage subtype. Other command rows may be present because their recorded effects are already reflected in the damage-input snapshot, but any competing damage effect is rejected. `PerformTarget` is accepted only for the inspected `CmdTarget` and `EnemyFieldCenter` presentation paths; it does not replace the effect's combat `Target`. Ambiguous ownership, targets, hits, command routing or configuration fail instead of selecting a convenient interpretation.

If critical chance depends on RNG, the result has status `PREOUTCOME_INPUT_REQUIRED` and no calculation. An optional third CLI argument accepts a 1-100 pre-outcome critical roll only when that roll was independently captured. The observed `isCrit` field is post-outcome evidence and is not accepted as a substitute.

The observed `BeHit` record is copied into a separate output field and is never read to construct the scenario. After the calculation exists, `comparison` reports predicted `preHitDamage` against `beHitConfig.castDamage`; this is the pre-shield incoming damage carried into `BeHit`, not HP lost. Every output remains a retrospective regression candidate. A human must still review the action window for triggered or overlapping actions. An already viewed replay can never become a blind holdout, and no candidate is publication evidence until the observation audit accepts its provenance and comparison.

## Static command coverage

`node tools/audit_replay_candidate_rows.mjs` regenerates the source-hashed `research/evidence/replay-candidate-row-audit.json`. It first follows Skill-to-Cmd links for skills with an Awakener owner and one of the adapter's supported tags. The current export has 627 such skills linked to 531 commands. Of the 198 linked commands containing ordinary Active damage, 182 pass all static command-shape checks. There are 246 ordinary Active rows, including 67 conditional rows, and 226 have compatible individual syntax. The audit retains every remaining blocker count.

These numbers do not mean 182 commands are executable or accurate. The audit does not know runtime variables, which conditions pass, actual hit count, target identity, property completeness, critical RNG, triggers or gameplay outcomes. It only measures whether a future complete replay boundary could reach the adapter without a known static row-shape blocker.
