# Reapplying an existing state

`engine/add-state-layer.mjs` models the existing-state AddLayer method, including
layer limits, caster attribution, source-layer bookkeeping and ordered callback
requests. It takes an explicit state snapshot and returns a new snapshot.

The original updates the state caster and stored creation caster first, then
updates cached trigger commands in slot order (1 through 6). Only afterward does
it evaluate and round the maximum layer count upward. If the state is already at
or above the cap, it leaves layers, changedLayer and source attribution unchanged.
A different non-null caster still causes a record update in that capped path.

Below the cap, the new count is min(maximum, current + requested), with an absent
request defaulting to one. Only positive actual gains are credited to the incoming
caster's layer map. Each existing source entry with the incoming source type gains
the actual delta. A new source entry is not appended by this method. Property
updates precede argument refresh, recording and logging. Nonpositive resulting
layers request LifeEnd.

The original-runtime fixture covers 144 cases: fractional caps, absent/zero/
positive/negative requests, missing/same/different casters, and matching or absent
source types. The original method mutates its actual data tables; property changes,
argument generation, recording, logging and lifecycle completion are observers.
Resolved trigger-command caster 99 and maximum-expression results are supplied.
The authored component matches layers, caster/source attribution and callback order.

Negative requests are direct-method probes, not claims that the public creation
path accepts them. BattleStateMgrServer.__CreateState rejects explicitly
nonpositive requested layers before calling AddLayer. Full manager eligibility,
new-state construction, callback execution, state removal and gameplay validation
remain separate work. Source types and caster IDs in the authored boundary are
restricted to explicit numeric values/null.
