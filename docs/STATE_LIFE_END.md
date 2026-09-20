# State lifecycle completion

The original BattleStateServer.LifeEnd returns immediately when already deleted. Otherwise it marks deletion before any external call, optionally removes the team-unique registry entry, removes property contributions, records deletion, logs it, then requests a StateLifeEnd event containing the state UID.

`tools/state_life_end_oracle.py` executes that original method in eight cases covering unique/nonunique states, initially deleted states and repeated calls. The observers confirm deletion is visible throughout the callbacks and repeated calls do not repeat side effects. `engine/state-life-end.mjs` preserves this order using explicit caller adapters. A code-derived reentrancy regression checks that property removal cannot recursively repeat the lifecycle.

This does not execute RemoveProperty, registry mutation, record storage or queued event listeners. It does not establish when the state manager physically removes its object. The Old Embers timeline still uses simplified state mutation; the lifecycle component must be connected with verified property/event adapters before claiming complete removal behavior. Runtime evidence for a lifecycle boundary is not evidence that all its side effects have executed correctly.

## Property reversal follow-up

`tools/state_property_removal_oracle.py` now connects original RemoveProperty to original ChangeOwnerProperty across 96 cases. It verifies signed stored-value reversal, zero contributions, banned/ignoreBan behavior and PvE player-owned AWAKER_ATTR routing to current Awakeners. Other tested properties route to the owner. The stored contribution remains unchanged after removal; this method alone is not idempotent.

`engine/state-property-removal.mjs` exposes requested mutations for one contribution. Actual recipient property changes and their callbacks remain external. Tests use non-card owners; card-cost recording and multi-property Lua pairs iteration order are excluded. These results strengthen the property-removal boundary but do not replace the earlier limitation on full lifecycle side effects.
