# D-Tide Season 71: budget hypothesis and bounded simulation

Scope: October 12–26, 2026 Astral Reign, highest listed difficulty (tier 7), especially Zone 5. This is an original mechanic-driven hypothesis. No leaderboard builds or player replays were inspected for it, and no account battle was entered.

## Evidence

- The [current-season listing](https://www.kaiden.gg/morimens/d-tide/) reports a Chaos Ring, Zone 1 Rusty Lancet+ (two extra 60%-ATK hits per Strike, at most three triggers a turn), and Zone 5 Jade Imprint (Rouse exhausts one eligible card and puts one base copy in each of draw, hand and discard). It lists Zone 5 tier 7 at recommended level 100 and a level-103 boss with displayed 25.1M HP. The site is a secondary current-season listing, not a captured live encounter.
- Installed client `RelicConfig` rows 70771 and 78668 independently contain those relic rules. Row 70771 has `StatePara[1]=60`; row 78668 has `StatePara=[1,1]`. These static files were last downloaded before this rotation, so live seasonal assignment still depends on the current listing.
- Installed client `MonsterConfig` row 67097, "The Sage," starts with state 67255. `State` row 67255 says that on death it restores all HP, raises max HP by 100%, and releases First Doctrine. State 67257 says the first Posse each turn gives all Awakeners 10 Aliemus but permanently raises Posse cost by 10%. The [boss listing](https://www.kaiden.gg/morimens/monsters/the-sage/) associates The Sage with Season 71 Zone 5 and lists its card rotation. Exact tier-7 combat properties have not been captured.
- Installed client `AwakerConfig` classifies Mouchette as Orange DPS and Lotan, Doll and Ogier as Purple DPS, support and tank, respectively. All four have `School=1`. The pinned SKeyDB Awakener catalog independently labels all four `CHAOS` (Mouchette SSR, the others SR).

## Proposed team

Mouchette / Lotan / Doll / Ogier: one Orange damage dealer and three Purple units. Lotan supplies repeated Strike actions, Mouchette is the second damage source, Doll heals and supplies Aliemus, and Ogier shields. This limits the expensive slots to one and leaves no signature Wheel or duplicate as a prerequisite in the model. It is a **candidate**, not an established tier-7 clear. If Mouchette is unavailable, Ramona is the all-Purple card-access substitute, but this likely worsens the already unknown damage margin.

In Zone 1, prioritize up to three Strike uses per turn for Rusty Lancet+. In Zone 5, use Jade Imprint on a non-derived damage card that is actually in hand after its Awakener's Rouse; then reassess the new draw/hand/discard composition. Use Posse only when the payoff exceeds the permanent cost increase. Do not treat the boss's first empty HP bar as lethal: state 67255 changes the second bar.

## Executed bounded simulation

Run `node tools/season71_constraint_sim.mjs`. It evaluates only exact relic-card counts and an approximate HP throughput requirement; it does not run the general damage engine or calculate a win probability.

| Strike uses this turn | Lancet extra hits | Extra raw coefficient before combat modifiers |
| ---: | ---: | ---: |
| 1 | 2 | 1.2 × source ATK |
| 2 | 4 | 2.4 × source ATK |
| 3 | 6 | 3.6 × source ATK |
| 4 | 6 | 3.6 × source ATK |

For one eligible card initially in hand, one Jade trigger leaves one copy in hand, one in draw and one in discard: **three copies rather than one**, a net gain of two. It does not immediately grant three plays; costs, draw order and legal Rouse timing still govern actual use.

The boss page reports two HP bars, and the recovered state doubles max HP after the first death. The 25.1M display is abbreviated and its bar semantics are unconfirmed. If it denotes the first bar, the encounter requires approximately 75.3M total HP removal before mitigation, healing or overkill. If it denotes an encounter total, use approximately 25.1M instead. At a ten-turn horizon those are roughly **7.53M or 2.51M damage per turn**, respectively. These are feasibility thresholds, not simulated team output.

## Blocking inputs for a real clear prediction

Capture the current tier-7 boss's exact initial HP and battle properties, confirm the displayed HP semantics, then supply the team's actual levels, cards, Wheels, progression and relic route. The current sequence engine does not yet execute a whole D-Tide run with draws, enemy turns, state callbacks and survival. Until those inputs and effects are supported, a numeric clear or "best comp" claim would be invented.
