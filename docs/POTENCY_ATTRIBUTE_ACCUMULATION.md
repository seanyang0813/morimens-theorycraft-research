# Additional potency attributes

`tools/potency_stats_oracle.py` runs original AwakerDataUtils chain construction and GetPotencyAddAttrs using original AwakerPotency and ActorAttrType tables. It records 960 cases for 60 uniquely matched characters: an explicit zero endpoint and every configured chain entry. The output is `tests/synthetic/original-potency-stats.json`.

Original chain construction follows FrontPotency links. Accumulation starts at the first entry whose PotencyType is Attr_Promote and ends at the selected entry only if its EffectType is Attr_Promote. Repeated property contributions are added in chain order, without rounding. Zero and non-attribute endpoints return empty contributions in the original method. This behavior describes this preview method, not removal of bonuses when a player acquires a different kind of upgrade.

The harness supplies explicit Attr_Promote enum labels, a table.next alias to Lua next, identity localization and a nil owned-character lookup (the retrieved value is unused by this method). It does not execute account acquisition, level-based substat growth, equipment or team assembly. Callback errors and original warnings halt generation.

`engine/potency-stats.mjs` reproduces every recorded result and supplies per-entry, per-property addition traces. It requires an ordered resolved chain and explicit endpoint. Unknown endpoints reject instead of being silently treated as zero. No final damage or final equipped stats are claimed. Connecting these bonuses to the user-facing Psyche Surge controls still requires mapping the progression choice precisely.
