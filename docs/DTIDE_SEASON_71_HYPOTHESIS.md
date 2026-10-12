# D-Tide Season 71: budget hypothesis and bounded simulation

Scope: October 12–26, 2026 Astral Reign, highest listed difficulty (tier 7), especially Zone 5. The team ideas below were formed from mechanics before the later SS replay audit. No account battle was entered.

## Evidence

- The [current-season listing](https://www.kaiden.gg/morimens/d-tide/) reports a Chaos Ring, Zone 1 Rusty Lancet+ (two extra 60%-ATK hits per Strike, at most three triggers a turn), and Zone 5 Jade Imprint (Rouse exhausts one eligible card and puts one base copy in each of draw, hand and discard). It lists Zone 5 tier 7 at recommended level 100 and a level-103 boss with displayed 25.1M HP. The site is a secondary current-season listing, not a captured live encounter.
- Installed client `RelicConfig` rows 70771 and 78668 independently contain those relic rules. Row 70771 has `StatePara[1]=60`; row 78668 has `StatePara=[1,1]`. These static files were last downloaded before this rotation, so live seasonal assignment still depends on the current listing.
- Installed client `MonsterConfig` row 67097, "The Sage," starts with state 67255. `State` row 67255 says that on death it restores all HP, raises max HP by 100%, and releases First Doctrine. State 67257 says the first Posse each turn gives all Awakeners 10 Aliemus but permanently raises Posse cost by 10%. The [boss listing](https://www.kaiden.gg/morimens/monsters/the-sage/) associates The Sage with Season 71 Zone 5 and lists its card rotation. Exact tier-7 combat properties have not been captured.
- An [enemy-only replay audit](../research/evidence/sage-two-bar-replay-audit.json) now confirms the Sage transition in two older PvE fights. Initial HP 27,208 reached zero, then max HP became 54,416 and the second bar refilled; a second fight did the same from 70,651 to 141,302. Both second bars later reached zero. Reproduce with `python tools/audit_sage_boss_transition.py`. No team builds were read, and neither replay is from the new tier-7 season.
- A [current-season, Zone 5 SS replay audit](../research/evidence/dtide-season71-sage-ss-replay-audit.json) confirms the same transition at a higher difficulty. The embedded stage identifies Season 71 Zone 5 SS; its record began October 12 at 01:36 UTC. The Sage started at **1,362,452 HP**, reached zero, then refilled to a doubled **2,724,904 HP** second bar, which also reached zero. This implies at least **4,087,356 HP removal** in that SS fight. Reproduce with `python tools/audit_season71_sage_replay.py`. The private replay and player identifiers are omitted from the published audit. SS evidence does not establish tier-7 HP or a budget-team clear.
- The in-game D-Tide rule panel says the same Awakener, order, or named Wheel cannot be reused across zone teams. It also says an extra challenge is unlocked by clearing a stage, needs its own lineup, and shares the single support-use allowance with ordinary challenges. Resetting a stage releases its lineup but subtracts its training score. This makes full-season team allocation a roster-wide constraint.
- Direct inspection of the current Zone 1 and Zone 2 stage selectors showed different zone-specific starting relics at both C and the highest listed tier. Zone 1 showed Rusty Lancet+ and Chaos Ring; Zone 2 showed a pocket-watch relic and Chaos Ring. The current Zone 5 **SS** replay's embedded `Stage.InitRelic` is exactly `[78668, 83512]`, Jade Imprint and Chaos Ring. The other relics displayed in that replay were acquired during the run, so they cannot be treated as guaranteed. Zone 5 tier-7 starting relics remain unverified directly.
- Installed client `AwakerConfig` classifies Mouchette as Orange DPS and Lotan, Doll and Ogier as Purple DPS, support and tank, respectively. All four have `School=1`. The pinned SKeyDB Awakener catalog independently labels all four `CHAOS` (Mouchette SSR, the others SR).

## Proposed teams

1. **Zone 1 Strike line:** Mouchette / Lotan / Doll / Ogier. One SSR and three SR. Lotan supplies repeated Strike actions; Mouchette also brings regular Strike cards and a team Strike buff; Doll heals, and Ogier shields. This tests the starting Rusty Lancet+ without requiring a signature Wheel or duplicate in the model.
2. **Zone 5 card-copy line:** Mouchette / Ramona / Doll / Ogier. One SSR and three SR. Rouse Mouchette when her regular Storm Strike is in hand, select it for Jade Imprint, then use Ramona's Posse to fetch a copy from the discard pile at zero card cost if her Posse is available. Mouchette's generated Mortal Blast is **not** the proposed Jade target: the relic requires a non-derived card. Ramona's fetch is subject to the Sage's permanent Posse-cost increase.
3. **Zone 5 all-SR fallback:** Lotan / Ramona / Doll / Ogier. Use Jade on Ramona's regular Queen's Sword, whose listed hit count rises after each play, or test Lotan's regular Strike card when Strike-specific relics are available. This removes the SSR but has a much weaker isolated card coefficient; it is not an equivalent damage substitute.

### Lower-rarity HP-scaling candidate

The stronger reason to test **Lotan / Ramona / Doll / Ogier** is Lotan's **Over-Exalt**, if it is already unlocked on the roster. Installed client `Skill` 4373 and `Cmd` 2011 row 8 add state 54568 to each enemy when `IsSuperUtlSkill()==1`. That state's on-add argument is `StateOwner.max_hp*Layer/100`, with layer 15; `Cmd` 149712 routes the resulting value through `BEPassiveDamage`. The skill text describes it as an extra hit equal to **15% of the target's maximum HP**. This is an HP-scaled *input*, not verified final HP loss: passive-damage modifiers, `CalFinalVal`, shields, caps and death callbacks can still intervene. It should not be presented as a guaranteed 15% health reduction or a clear.

The source-derived activation constraint is also substantial. Lotan has a 100-Aliemus maximum (`AwakerConfig` 15569), her ordinary Strike (`Skill` 4646) gives 5 Aliemus at level one and costs 1, and her Rouse (`Skill` 4722) gives 25 at level one, rising with skill level. Chaos Ring's Dimensional Image grants 15 Aliemus at turn start, while the Sage's first Posse each turn grants 10 to all Awakeners and permanently raises Posse cost. Jade copies of Lotan's ordinary Strike can increase Aliemus generation, but its draw-pile copy is not immediately accessible by rule. Over-Exalt must be unlocked, charged and legally used; no first-turn use is established. Lotan's Over-Exalt investment may make this team cheaper in **rarity** but not cheaper in **duplicates or development**.

For a boss whose initial bar truly is 25.1M HP, the pre-mitigation state argument would be 3.765M on bar one and 7.53M after the documented maximum-HP doubling. These are conditional arithmetic checks, not simulated output or observed damage. The all-SR Queen's Sword comparison below therefore understates Lotan's *potential* contribution when Over-Exalt is available, but the complete team's turn cycle and survival remain unverified. If Lotan lacks Over-Exalt, no lower-rarity team here has evidence of being more reliable than the one-SSR Mouchette line.

**Mobbing check:** The audited Zone 5 SS replay initializes exactly one enemy, the Sage; it does not test clearing a separate group of small enemies, and it is not the tier-7 stage. Lotan's regular Exalt targets `AllEnemy` (`Skill` 4373), as does its Over-Exalt state application (`Cmd` 2011), so the proposal has area coverage on paper. But the ordinary level-one Exalt starts at only 0.4 × Lotan's ATK per target, and a 15%-maximum-HP hit alone leaves most of a fresh minor enemy's HP. Ordinary Strike and Ramona's Queen's Sword are single-target. Thus this team has **no verified fast mob-clear route**; do not call it a reliable multi-wave or full-zone composition based on the boss HP scaling. Inspect each zone's wave roster and run the complete action/energy sequence before making that claim.

These are **independent candidates**, not a legal simultaneous allocation across zones or established tier-7 clears. The Zone 1 and Zone 5 options reuse Mouchette, Doll, and Ogier; the in-game no-reuse rule means a full-season plan must assign each Awakener, order, and named Wheel to only one zone. The installed client lists all five named characters under `School=1`; pinned SKeyDB marks them Chaos (Mouchette SSR, the others SR). Actual levels, Wheels and card ranks are unspecified. The Zone 5 Jade line also remains conditional on confirming that relic for its tier-7 stage; do not transfer SS run pickups into it.

In Zone 1, prioritize up to three Strike uses per turn for Rusty Lancet+. In Zone 5, use Jade Imprint on a non-derived damage card that is actually in hand after its Awakener's Rouse; then reassess the new draw/hand/discard composition. Use Posse only when the payoff exceeds the permanent cost increase. Do not treat the boss's first empty HP bar as lethal: state 67255 changes the second bar.

## Executed bounded simulation

Run `node tools/season71_constraint_sim.mjs`. It evaluates only exact relic-card counts and an approximate HP throughput requirement; it does not run the general damage engine or calculate a win probability.

| Strike uses this turn | Lancet extra hits | Extra raw coefficient before combat modifiers |
| ---: | ---: | ---: |
| 1 | 2 | 1.2 × source ATK |
| 2 | 4 | 2.4 × source ATK |
| 3 | 6 | 3.6 × source ATK |
| 4 | 6 | 3.6 × source ATK |

The coefficient column assumes the same Awakener makes every Strike. With mixed casters, add 1.2 × the ATK of each of the first three Strike sources; the fourth Strike receives no Lancet trigger. These are relic hit coefficients, before the ordinary Strike card's own damage and all combat modifiers.

For one eligible card initially in hand, one Jade trigger leaves one copy in hand, one in draw and one in discard: **three copies rather than one**, a net gain of two. It does not immediately grant three plays; costs, draw order and legal Rouse timing still govern actual use.

The script now reads the installed `Skill`, `RelicConfig` and `AwakerConfig` rows and fails if the selected coefficients, school IDs or relic parameters differ. Its conditional two-play comparison uses the first card from Jade's hand copy and a second retrieved by Ramona's Posse from the discard copy:

| Zone 5 line | Base hit count across two plays | Sum of level-one `BattleAtkForce` coefficients |
| --- | ---: | ---: |
| Mouchette Storm Strike | 5 + 5 = 10 | 10 × 0.30 = **3.00** |
| Ramona Queen's Sword | 2 + 3 = 5 | 5 × 0.15 = **0.75** |

These numbers are **not final damage** and cannot be compared across characters as if their `BattleAtkForce` values were equal. Storm Strike's cost starts at `3 − PlayerRole.GetStateLayer(124035)`; Queen's Sword costs 3. The second play assumes Ramona's Posse is ready, a legal target exists in discard and the first ordinary card can be paid for. Jade's draw-pile copy is not counted as immediately playable. Skill upgrades, extra hit states, crit, enemy defense, buffs and other relics are excluded. The all-SR team also has Lotan's damage outside this isolated Queen's Sword line.

Two older replays and one current-season Zone 5 SS replay directly show the first bar reaching zero, then a second bar with doubled max HP. Their bar-HP sums are exactly three times their initial bar HP. That supports a three-bar-equivalent planning rule for this boss, including Season 71 SS. The Season 71 page's 25.1M tier-7 display is abbreviated and its bar semantics remain unconfirmed. **If 25.1M denotes the initial bar**, the two-bar fight requires approximately 75.3M HP removal before extra healing, shields or overkill. If the page instead denotes an encounter total, use approximately 25.1M. At a ten-turn horizon these are roughly **7.53M or 2.51M damage per turn**, respectively. They are feasibility thresholds, not simulated team output.

## Blocking inputs for a real clear prediction

Capture the current Zone 5 tier-7 `InitRelic`, boss's exact initial HP and battle properties, and displayed HP semantics. Then supply the roster's actual levels, cards, Wheels, progression and a relic route. Allocate disjoint Awakeners, orders, and named Wheels across the chosen zone teams. The current sequence engine does not yet execute a whole D-Tide run with draws, enemy turns, state callbacks and survival. Until those inputs and effects are supported, a numeric clear or "best comp" claim would be invented.
