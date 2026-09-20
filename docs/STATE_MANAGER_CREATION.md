# State manager creation and merge routing

`engine/state-manager-creation.mjs` owns the registry decision and lifecycle call
order for a state request. All constructor, merge, initialization, serialization,
recording and event hooks are required. The function mutates the supplied registry
and creation arguments, matching this responsibility of the original manager.
State types in the authored API use semantic names rather than raw enum numbers.

Living role targets and cards can receive states. Dead role targets require a
NonWipe death-handling mode; card targets do not take that role-death check.
Explicit nonpositive layers are rejected before state lookup or registry creation.
Null represents an absent layer and is passed to the constructor/merge hook.

An existing live state with the same ID is merged. Deleted entries are ignored
but retained in the registry until separate cleanup. A new state is constructed,
appended, initialized, serialized and recorded, in that order. Team-unique routing
follows the record. Unless skipOnAdd is set, both new and merged states then queue
StateOnAdd and record action statistics. The event receives the creation arguments
and returned state UID.

The 864 original-runtime cases execute original CreateState, __CreateState and
GetState together and inspect the real registry count, returned state identity and
observed call order. Role/death/unique flags are supplied. The constructor returns
an explicit adapter state; merge, initialization, serialization, recording, unique
routing, event queueing and statistics are observers. The StateOnAdd event identity
is stubbed, not the real event-enum module. The original death-handling constants
are strings and are preserved as strings in the oracle.

This verifies manager orchestration, not complete state construction, property
initialization, merge arithmetic, trigger registration, event dispatch or gameplay.
Those hooks must be wired to their actual implementations before this can support
a complete general state effect. Missing hooks fail rather than silently skipping
parts of a card. Logging entries in the returned trace describe original order;
the authored manager does not emit game logs.
