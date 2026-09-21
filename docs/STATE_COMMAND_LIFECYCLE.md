# State trigger to command lifecycle

This source trace closes an architectural gap in the current Old Embers composition: a successful handler does not call its command rows directly. The recovered `BattleStateServer.Trigger`, `BEGenerateTargets`, and `BECreateSkillPhase` introduce additional guards and phase hooks. The row-only scheduler helper is not a complete state-triggered command executor.

## Trigger callback

The cached-command, unbanned, non-relic branch now has 12 original-runtime cases in `tools/state_callback_oracle.py`, compared with `engine/state-callback.mjs`. Owner/death/caster and judgment evaluation remain explicit adapters. The first command-construction branch is not tested. Effects are observed as requests, not executed. The helper rejects unsupported ban/relic contexts instead of silently ignoring them.

The runtime harness supplies the trigger index with lua_pushinteger. A floating-point 1 concatenates into a different configuration key in this Lua runtime; the initial harness consequently skipped the command lookup. Correcting the index type restored the expected original callback behavior. This is an adapter correction, not a change to the game's callback or calculator arithmetic.

`BattleStateServer.Trigger` rejects hidden owners, deleted states without ignoreDeleted, and dead non-card owners with NonWipe_ProhibitTrigger death handling. Banned states require an allowed trigger name. The configured command must exist, and a configured Judgement must return neither false/nil nor numeric zero.

The state caches a command instance per trigger index. Each activation clears parser member values and assigns the new triggerData. It then requests, in order:

1. `BEGenerateTargets`, with the cached command, configured target expression and resolved caster UID.
2. `BECreateSkillPhase`, with that command and this activation's triggerData.
3. `StateTriggerEnd`, with the state UID.

The shared cached command and queued effects must not be replaced by independently frozen input snapshots without testing repeated trigger ordering. The skill phase supplies its activation payload to TriggerCmd again; this matters when investigating potential reuse effects.

## Target and phase execution

`BEGenerateTargets.DoEffect` resolves the configured target expression, handles target selection/yield where applicable, and calls SetUpperTargets. Old Embers' StateOwner target is configured in State80575, but the general executor must not assume all state targets are immediate or deterministic.

`BECreateSkillPhase.DoEffect` clears the command's deleted flag, reads upper targets and the current battle time, and—unless skipPhase—requests skill timing and OnEnterBeforePhase. It then sends the non-awakener timeline, calls TriggerCmd with the activation's triggerData and skipPhase, and requests AfterCreateSkillPhase when state triggering is enabled.

After descendants drain, its AfterEffect calls OnEnterFinishPhase, ClearStats and SkillCmdFinish while the command remains undeleted, then runs resulting descendants. EffectEnd can advance battle time for roles requiring an after phase. These are additional behavioral dependencies, not cosmetic animation details that can all be omitted.

## Current implementation boundary

`enqueueOldEmbersCommand` models command-row and descendant ordering with explicit adapters. It does not yet execute this target-generation/phase lifecycle, generic command construction or all callback guards. Do not expose its output as complete encounter damage. Next integration work must preserve these guards and phase hooks, then compare the connected original command execution before attempting independent gameplay validation.

Newly recovered source files are `research/extracted/normalized/BEGenerateTargets.decompiled.lua` and `BECreateSkillPhase.decompiled.lua`. Their original copied bytecode hashes are recorded in the evidence registry. This document is a source-derived trace; no new original-runtime execution count or gameplay evidence is claimed.

## Finish-stage runtime checks

The finish stage now has a separate original-runtime oracle: `tools/skill_phase_finish_oracle.py`. Four sequences exercise pending children, a live command finishing, a second empty pass after cleanup, and an already-deleted command. It executes original `BECreateSkillPhase.AfterEffect` with original `BattleCmdServer.OnEnterFinishPhase`, `SetIsDeleted`, and `ClearStats`. Scheduler calls and the finish event are observations, not full implementations.

`OnEnterFinishPhase` marks the command deleted and clears the command object's `upperTargets` field. This is distinct from `cmdParser.upperTargets`, which SetUpperTargets/GetUpperTargets actually use. The parser list remains intact in the original cleanup test. `ClearStats` replaces statistics with an empty table before the finish event. The next empty pass chooses EffectEnd. `engine/skill-phase-finish.mjs` preserves that field distinction. Earlier wording that cleanup clears the selected target list was too broad.

## Start-stage and scheduler composition

StateOwner lookup now has five original parser cases: present state/owner, missing state, absent UID, numeric-zero UID and a state without an owner. The original returns the state's owner directly; a missing state logs an error and returns no raw targets. The target-expression constructor is an identity adapter in this oracle, so its filtering and later GenerateTargets behavior are not covered. `engine/state-owner-target.mjs` explicitly models only this raw lookup.

The oracle has since been extended through original `BattleCmdTargetsExp.GetTargetList` and `BattleCmdServer.SetUpperTargets/GetUpperTargets`. The expression constructor adapter now retains the targets field rather than returning the list directly. The original getter simply returns that field; the command setter/getter store/read it in cmdParser. No dead-target filter is added by these methods. Constructor InitGetter and the BEGenerateTargets effect body remain outside the runtime check. The previous identity-adapter limitation above describes the initial checkpoint.

Death eligibility is separate: `BattleEffectServer.CheckCondition` calls `__CheckDeadCondition` before generating targets. That routine considers ignoreDead, PVE/PVP, skill/state provenance and owner-player existence/death. Individual damage and HP effects additionally have their own target checks. Therefore target-list presence alone does not prove that a command row executes against that target.

The internal death predicate now matches 15 original-runtime cases in `tests/effect-death-condition.test.mjs`. PVE skill provenance checks caster.GetPlayer; state provenance checks state.owner.GetPlayer. Missing objects/players reject the respective branch. When both provenance flags apply, the skill check occurs first. PVP checks caster existence. ignoreDead returns true immediately inside this predicate, but the earlier TryDoEffect caster lookup still applies and is not bypassed by that flag.

A code-derived Old Embers scheduling test uses the recovered predicate for its live continuation callback. An intervening owner-player death stops subsequent rows unless ignoreDead is explicitly enabled; the earlier caster-presence requirement remains separate. The test does not reconstruct the actual owner's GetPlayer implementation or run a real death event, so it is not a complete encounter prediction.

`tools/skill_phase_start_oracle.py` now checks original DoEffect for all four explicit skipPhase/skipTimeline combinations. Command hooks are observed and target/trigger payload tokens verify forwarding. The base effect method and logging are stubbed; actual commands and events are not run. SkipPhase suppresses the before-phase timing/entry calls, but not TriggerCmd or the after-create hook invocation. The hook's own IsTriggerBST filter remains a separate responsibility.

`tools/trigger_cmd_oracle.py` separately executes original `TriggerCmd` through original `GenerateEffectList` in five bounded cases. It confirms ordinary action-index advancement, pre-command suppression, replacement of a stale effect list, argument update before row construction, skip-phase delay zeroing, and reuse of the same nil-defaulted or explicit trigger-data table across every child `PreTrigger` call. Generated effects are observers and do not run their real effect code.

`tools/connected_skill_phase_oracle.py` joins the original phase start to original `TriggerCmd` and `GenerateEffectList` in four cases. This closes the earlier call-boundary gap through child `PreTrigger`; target generation, the effect implementations themselves, listener dispatch and the finish stage remain separate boundaries.

`tools/command_effect_construction_oracle.py` connects original `GenerateEffectObj` to original `BattleEffectMgrServer.CreateEffect`. Four cases confirm API-type filtering, `BE` prefix routing, fixed-argument splitting, `onlyCreate` behavior and exact command/row identity in the generated configuration. The instantiated `BEProbe` is intentionally inert, so this does not execute a real damage or state effect.

`engine/skill-phase.mjs` implements this start stage and a non-yielding scheduler composition with the checked finish stage. Its composition test drains command descendants, after-create descendants and finish-event descendants before the end adapter runs. The original-runtime start is now connected through command-row construction and child `PreTrigger`, but real effect execution and listener descendants are still external. The caller also supplies target generation, eligibility and battle-time advancement. It is not yet connected to a complete Old Embers encounter or to the published website.
