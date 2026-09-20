# Higher-difficulty validation priority

Latest implementation: `engine/old-embers-hp.mjs` connects the explicit command selection to the HP-effect stage. `tools/hp_attribute_oracle.py` executes original BEChangeAttr plus original property mutation for10 cases, matched by `engine/hp-attribute-loss.mjs`. A zero-HP target skips the effect completely. An immune zero change on a living target invokes no HP property callbacks but still emits BEChangeAttrHp and calls the death-check hook. Negative actual delta emits HpDown first. On overkill, event castValue retains the capped request while deltaValue reflects actual loss.

This bridge passes raw signed loss into the effect before applying its HP cap; passing an already-capped fractional request through ceil a second time would be wrong. Synthetic integration checks cover odd half-trigger rounding, fractional limits, immunity, exclusions, zero HP and overkill. Later stack consumption remains a command plan: callbacks can intervene before it executes. Listener execution, committed stacks, death effects and statistics attribution remain unresolved; finalDamage stays null. No new gameplay prediction is claimed.

Per the user's instruction, higher-difficulty content takes priority over further work on the Normal baseline.

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

The selected record's boss-only, turn-one statistics attribute 2205 damage to 阿拉克涅's level-6 Strike and 6615 to Old Embers, totaling 8820. These are directly observed source/turn statistics, saved as `arachne-boss-turn1-sources.png` and `arachne-boss-rounds.png`. The exact 3:1 ratio supports the recovered extra-HP-change rule at aggregate scope. It does not establish the number of Strike hits, per-hit inputs, exact HP lost, or source ownership for every event. No model constants were fitted to these values and no full prediction has passed.

The replay's left triangle button is speed selection (`PVPReplayBattlePanel.OnChangeSpeed`), with a configured default and 3x option. The right pause button toggles `_isPause` and record-manager state. There is no single-step input in that panel's recovered bindings. Copy Recording exports a share code containing stage/record identity through `PVEBattleReplayUtils`; it is not a raw event-log export (`CopySettleBaseView._OnClickCopyBattleRecord`).

## Next tests

Arachne's [Fate Cut path](FATE_CUT.md) is now traced through its accumulated state, season/mutation branches and guarded Passive hit. This is particularly relevant to high-difficulty totals: accumulation, direct damage and Old Embers HP changes must remain separate events. The code/tooltip threshold discrepancy and temporary removal of target reductions/caps remain unverified in gameplay.

Capture one isolated Active hit while this resource is sufficient, one that exhausts it, and one after depletion. Compare direct hit numbers, resource consumption and precise HP change separately. Then test a Fixed/Passive event's half-sized trigger input. Preserve different high-difficulty records as holdouts before examining their individual damage outputs. Reconstruct character state and boss rules before interpreting million-scale aggregate totals.

## Live Old Embers command order

Cmd80572 and81060 each have eight rows. Rows1 and2 separately test remaining stacks against Arg1 and add marker80593 or80594. They are not encoded as a single if/else. Rows3/4 independently check marker80593 and exclusion states before HP loss and stack subtraction. Rows5/6 independently check marker80594 and exclusions before loss based on current80575 layers and complete removal of that state. Rows7/8 remove the markers.

BattleEffectServer.TryDoEffect runs CheckCondition and then GenParams for each effect. In the normal parsed-command path, current state is therefore observed separately at each row; explicit effectConfig.params is a separate override path. Existing ordinary child-first scheduling allows HP-event descendants between the HP row and stack row.

`engine/old-embers-steps.mjs` yields a live iterator. The caller must execute each effect and descendants before resuming. Code-derived tests cover normal fractional subtraction, depletion, an exclusion introduced after HP loss, stack replenishment before removal, and separately evaluated marker conditions. No original-runtime command or gameplay count is added. Target/caster/death eligibility and battle termination remain external.

The older oldEmbersCommand and resolveOldEmbersHp interfaces are snapshot diagnostics, assuming clear initial markers and no earlier intervening command-row changes. Their planned remainingStacks is not proof of committed post-event state.
