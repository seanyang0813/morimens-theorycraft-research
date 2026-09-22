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

Schema 2 supports multiple casters in one timeline. Each Active hit carries its
own complete caster and player base maps, while `initialWheelContributions`
contains only the shared temporary Wheel values and counters. The runner adds
those contributions to each hit's existing `strikecard_damage_plus` and
`basic_damage_per`; it does not replace one character's base map with another's.
The result labels this state `SHARED_WHEEL_CONTRIBUTIONS`.

The multi-caster example starts with a Mouchette-like hit whose own Strike flat
is 10, producing 110. After one Doomsday trigger and one Arachne-owned pursuit,
an Arachne-like hit retains its own 30 Strike flat and 50% base team
amplification, then receives the shared +250 and +55. Its modeled pre-hit damage
is 485. This is a property-routing example with synthetic magnitudes, not a
claim about those characters' real damage.

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

## Comparing orders

`engine/wheel-active-comparison.mjs` runs two complete timelines and aligns
their steps by stable ID. It reports position changes separately from changed
inputs, and for every aligned step exposes the delta in pre-hit damage, modeled
HP loss, HP, Block, Strike flat damage, team amplification and each supported
Wheel counter. A pure reorder is labeled `orderOnly`; changing an input is not
silently attributed to order.

The local Wheel lab can pin a timeline to the verified runtime, accept an edited
candidate and display the same comparison returned by the agent operation
`compare-wheel-active-timelines`. The saved comparison carries the runtime
fingerprint and rejects replay against different checked bytes. Deltas compare
the two executions; they are not isolated causal attribution when several
positions or inputs change together.

## Paying for card actions

`engine/paid-wheel-active-timeline.mjs` adds ordinary PvE card checks and energy
payment before a sequence of explicit Wheel-aware effects. Each accepted action
contains one or more complete-property Active hits and may place recovered
post-pursuit events among them. When Doomsday Rampage is tracked, the runner
appends its `AFTER_USE_CARD` event only after the accepted card's supplied
effects finish. A rejected card exposes neither its hit nor its Wheel event.

The runner cross-checks the explicit `cardType` against the supplied Strike
condition, validates every unexecuted resource and effect suffix, and carries
energy, target HP/Block, Wheel properties and trigger counters into the next
card. In the neutral example, two legal 2-energy Strikes from 4 energy deal 100
then 350 and leave two Doomsday stacks. Starting with only 2 energy rejects the
second card before effects and leaves one stack.

This boundary does not simulate hand removal, draws, refunds, changing costs,
turn transitions or pursuit generation. The ordering of other listeners and
whether an after-use listener completes following lethal damage remain
unresolved, so the runner stops at that boundary. The paid runner and its order
search currently use the schema 1 single-caster maps; schema 2 multi-caster
payment/search remains a separate integration step.

## Searching supplied card orders

`engine/paid-wheel-order-search.mjs` exhaustively permutes the paid actions when
the full factorial fits the caller's explicit evaluation cap. It excludes
orders that stop on an unaffordable or otherwise rejected card, while retaining
complete and target-defeating terminal executions. The result contains the
winning timeline and full trace plus compact eligible and incomplete rankings.

The Arachne test supplies one 100-base setup card whose pursuit activates both
Wheels and one 500-base card. Searching both orders selects setup then burst:
1,125 modeled HP loss versus 850 in reverse. The search claims optimality only
within those two supplied actions and the supported runner. It does not choose
the build, cards, draws, targets, hit snapshots or missing mechanics.
