# Connected event delivery boundary

The runtime harness now connects `BattleEngine.CreateEventEffect` to `BattleEffectMgrServer.CreateEffect`, `BESendEvent`, and `BattleEventMgr.SendEvent` in one Lua state. This closes the earlier gap between observing an event request and proving that the event payload reaches registered listeners.

Four cases cover automatic-operation defaulting and explicit false/true preservation. Every listener receives the same Lua payload table passed to `CreateEventEffect`. Ordinary listeners run by ascending numeric priority; head registration precedes an ordinary registration at the same priority. The send effect passes eligibility, executes once, and reaches effect completion.

Resource 150 uses its installed `BattleEngine` and `BattleConst` bytecode. The effect manager, base effect, send effect, event constants, event manager, and shallow table-clone helper are byte-identical to the resource-144 checkpoint, and all four connected fixtures match exactly.

The harness supplies time, UID, battle-finish, and an inert root-effect boundary. It does not execute effects created by listeners, state-trigger eligibility, damage, a complete battle loop, gameplay, or a holdout. This is shared engine evidence only. Budget scouting, cheese analysis, theorycrafting, and verification must interpret it within their own claim boundaries.
