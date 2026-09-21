# Damage caps: per-hit limits versus phase counters

PC resource 144 / build 51. Recovered configuration and callback evidence, not a full state-machine runtime test or gameplay prediction.

The shared incoming-hit helper computes `min(incoming, max(0, be_damage_limit - be_damage_statics))` when be_damage_limit is positive. It does not increment be_damage_statics. The meaning of the two properties therefore depends on the states providing them; do not treat every cap as a universally consumed damage budget.

## Phase counter path

States 60409 and 60408 contribute a cap of ceil(max HP * 0.33). They listen to BSTHpChanged, accept only negative TriggerValue and pass its negation to commands 60406 and 60405 respectively.

BSTHpChanged.OnRoleHpChanged constructs TriggerValue as `eventData.newValue - eventData.oldValue`. This source is the actual HP-property delta, not incoming castDamage and not blockedDamage. The commands add that amount as layers of state 60407, whose ChangedLayer contribution updates be_damage_statics. Shield-absorbed damage does not become HP loss through this path.

The same commands reduce the phase-state layers, retaining a boundary layer of one, and perform configured transition actions when that boundary is reached. Those actions include an invincibility-related state, monster skill changes, removal of counter 60407 and removal/replacement of the phase state. State 60409's transition installs 60408 with ceil(max HP * 0.33) + 1 layers. The exact phase-state initial values and queued ordering still require the relevant monster setup and an event-execution trace.

The connected original-runtime probe now reaches the exact eight rows of command 60406 from an eligible `RoleHpChanged` event. It verifies row construction order and signed trigger-data preservation in both resource 144 and resource 150. Both installed resource-150 phase commands, 60406 and 60405, match the baseline row catalogs exactly.

A separate 450-case original-runtime oracle executes every compiled condition and parameter closure used by both commands. Across max HP, phase identity, phase layers, existing counter and HP-loss boundaries, the authored `resolvePhaseHpLoss` transition agrees exactly with those closures plus the separately recovered integer layer operations. This covers `LastConditionRet`, retention of one boundary layer, saturation of state 60407 at 999999999, the first-to-second phase layer expression and final phase removal. The actual installed resource-150 `FuncTable` also matches all 450 cases when paired with its current command rows. Python still iterates rows and applies the recovered mutations; the original effect constructors, bodies and state manager are not yet connected in this probe.

The transition tail now has a separate 48-case original-runtime connection. `BERemoveState.DoEffect` uses actual `BattleStateMgrServer.GetState/RemoveState`, ignores absent or deleted states, and reaches the live state's lifecycle boundary plus the manager removal event. `BEMonsterChangeSkill.DoEffect` forwards its configured skill ID and slot once per target. All three modules are byte-identical in the installed resource-150 client. State `LifeEnd`, property removal and the monster behavior component internals remain separate boundaries.

Since the listener is on HP change, other HP-changing effects may affect this counter when the same eligibility checks pass. Do not increment it from an aggregate attack statistic or assume that only Active hits contribute. The counter state caps its layers at 999999999; ordinary layer/property semantics still apply.

## Per-hit caps without this phase counter

State 131118 contributes both be_damage_limit and be_change_hp_limit at 3% of max HP. State 142072 contributes both at 5%. Neither state's configuration supplies be_damage_statics or the phase-counter callbacks above. Thus these configured effects are consistent with their per-event descriptions, not the phase-budget lifecycle. Other coexisting states or source assignments must still be checked.

States 118112, 118116 and 118117 use a supplied StateArg1 cap and an after-damage callback. Command 118310 removes the corresponding state when current HP is strictly below half max HP. Exactly half HP does not meet these command conditions. Their cap is not automatically reduced by every hit through the generic helper.

State 67251 supplies both a limit parameter and a ChangedLayer counter contribution while its maximum layer count is one. It is another reason not to infer a property's lifecycle from its name alone.

## Calculator implications

Keep the single-hit numerical helper pure: it receives the resolved limit and counter for that event. Between hits, execute the applicable state callbacks and transitions before resolving the next inputs. Preserve actual HP delta separately from incoming damage, capped request, shield loss and credited statistics. The current `engine/hit-limits.mjs` deliberately does not mutate a shared budget.

Source inventory: all State.json entries containing be_damage_statics in this extracted configuration are 60407 and 67251. This is a configuration inventory, not proof that no other Lua path can write the property. Sources: State 60407/60408/60409/67251/131118/142072/118112/118116/118117; Cmd 60405/60406/118310; BSTHpChanged.OnRoleHpChanged; BattleUnitBase.OnPropertyChange_Hp; BattleStateServer.InitProperty/UpdatePropertyWhenLayerChanges/RemoveProperty; BattleUnitUtil.ApplyIncomingDamageLimitsBeforeHpLoss.

Next verification needs actual state initialization, event order, phase transitions and independent high-difficulty observations. These findings do not add completed fixtures or change the publication gate.
