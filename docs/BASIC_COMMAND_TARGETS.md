# Basic command target selectors

`engine/basic-command-targets.mjs` resolves four raw selector lists using explicit parser context and lookup adapters. It does not resolve arbitrary target expressions or reconstruct the registry.

- `CmdCaster`: lookup the caster UID through the role manager and return that role, or an empty list for a known missing role.
- `PlayerRole`: obtain the caster camp, then lookup that camp's player. This is not necessarily the command caster.
- `UpperTarget`: return the supplied target list, retaining null if no list was supplied as original parser context.
- `LastTarget`: lookup the previous effect and return its targets, or an empty list when that effect/target list is absent.

Target-list references are preserved. An unresolved adapter result is an error; callers must distinguish it from known absence (`null`). Lookup order is included in the report. The API rejects unsupported selectors rather than guessing an enemy or substituting the caster.

`tools/basic_target_oracle.py` runs 72 original `GenerateTargetsExp`/`GetTargetList` cases with explicit role registry, camp, last-effect and target-list adapters. The expression constructor retains the supplied list; original constructor getter initialization/filtering is outside this evidence. Fixtures include null, empty, and multiple upper/last targets plus present/missing roles and effects.

This component is not yet a complete command target adapter. Front-enemy selection, camp derivation, role registries, selection prompts, filtering and full effect execution remain separate work. The prepared-skill experiment still requires an explicitly supplied single UpperTarget; its support claims have not been broadened merely because these selector components exist.

## FrontEnemy composition

`selectFrontEnemy` now supports explicit two-camp role snapshots. An existing locked role wins, then an existing taunt role. Those two branches return before ordinary eligibility filtering. Otherwise the original manager excludes nonzero sneak, wrong-camp roles, roles without HP bars, and dead roles, then sorts by absolute battlefield position. The authored model rejects equal absolute positions because original Lua tie ordering is not established.

`tools/front_enemy_oracle.py` executes the original parser branch connected to original alive-role filtering and position sorting in 48 cases across both camps. Lock and taunt lookup results and role getters remain supplied adapters. This is not automatic reconstruction of lock maps, unique taunt states, role registries or gameplay.

The prepared-skill runner accepts `targetBinding: {expression: "FrontEnemy", resolution: "front-enemy-context", targetUid, context}`. The context contains `casterCamp`, `lockedUid`, `tauntUid`, and `roles`; each role supplies `uid`, `camp`, `hasHpBar`, `dead`, `position`, and `sneak`. The selected UID must match the supplied damage/HP snapshot's declared `targetUid`. No target or a mismatch stops with an error before damage. Existing externally resolved single-target input remains available.
