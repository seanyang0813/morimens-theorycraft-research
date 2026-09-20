# Equipped-combo discrepancy audit

The user supplied a friend's message reporting roughly 500k-1m for the combo and naming omitted Damage Amplification and Wheel of Destiny effects. No numerical stat, Wheel identity, level, active effect or independently reconstructable damage observation was supplied. The approved 97,228 example remains a no-extra-modifiers E2 scenario, not the friend's equipped run. E3/Old Embers totals discussed earlier were conditional comparisons, not established causes.

## Damage Amplification placement

The SKeyDB catalog's DamageAmplification growth values match the PC AwakerConfig basic_damage_per values for Aigis, Daffodil and Clementine (0.8), Castor (1.6), and Mouchette (0). This cross-source comparison supports the English label mapping; it is not a direct localization lookup. The native ActorAttrType entry labels basic_damage_per as team base damage. BattleCmdServer.__GetShowDamage reads player.basic_damage_per for a PvE Awakener. BattleUtilServer.ShowDamageFormula applies this percentage to the base term before adding flat contributions, including Exalt's strikecard_damage_plus.

For the approved Mouchette inputs, the base-plus-flat term with an explicitly supplied team value A is `78 * 1.35 * (1 + A/100) + 645`. Personal Strike stacks, other eligible modifiers, rounding, crit and Dominator bonuses follow. Multiplying the entire 97,228 total by `(1 + A/100)` is not this formula. A Wheel can affect other properties, primary stats or conditional effects; its tooltip must be mapped before assigning a bucket.

## Implementation

`engine/resolved-combo-modifiers.mjs` recalculates every hit from the saved approved vectors. It requires the team percentage and explicit owner-specific lists of resolved Wheel modifier properties with provenance. It does not accept an unexplained universal Wheel multiplier. The baseline with zero/empty lists reproduces 97,228. Synthetic placement tests distinguish base-only amplification from an inside multiplier affecting base plus flat. These tests are not assertions about the friend's missing values and are not new original-runtime fixtures.

This diagnostic overlay retains the existing ATK, crit, target and E2 hit-count inputs. Wheel primary stats, changing effects, tag-specific modifiers and other unsupported bonuses require full reconstruction rather than forcing them into a supported field. No replacement equipped total or revised PDF is issued without those inputs.

## Arachne correction

The Strike follow-up branch checks player state 134234 and the per-turn marker 134222, not Rouse directly. Recovered RelicConfig 84121 supplies state 134234 in the Stars chapter: it enables the first Strike and first Defense follow-up per turn and gives 15 energy at turn start. This identifies a concrete relic source, rather than proving the marker is present in every Astral Reign run. Since the approved baseline excludes extra relics, its omission is consistent with that narrow setup; being unroused by itself is not the reason.

Sources: SKeyDB awakeners.json (pinned commit recorded in the report); PC AwakerConfig, ActorAttrType, BattleCmdServer.__GetShowDamage, BattleUtilServer.ShowDamageFormula, RelicConfig 84121, Cmd 133374/133382 and State 134234/134222/133390.
