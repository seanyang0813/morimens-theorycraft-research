# Shared-target hit timeline

`engine/resolved-hit-timeline.mjs` composes the existing damage and ordinary-HP helpers into an ordered sequence with one shared HP/shield state. Agents can run `node tools/run_hit_timeline.mjs timeline.json`. This is a research integration step toward the event-driven simulator, not a completed card sequence implementation.

Inputs require schemaVersion 1, build pc-res144-build51, interveningEffects set explicitly to assumed-absent, target containing positive hp and nonnegative block, and a nonempty steps array. Each step contains a unique id, explicit immune/puncture booleans, and a complete experimental calculateDamage scenario without hitResolution. The runner supplies the carried HP and shield. All formulas are validated before execution, including later hits that may be halted.

The restricted scope excludes retain-HP mechanics, damage caps and death resistance. It assumes no intervening state effects, damage triggers, healing or stat changes. It neither determines legal cards/costs nor generates pursuits. Each result retains those limitations and finalDamage is null. The runner halts before a hit against a dead target; revival/death handling is not inferred. A skipped/unsupported HP transition also halts and leaves the remaining steps unexecuted.

Results contain initialTarget, targetAfter, modeledHpLost, completion/stop details, and a per-step trace with before/after state and the full component calculation. completed means the supplied resolved hits were evaluated within this restricted model, not that a combat scenario is verified.

The order regression uses an explicitly synthetic target with 100 shield and 1,000 HP. A 100-damage puncturing hit followed by an ordinary 50-damage hit yields 150 modeled HP loss; reversing them yields 100. Both consume the shield. This demonstrates state carry and the recovered puncture helper, not an observed gameplay prediction. These composition tests complement existing original-runtime component evidence; there is no original-runtime multi-hit or independent gameplay validation of this runner yet.

## Original retained-state comparison

Each executed hit now also exposes result.hitTriggerValues, the numeric portion of the recovered BeHit event payload. Incoming castDamage/originVal remains distinct from realDamage and unBlockedDamage (both actual HP loss), plus shield flags, blocked amount, overflow, prevention conversion and death-resistance flag. These fields reproduce existing original BeHit fixtures. This is the bridge to trigger evaluation; actor/command identity, event reason and actual dispatch remain separate and are not inferred.

`tools/hit_timeline_oracle.py` now executes 24 timelines through original Passive/Fixed/Pure effects, BeHit and property mutation while retaining the same Lua property table between hits. Cases include both puncture orderings, mixed categories, fractional base rounding, shield amounts 0/100/250, and lethal hits. All resulting per-hit HP/shield transitions match the authored timeline. Unlike independent one-hit fixtures, later hits do not reset the original Lua target properties.

The harness supplies effect calls directly and stops at zero HP; damage events, statistics and animation remain no-op adapters inherited from the connected-effect oracle. This adds original-runtime evidence for the restricted retained-state arithmetic, not for a card scheduler, event execution, death handling or gameplay. The earlier composition-only limitation is superseded for these 24 cases.

Next integration must execute event/state effects between hits and connect action legality, generated effects and build-derived inputs. Do not use the no-intervening-effects scope for Mouchette/Arachne's trigger-heavy combo.
