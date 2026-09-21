# Listener dispatch and state eligibility

PC resources 144 and 150/build 51. Synchronous listener dispatch is now connected to event-effect construction and execution; listener-generated effects and full multi-hit scheduling remain separate work.

## Runtime-tested listener ordering

BattleEventMgr registers listeners in ascending numeric eventPriority. Ordinary registration goes after equal-priority listeners. RegisterEventToHead goes before equal-priority listeners but still after lower-priority listeners. BattleStateServer obtains its eventPriority from State.TriggerPriority; BattleStateTriggerServer copies that priority when constructed.

SendEvent shallow-clones the listener array using the original foundation Table.lua helper. The callback records retain identity. Registering a listener during dispatch therefore does not add it to that dispatch, while unregistering an upcoming listener marks its shared record deleted and skips it. Unregistering and registering the same callback/target makes a new record; the removed record stays skipped, and the new record waits until a subsequent dispatch.

`tools/event_dispatch_oracle.py` executes original registration, removal and dispatch methods with the original table.clone and synthetic callbacks. Five scenarios, each dispatched twice, establish ascending priority, stable ordinary ties, head insertion among ties, removal, addition and replacement during dispatch. `engine/event-dispatch.mjs` matches those traces in `tests/event-dispatch.test.mjs`. Callback-error continuation is translated from code but not part of these runtime cases. The subset does not implement the optional onEventCb hook, unregister-all helper, logging, scheduler or state eligibility.

`tools/connected_event_listener_oracle.py` connects the original `BattleEngine.CreateEventEffect` request to original effect-manager construction, `BESendEvent` execution/completion and listener callbacks. Four cases prove payload-table identity, automatic-operation defaulting, explicit flag preservation and priority order through the connected path. Resource 150 reruns its changed `BattleEngine` against effect, dispatcher and clone modules proven byte-identical to resource 144; all four cases match. The harness uses explicit time, UID, battle-state and inert-root adapters. See `CONNECTED_EVENT_DELIVERY.md`.

## Runtime-tested HP-listener eligibility; command creation traced from code

BSTHpChanged gets the target role from eventData.uid and checks TryTrigger with its camp and UID before forming triggerValue = newValue - oldValue. BattleStateTriggerServer.TryTrigger rejects deleted states. For a monster-owned state with a supplied role UID, it matches the owner's UID directly. Otherwise isEnemy chooses different-camp eligibility, or same-camp eligibility by default. Five connected runtime cases now exercise these branches through real event registration and dispatch. A boss HP-change listener is therefore not triggered by arbitrary damage to another monster on the same camp.

The runtime boundary now enters the cached-command branch of `BattleStateServer.Trigger`. Four cases cover accepted monster/player callbacks, hidden-owner rejection and mismatched-monster rejection. An accepted callback sets triggerData on the state command and constructs BEGenerateTargets followed by BECreateSkillPhase and StateTriggerEnd. The generated effects do not execute in this connected harness; ban, Judgement and new-command construction remain covered only by separate component evidence. End-to-end phase-transition timing and gameplay remain unproven.

Sources: BattleEventMgr.RegisterEvent/RegisterEventToHead/UnregisterEvent/SendEvent; foundation Table.clone; BattleStateServer constructor/Trigger; BattleStateTriggerServer constructor/TryTrigger/Trigger; BSTHpChanged.OnRoleHpChanged.
