# Events after a damage hit

The reconstructed `engine/damage-events.mjs` follows original PC 144 `BattleUnitBase.DoDamageEvent`. It is a separate callback-driven routine, not yet attached to the public damage API. The caller must supply real scheduling and state/death behavior before this becomes a multi-hit simulator.

If the battle is already finished, the routine does nothing. Otherwise a prevented hit requests `DoPreventedActiveDamage` and `PreventBeActiveDamage` first. Active, Passive, Fixed and Pure request `DoDamage`; Tentacle instead requests `TentacleAttack`, `AttackedByTentacle` and `DoTentacleDamage`. All request `BeDamage`, followed by `PVPDeathResist` when flagged.

Next comes `CheckDeathEvent`, carrying caster, command, reason and the same mutable damage payload. Only afterward does the original read current HP. If HP is still nonpositive, it can request category-specific Active/Fixed kill events, a critical kill event, and a Passive fightback kill event when the original fightback predicate applies. A controlled revival in the death adapter suppresses those kill events. A captured pre-check HP value would model this incorrectly.

That controlled synchronous revival is an adapter probe, not the ordinary scheduling guarantee. The actual `CheckDeathEvent` guards eligibility, positive HP and already-dead status, then creates `BERoleDeadlyDamage` followed by `BERoleDie`. It does not re-check HP between these creation calls. In an ordinary queued parent, these effects execute later: the subsequent HP re-check may still see zero and queue a kill event even if fatal-damage handling later revives the target. The later `BERoleDie` has its own positive-HP guard. Immediate-child contexts have different timing. Do not equate a queued kill event with completed death.

`tools/check_death_oracle.py` checks seven original death-check cases, including missing loss metadata and a controlled HP change after the first effect request. `tests/check-death.test.mjs` also composes the recovered scheduler, event routing and fatal-damage routine to expose the queued-event/revival distinction. That composition is code-derived; it is not a new original full-scheduler execution or gameplay observation.

`tools/damage_events_oracle.py` executes the original routine for 35 explicit cases. Event creation is observed; death checking is a configured HP response and fightback classification is supplied. Several combinations deliberately probe routing and are not claims of reachable standard card outputs. No listener, scheduler or actual revival/death implementation runs in this harness. `tests/damage-events.test.mjs` checks the same ordering and HP recheck, plus source metadata forwarding and payload identity.

The research suite passes across 32 test files. Independent complete gameplay predictions and holdouts remain zero; this event routine does not change publication eligibility.
