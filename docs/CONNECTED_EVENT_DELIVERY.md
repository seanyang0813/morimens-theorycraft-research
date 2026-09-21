# Connected event delivery boundary

The runtime harness now connects `BattleEngine.CreateEventEffect` to `BattleEffectMgrServer.CreateEffect`, `BESendEvent`, and `BattleEventMgr.SendEvent` in one Lua state. This closes the earlier gap between observing an event request and proving that the event payload reaches registered listeners.

Four cases cover automatic-operation defaulting and explicit false/true preservation. Every listener receives the same Lua payload table passed to `CreateEventEffect`. Ordinary listeners run by ascending numeric priority; head registration precedes an ordinary registration at the same priority. The send effect passes eligibility, executes once, and reaches effect completion.

Resource 150 uses its installed `BattleEngine` and `BattleConst` bytecode. The effect manager, base effect, send effect, event constants, event manager, and shallow table-clone helper are byte-identical to the resource-144 checkpoint, and all four connected fixtures match exactly.

The next connected boundary uses the real `RoleHpChanged` registration and runs `BSTHpChanged.OnRoleHpChanged`, `BattleStateTriggerServer.TryTrigger`, and `Trigger`. Five cases confirm that a monster-owned listener accepts only its own UID, deleted states reject the event, player-owned ally/enemy rules use camp matching, `triggerValue` is the signed `newValue - oldValue` HP delta, and the caster object is preserved as the associator. Resource 150 matches all five cases; both listener modules are byte-identical across the builds.

Four further cases invoke the cached-command branch of the real `BattleStateServer.Trigger`. Accepted monster and player events construct `BEGenerateTargets` followed by `BECreateSkillPhase`, preserve the trigger delta and caster association in the phase payload, then construct `StateTriggerEnd`. A hidden owner stops inside the state callback, while another monster's HP event stops at listener eligibility. Resource 150 matches all four cases exactly.

The harness supplies time, UID, battle-finish, roles, state metadata, a cached command, and an inert root-effect boundary. It constructs but does not execute the generated target/phase effects or completion event. It also does not cover a complete damage-to-listener battle loop, gameplay, or a holdout. This is shared engine evidence only. Budget scouting, cheese analysis, theorycrafting, and verification must interpret it within their own claim boundaries.
