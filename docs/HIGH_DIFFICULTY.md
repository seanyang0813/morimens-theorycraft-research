# Higher-difficulty validation priority

Latest implementation: `engine/old-embers-hp.mjs` connects the explicit command selection to the HP-effect stage. `tools/hp_attribute_oracle.py` executes original BEChangeAttr plus original property mutation for10 cases, matched by `engine/hp-attribute-loss.mjs`. A zero-HP target skips the effect completely. An immune zero change on a living target invokes no HP property callbacks but still emits BEChangeAttrHp and calls the death-check hook. Negative actual delta emits HpDown first. On overkill, event castValue retains the capped request while deltaValue reflects actual loss.

This bridge passes raw signed loss into the effect before applying its HP cap; passing an already-capped fractional request through ceil a second time would be wrong. Synthetic integration checks cover odd half-trigger rounding, fractional limits, immunity, exclusions, zero HP and overkill. Later stack consumption remains a command plan: callbacks can intervene before it executes. Listener execution, committed stacks, death effects and statistics attribution remain unresolved; finalDamage stays null. No new gameplay prediction is claimed.

Per the user's instruction, higher-difficulty content takes priority over further work on the Normal baseline.

## Ghost-faced dog phase transition

At the 66% phase boundary, command 60406 changes the monster's intent to skill 60397 using change type `Insert`. Original-runtime tests show that this updates the displayed/current intent and queues an idle prior intent; it does not execute skill 60397 inside the HP-change callback.

When skill 60397 (“Final Evolution”) later executes, its exact command 60401 applies 20 layers of permanent Reinforce state 60089, applies `ceil(ATK × 0.08)` layers of Strength state 2900, records a `BEMonsterBubble` row, and installs listener state 60404. The original `BEMonsterBubble.DoEffect` body has now been executed over six eligibility/default cases: after its superclass call it only validates the tip and Monster target, then calls `recordMgr:OnMonsterBubble`; it does not mutate combat state in that body. This is baseline runtime evidence, not a resource-150 runtime claim. The listener responds only to a later `BSTHpChanged` event whose signed `TriggerValue` is negative. Command 60402 then adds two layers of temporary Reinforce state 60083. This is tied to actual HP decrease events rather than every attempted or fully blocked hit.

Permanent Reinforce 60089 clears before battle end. Temporary Reinforce 60083 caps at 99 and clears before the next bout begins or before battle end. Both subtract their layer count from Active, Fixed and Passive received-damage properties; Strength adds its layer count to `damage_plus` and half that amount to `tentacle_dmg`. These seven selected Skill/Cmd/State rows match resource 144 and installed resource 150 exactly after excluding `BaseSortID` metadata. The trace is published in `research/evidence/final-evolution-mechanic.json`. Full command scheduling, the bubble row, clear-event execution and independent gameplay remain outside this result.

## Selected record

融灾禁区 / 星辰篇 / wave 1 / 癫狂 (Frenzy), recommended level 92, boss preview level 95. Record: Banana, displayed 2026/9/20 3:22. Team: 茉夏 level 80, 阿拉克涅 level 80, 蚀灭·萝珀 level 64, 奥尔拉 level 60. Twelve total turns, six boss turns; record summary peak turn damage 4,896,613 and peak STR 680. These maxima are aggregate observations, not a single damage fixture.

Private screenshots: `research/observations/replay-002-frenzy/record.png`, `opening.png`. Opening replay displayed boss 食尸鬼卫队长, HP abbreviated `13980K` and application `+699022 旧日余烬`. Do not convert the abbreviated HP label into an exact integer fixture. The original replay build still needs confirmation.

## Boss-specific issue already identified

MonsterConfig 94716 identifies 食尸鬼卫队长 and initializes state 80787 using `CmdCaster.max_hp*0.05`. State 80787 triggers Cmd 80573 at battle start and after turn end, replenishing state 80575 when below the stored amount. This is code/data evidence for a per-turn resource, not a general damage-taken percentage.

State 80575 (旧日余烬) responds to Active or Tentacle hits with `TriggerValue`, and Passive/Fixed hits with `TriggerValue*0.5`. Commands 80572 and 81060 select either that argument or the remaining stack amount, request a separate HP attribute change of negative three times that selected value, and reduce/remove stacks. Both check exclusion states 66314 and 62317. These are permanent and turn-expiring monster damage-immunity states respectively; their presence suppresses both the extra HP-change command and resource consumption.

`BESubStateLayer.DoEffect` removes `ceil(abs(amount))` stacks. `BEChangeAttr.DoEffect` first applies `ceil` to the signed HP change. Thus an argument of 1.5 with enough remaining resource requests -4 HP and removes 2 stacks, not -6 HP. This is an arithmetic example from recovered code, not a gameplay observation. The HP-change effect skips a target already at zero HP, zeroes loss when `immue_change_hp > 0`, and caps it when `be_change_hp_limit > 0`. It then updates the HP property, emits HP-down/attribute-change events and checks death. Stack consumption is a later command and is not automatically cancelled by these effect-level HP limits.

The unsuffixed trigger conditions use `castDamage`, populated by `BattleUnitBase.BeHit` from `attackConfig.damageVal` before shield/immunity resolution. Active/Passive triggers only select unblocked or real damage when their corresponding suffix is present. Tentacle and Fixed handlers also pass incoming `castDamage`. Thus the Old Embers trigger amount is not actual HP lost. The internal enum `Pure` is distinct from `Passive`; localized trigger names are insufficient to merge these paths.

`BattleStatsMgr.OnDoDamage` records incoming `castDamage` separately from `realDamage`. Its HP-attribute-change handler uses the absolute negative `castValue`, not `deltaValue`; ownership and command attribution determine what reaches player totals. Property-level HP floors can therefore make credited/requested loss differ from actual loss. This is not yet a reconstruction of the selected replay's displayed total.

`engine/old-embers.mjs` exposes a separate experimental command plan from explicit event/category/state inputs. It covers resource selection, distinct rounding, exclusions, HP-zero skip and effect-level HP limits. It deliberately returns no final damage or post-callback HP. Its diagnostic tests are hand-specified code-derived cases, not original-runtime comparisons or gameplay observations. Property callbacks, death handling, attribution and actual high-difficulty observations still need completing before this mechanic is supported end to end.

Additional private observation `boss-state-before.png` records the exact Old Embers tooltip value 677805, with Vulnerable duration 1 (50%), STR 76 and abbreviated boss HP `13895K`. The state alone does not establish one isolated hit or exact HP loss, so it is not counted as a completed fixture.

Consequently, displayed attack damage, statistics totals and boss HP change must be recorded separately. Treating the extra HP change as another generic Final DMG multiplier would produce the wrong model, especially when the resource is nearly depleted or the damage category changes.

## Gameplay consistency check, not a completed prediction

The selected record's boss-only, turn-one statistics attribute 2205 damage to 阿拉克涅's level-6 Strike and 6615 to Old Embers, totaling 8820. These are directly observed source/turn statistics, saved as `arachne-boss-turn1-sources.png` and `arachne-boss-rounds.png`; `turn1-boss-680010.png` independently shows sufficient Old Embers resource. Client statistics source confirms that direct source rows receive `castDamage`, while the HP-change source receives the absolute post-limit request. `tools/replay_mechanic_observation.mjs` now replays the recovered Active-trigger rule and returns exactly 6615 with zero difference. This is a retrospective downstream-mechanic regression: eligibility and limits are resolved after seeing the Old Embers source, and the recorded combat build is still unknown. It does not predict the 2205 Strike value, establish actual HP lost, reconstruct the full action, or qualify as a blind holdout.

The replay's left triangle button is speed selection (`PVPReplayBattlePanel.OnChangeSpeed`), with a configured default and 3x option. The right pause button toggles `_isPause` and record-manager state. There is no single-step input in that panel's recovered bindings. Copy Recording exports a share code containing stage/record identity through `PVEBattleReplayUtils`; it is not a raw event-log export (`CopySettleBaseView._OnClickCopyBattleRecord`).

## Next tests

Arachne's [Fate Cut path](FATE_CUT.md) is now traced through its accumulated state, season/mutation branches and guarded Passive hit. This is particularly relevant to high-difficulty totals: accumulation, direct damage and Old Embers HP changes must remain separate events. The code/tooltip threshold discrepancy and temporary removal of target reductions/caps remain unverified in gameplay.

Capture one isolated Active hit while this resource is sufficient, one that exhausts it, and one after depletion. Compare direct hit numbers, resource consumption and precise HP change separately. Then test a Fixed/Passive event's half-sized trigger input. Preserve different high-difficulty records as holdouts before examining their individual damage outputs. Reconstruct character state and boss rules before interpreting million-scale aggregate totals.

## Native replay batch

Eleven authorized server replay containers are now preserved privately. The first selected Frenzy replay contains the Lv70 Mouchette case; its indexed action reproduces 751 noncritical and 2,028 critical `castDamage` branches exactly. Ten additional records from the same selected profile add 86,317 events and 900 hits. The strict adapter finds 178 supported Active-hit candidates: all 122 deterministic calculations match exactly with zero mismatches, and all 56 chance-dependent cases match one independently evaluated roll-1 or roll-100 branch. Thirteen branch cases occur in two other records with the same stage ID as the Mouchette case. Every candidate routes through Skill, Cmd, MonsterConfig and AwakerConfig rows embedded in its own replay. The selected Mouchette rows are behavior-identical to current client rows after normalizing Lua lists and excluding `BaseSortID` ordering metadata, and both sources produce identical scenarios. This is substantially stronger than matching screen totals because every candidate uses serialized pre-hit property/state maps, card identity, skill arguments, target state and replay-native data. It still receives no publication or holdout credit: outcomes were recovered before calculation, predictions were not frozen before a separate reveal, original critical draws were not captured, and the replay payloads contain no explicit engine-code version.

## Live Old Embers command order

Cmd80572 and81060 each have eight rows. Rows1 and2 separately test remaining stacks against Arg1 and add marker80593 or80594. They are not encoded as a single if/else. Rows3/4 independently check marker80593 and exclusion states before HP loss and stack subtraction. Rows5/6 independently check marker80594 and exclusions before loss based on current80575 layers and complete removal of that state. Rows7/8 remove the markers.

BattleEffectServer.TryDoEffect runs CheckCondition and then GenParams for each effect. In the normal parsed-command path, current state is therefore observed separately at each row; explicit effectConfig.params is a separate override path. Existing ordinary child-first scheduling allows HP-event descendants between the HP row and stack row.

`engine/old-embers-steps.mjs` yields a live iterator. The caller must execute each effect and descendants before resuming. Code-derived tests cover normal fractional subtraction, depletion, an exclusion introduced after HP loss, stack replenishment before removal, and separately evaluated marker conditions. No original-runtime command or gameplay count is added. Target/caster/death eligibility and battle termination remain external.

The older oldEmbersCommand and resolveOldEmbersHp interfaces are snapshot diagnostics, assuming clear initial markers and no earlier intervening command-row changes. Their planned remainingStacks is not proof of committed post-event state.
