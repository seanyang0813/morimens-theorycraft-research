# Dimension adjustment for final effect values

`engine/dimension-final-value.mjs` models original BattleEffectServer.CalFinalVal
and GetDimensionFixPer using explicit caster-role/player context. Positive values
resolve the dimension percentage, multiply by `1 + percent / 100`, and round
upward. Nonpositive values skip the lookup and are only rounded upward.

A missing caster UID, missing role or non-Camp1 role resolves zero percent.
A Camp1 role queries its player and reads dimension_fix_per from that player.
If that player is absent, the original getter returns nil and positive-value
arithmetic fails. The authored API throws rather than silently using zero.

The 144 original-runtime cases execute CalFinalVal and GetDimensionFixPer together,
with supplied role/player objects and numeric properties. Values, lookup order and
missing-player failures match the authored component. This does not derive team
dimension values, reconstruct real role ownership or verify gameplay.

For applyState requests in the sequence engine, optional dimensionContext contains
explicit hasCasterUid, hasRole, friendly and hasPlayer booleans plus numeric percent.
When a state ID matches dimensionStateIds, this adjustment occurs before the
pipeline's final ceiling. Without a matching state, the context is not used.
Matching states require it; no role/player values are inferred. Repeated matching
IDs preserve repeated calls, as in the original loop.
