# Catalog-derived primary stats

The broader client-config audit found 120 one-point rounding differences across 97,200 comparisons. All 120 are now confirmed by original compiled Lua expressions, with 240 adjacent-level controls also recorded. See PRIMARY_STAT_CLIENT_AUDIT.md before treating this preview as client-equivalent.

`engine/build-stats.mjs` exposes `resolvePrimaryStats(input, catalog)` for the build resolver. The agent CLI is `node tools/resolve_build_stats.mjs inputs.json`. It uses the same saved catalog as the planner.

Every input is explicit: catalogRevision, characterId, level, gnosticBonusLevels (CON, ATK, DEF), and soulforgeBonusPercent. These are resolved bonuses, not Gnostic or Soulforge ranks. Rank-to-bonus mapping and legal combinations are not implemented. No omitted bonus becomes zero, and no out-of-range level is silently clamped.

The saved SKeyDB `awakener-level-scaling.ts` supplies the calculation:

1. `ceil((primaryScalingBase + level + gnosticBonusLevels[stat]) * statScaling[stat] - 1e-9)`.
2. `ceil(firstResult * (1 + soulforgeBonusPercent / 100) - 1e-9)`.

The supported level range is the source's 1–90 range. Each stat returns both raw and rounded stages, along with pinned catalog revision and source-file hashes. Output is marked CATALOG_DERIVED and finalDamage remains null. This is secondary-source arithmetic, not an original-client or gameplay verification claim.

Regression coverage includes the previously used explicit Mouchette ATK inputs (90, +10 bonus levels, +30% primary bonus → 198 → 258), Arachne's explicit 90/+10/+0% ATK → 138, all catalog characters at levels 1/70/90 with explicit zero bonuses, and rejection of missing or invalid inputs. Those examples do not establish that a particular loadout supplies those bonuses.

Substats, Wheel effects, team properties, action sequences, and final battle stats remain unresolved. The build planner does not auto-apply this resolver because its current saved plan lacks explicit progression choices.

## Wheel main-stat preview

`engine/wheel-stats.mjs` accepts catalogRevision, wheelId and explicit enhanceLevel (0–15, corresponding to E0 through E3 + 12). It uses saved `gameplay-math.json` series selected by rarity and mainstatKey. Growth starts at enhancement 4: `base + max(0, enhanceLevel - 3) * perLevel`. The output distinguishes flat values from percentages and preserves raw arithmetic before the source's two-decimal display formatting. Description rank caps at four (E3); this does not execute a passive.

The planner now previews this calculation and exports optional wheelEnhanceLevel. Legacy plans without this field preserve its absence; null is explicitly unknown; zero means E0. Changing the selected Wheel clears enhancement to unknown. All 146 catalog Wheels have matching scaling series. Coverage exercises all sixteen enhancement levels, the no-growth boundary through E3, SSR Realm Mastery 36 → 39 → 72, and SSR Crit DMG 43.2% at maximum. This remains catalog-derived evidence, not final character stats or gameplay validation.
