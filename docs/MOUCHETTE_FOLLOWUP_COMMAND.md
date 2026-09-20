# Dramatic Encounter command identity and trigger eligibility

PC resource 144 / build 51. Recovered code/data chain; not a fully executed battle or gameplay fixture.

## Two different flags

`BattleCmdServer.IsStateTriggerAdd()` returns `cmdCtorData.isTrigger`. `BattleStateServer` sets this flag when constructing a state-trigger command. This flag suppresses selected card modifiers in the damage preparation and target helper, as covered by the existing synthetic tests.

Mouchette's state-trigger command 123160 does not directly contain the follow-up damage. It invokes `BEAttachPostAction` with `123159,1,0,1`: skill 123159, one execution, isTriggerBST false and performance enabled. The effect builds a separate `attachPostParam` object. The flag controlling battle-state-trigger events is therefore distinct from the damage-preparation `isTrigger` flag.

For an Awakener attached card, `BEAttachPostAction.__DoMultiEffect` calls `BattleUnitBase.UseAttachPostCard`. That creates a new NoneDeck card with skill ID, level, camp and explicit owner. The card's `InitCmdServer` constructs fresh command data including its own card UID, skill ID, level and owner as caster. It does not copy the parent's `isTrigger` flag. `UseAttachPostCard` then assigns `attachPostParam` to the new command.

## Consequences for the calculation

The traced ordinary Dramatic Encounter path has a card instance; the no-card adapter is not the appropriate complete preparation model. Skill 123159 is Strike-tagged, which satisfies CardTypeInstruction through `BattleCardServer.CardTypeMatch`. Thus instruction-card caster properties, the caster prism property `card_damage_per3_n2`, and other eligible card properties can participate. The actual new card's properties still require construction/restoration evidence; eligibility does not prove a nonzero value.

The follow-up command's `IsStateTriggerAdd()` is not true merely because its ancestor was a passive state trigger. Do not indiscriminately zero its card/prism factors. This also supports keeping the follow-up's card/Strike crit contributions eligible, with actual property amounts resolved separately.

## Why it does not advance its own two-Strike listener

`BattleCmdServer.IsTriggerBST()` returns true for ordinary commands, but returns `attachPostParam.isTriggerBST` for attached actions. `BEAfterUseCard.__FireAfterUseCard` returns without emitting AfterUseCard when the effect's IsTriggerBST is false. `BattleEffectServer.IsTriggerBST` can obtain the card's command from effectConfig.cardUid when the effect has no direct cmdServer reference. Thus the after-card effect in UseAttachPostCard can still honor the follow-up's false flag.

`BEAfterUseCard` separately emits AfterAttachPostAction for an attached card. Suppressing AfterUseCard does not mean that all callbacks, damage events or attached-action effects are suppressed. The ordinary follow-up does not add another qualifying played Strike through this AfterUseCard route. Exact effect-queue interleaving and other callbacks remain unverified.

## Sources and implications

Sources: State trigger construction in BattleStateServer; Cmd 123160 and 123163; Skill 123159; BEAttachPostAction.PreTrigger/DoEffect/__DoMultiEffect; BattleUnitBase.UseAttachPostCard; BattleCardServer.InitCmdServer/CardTypeMatch/IsFromAttachPost; BattleConst.CardTypeInstruction; BattleCmdServer.IsStateTriggerAdd/IsTriggerBST/IsAttachPost; BattleEffectServer.IsTriggerBST; BEAfterUseCard.__FireAfterUseCard/__SendAfterAttachPostAction.

This resolves two previously explicit scenario assumptions at code-evidence scope: the separation between parent state triggers and follow-up card modifiers, and suppression of recursive played-card counting. It does not resolve the user's pending skill, Enlighten, target and crit-interpretation choices, nor does it add any real gameplay validation or justify publishing a final total.
