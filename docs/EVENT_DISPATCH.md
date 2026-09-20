# Listener dispatch and state eligibility

PC resource 144/build 51. This separates synchronous listener dispatch from the queued effect scheduler; both must be reproduced for multi-hit combat.

## Runtime-tested listener ordering

BattleEventMgr registers listeners in ascending numeric eventPriority. Ordinary registration goes after equal-priority listeners. RegisterEventToHead goes before equal-priority listeners but still after lower-priority listeners. BattleStateServer obtains its eventPriority from State.TriggerPriority; BattleStateTriggerServer copies that priority when constructed.

SendEvent shallow-clones the listener array using the original foundation Table.lua helper. The callback records retain identity. Registering a listener during dispatch therefore does not add it to that dispatch, while unregistering an upcoming listener marks its shared record deleted and skips it. Unregistering and registering the same callback/target makes a new record; the removed record stays skipped, and the new record waits until a subsequent dispatch.

`tools/event_dispatch_oracle.py` executes original registration, removal and dispatch methods with the original table.clone and synthetic callbacks. Five scenarios, each dispatched twice, establish ascending priority, stable ordinary ties, head insertion among ties, removal, addition and replacement during dispatch. `engine/event-dispatch.mjs` matches those traces in `tests/event-dispatch.test.mjs`. Callback-error continuation is translated from code but not part of these runtime cases. The subset does not implement the optional onEventCb hook, unregister-all helper, logging, scheduler or state eligibility.

## HP-listener eligibility and command creation (code trace only)

BSTHpChanged gets the target role from eventData.uid and checks TryTrigger with its camp and UID before forming triggerValue = newValue - oldValue. BattleStateTriggerServer.TryTrigger rejects deleted states. For a monster-owned state with a supplied role UID, it matches the owner's UID directly. Otherwise isEnemy chooses different-camp eligibility, or same-camp eligibility by default. A boss HP-change listener is therefore not triggered by arbitrary damage to another monster on the same camp.

BattleStateServer.Trigger additionally checks monster_hide, deletion, configured dead-owner behavior, banned-state rules and the configured Judgement. When eligible, it sets triggerData on the state command and queues BEGenerateTargets followed by BECreateSkillPhase. Those queued effects, rather than the HP listener directly, generate and execute the cap-counter commands. This code trace does not yet prove end-to-end phase-transition timing or supply a gameplay result.

Sources: BattleEventMgr.RegisterEvent/RegisterEventToHead/UnregisterEvent/SendEvent; foundation Table.clone; BattleStateServer constructor/Trigger; BattleStateTriggerServer constructor/TryTrigger/Trigger; BSTHpChanged.OnRoleHpChanged.
