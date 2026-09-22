# Wheel events composed with Active hits

`engine/wheel-active-timeline.mjs` is the first bounded composition of recovered
Wheel event state with the complete-property Active damage adapter. It is
available to agents as `run-wheel-active-timeline` and in the local Wheel event
lab.

The input orders every event explicitly. Card damage must appear before its
`AFTER_USE_CARD` step, and pursuit damage must appear before its
`AFTER_PURSUIT` step. The runner does not infer either event from a hit tag.
Each Active hit records the exact Wheel-derived properties applied to that hit,
the full damage trace, HP and Block before and after, and the Wheel state that
later steps receive.

The current composition injects only two recovered property paths:

- Doomsday Rampage's accumulated value replaces the complete caster snapshot's
  `strikecard_damage_plus` value.
- Eternal Weave and Rota Fortunae's shared temporary value replaces the complete
  player snapshot's `basic_damage_per` value.

The caller supplies the baseline value for each property twice: in the complete
property map and in the Wheel state that separates base from temporary
contribution. The values must agree, which prevents silent double counting.

The deliberately small max-refinement example produces Strike pre-hit values of
100, 350 and 405. The first Strike precedes any event. Doomsday then adds 250
flat damage for the second Strike. After one Arachne-owned pursuit, the two
supported Arachne Wheels add 55 percentage points to `basic_damage_per`, so the
third Strike becomes 405. It does not become 543 because that amplification
does not multiply the already-added 250 flat Strike contribution in the
recovered formula.

Turn end clears the tracked temporary properties and Doomsday/Eternal counters.
Rota Fortunae's trigger counter remains spent until battle end. The runner stops
before any step after lethal HP because the full death scheduler is outside its
scope.

This remains an experimental composition. It does not execute card legality or
payment, create a pursuit, dispatch arbitrary listeners, mutate a deck, resolve
other Wheel passives, or provide gameplay validation. `finalDamage` remains
null.
