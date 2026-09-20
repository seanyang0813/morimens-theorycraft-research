# Trace 002 — Arachne Strike in Frenzy, incomplete

Scope: PC downloaded resource 144 / build 51; Banana's Star chapter wave 1 Frenzy record, displayed 2026/9/20 3:22. The recorded combat build is not yet established. This is the prioritized trace. No observed output is used to solve missing inputs.

## Independently established inputs and execution path

| Stage | Evidence | Established value or behavior |
|---|---|---|
| Character | AwakerConfig 77918; recorded character preview | 阿拉克涅 / internal English Arachne, level 80, Strike level 6 |
| Base preview | `arachne-base-attributes.png` | Attack 127, DEF 171, physique 176, crit 5%, crit damage 50%, mastery 40; these are base preview values, not a full combat property vector |
| Skill | Skill 126484 | Card_Strike; initial coefficient 0.1, BattleFomula1; damage argument BattleAtkForce × GrowArgValue1 |
| Growth | BattleApi BattleFomula1 | Level 6 coefficient 0.2; this does not itself establish the resolved attack stat |
| Command | Cmd 133374 | One BEActiveDamage effect to FrontEnemy using Arg1, then ultimate energy; a conditional BEAttachPostAction follows |
| Follow-up | Cmd 133374 effect 3 | Skill 133381 executes when player state 134234 > 0 and 134222 == 0; its level comes from skill 126486. Effect 4 adds marker 135036. Do not assume no follow-up from Strike's short description |
| Card state | State 81028 | Card-join/turn-start listeners can execute commands 81026 and 99253 under their conditions; resolved card modifiers must be checked |
| Weapon 1 | `arachne-weapon.png` | 永世编织之网: mastery 36; shield +13%; follow-up grants +25% temporary damage bonus, at most five times per turn; dimension traversal grants 4 ultimate energy |
| Weapon 2 | `arachne-second-weapon.png` | 宿命纺轮: mastery 18; shield +4%; follow-up grants +9% temporary damage bonus, at most five times per turn |
| Trinket totals | `arachne-trinket-stats.png` | Crit +2.6%, crit damage +1.2%, mastery +14.5, damage amplification +1.6%, ultimate recharge level +4.2, key charge level +1.2, death resistance +79.8%; six-piece 埋骨地絮语 shown |
| Summary formatting | CopySettleModel.Update_settleAwakerAttrsMap / GetAttrShowStr | Adds recorded base, weapon and trinket/set attributes, then applies ceil for summary display. Summary crit 8% / crit damage 52% must be distinguished from raw fractional equipment totals |
| Combat property boundary | BattleUnitBase constructor / BattlePropertyServer constructor | Role properties enter BattlePropertyServer, which ceils initial numeric values. The exact replay property aggregation path and later changes remain unresolved |

## Recorded talents and supplied combat attributes

The record's talent panel independently identifies common talent 5/12, Stars season talent 10/10, and attribute talent 5/5. Private captures `arachne-talents.png`, `arachne-common-talent.png`, `arachne-season-talent.png`, and `arachne-attribute-talent.png` preserve the labels and descriptions.

- Common talent: exploration begins with 25 madness. This is not an observed per-hit STR value.
- Stars season talent: active in Stars chapter stages; physique, ATK and DEF +30%; the first ultimate grants 500 silver-key energy. Fate Cut is increased by 100%, and Fate Cut against mutated enemies is doubled. The exact stacking and target classification of these latter effects still require tracing.
- Attribute talent: ten effective levels of attributes, displayed as physique +16, ATK +12 and DEF +16.

AwakerConfig 77918 has base ATK 23, DEF 31 and physique 32. AwakerUpgrade level 80 uses `ceil(base * (1 + (40 + talent_attr_lv * 0.5) / 10) + extra)`. AwakerTalent 139558 level 5 supplies `talent_attr_lv = 10`. With zero extra, these yield ATK 127, DEF 171 and physique 176, exactly matching the independently observed base preview. This validates this limited preview reconstruction, not an attack prediction. Adding the season percentage alone would yield BattleAtkForce `ceil(127 * 1.3) = 166`; this is a conditional calculation, not an established event input.

The recovered `PVEGameplay.SpawnCampRoles` assigns each Awakener's supplied `attrs` to `properties`. `LoadAwakerConfigProperties` fills only missing values; Lua numeric zero is truthy and is retained. It does not blindly rebuild equipment totals from the preview. `OnInitBattle` subsequently restores supplied states through `InitStateFromSvrData`, then initializes passive states. Together with BattlePropertyServer's initial ceiling, this establishes the boundary to inspect: the supplied attributes and restored states must be resolved before equipment or season effects are added, or they could be counted twice. The selected replay's supplied property vector has not yet been obtained.

## Observed outputs kept separate

Boss turn 1 source statistics credit Strike with 2205 damage and Old Embers with 6615, total 8820. The ratio is consistent with the recovered three-times extra HP-change rule. The statistics do not prove a single Strike use or give pre-hit STR, critical flag, temporary multipliers, remaining resource at the event, shield loss or exact HP delta.

The record preview's 127 attack is not automatically substituted into BattleAtkForce: confirm equipped/battle additions, atk_per and event timing first. Likewise, neither the 52% summary nor the 51.2% sum of base and visible trinket crit damage is promoted to a final per-event crit input without checking combat initialization and changes.

## Required next evidence

The team-state-to-caster property path is now resolved at code and isolated-runtime scope: [STATE_PROPERTY_ROUTING.md](STATE_PROPERTY_ROUTING.md). A Player-owned flat Strike state distributes its contribution to each Awakener in PvE, and the formula reads that recipient property. This removes an ambiguity in how +653 can reach Arachne; it does not establish the actual event's state restoration or prevent double counting unless the supplied properties are known. UI STR must also be separated into actual Player/caster properties before using the setup adapter.

Mouchette's [mapped Stars-season effect](MOUCHETTE.md) can add 35 points to every Awakener's o_damage_per_strikecard at talent level 10. It is a base-stage factor separate from the observed +653 flat Strike addition. Resolve its actual presence on Arachne before prediction; do not infer a missing multiplier from the 2205 output.

The recovered [copy and attribution path](CARD_ATTRIBUTION.md) shows that creating a copy does not normally transfer its owner to the generating character. Skill statistics use the resolved command caster and skill ID. The Arachne statistics bucket therefore remains useful; the Moxia animation beside a floating number cannot override it. Actual card-instance ownership, presentation and event boundaries remain to be observed.

Additional turn-one captures are inventoried in `research/evidence/replay-002-turn1-sequence.json`. An earlier pause shows STR 50 (13 temporary, 37 battle), Moxia's displayed flat Strike bonus 653, and 17 Prism stacks with displayed +34% damage. A later pause shows STR 63 (26 temporary, 37 battle), the same Strike bonus, one Strike counted, boss Old Embers exactly 680010 and Vulnerable 1 (+50%). A subsequent frame shows a red 6615 while Moxia's animation is visible and boss HP reads 13895K. The previously captured 677805 resource differs from 680010 by 2205, consistent with the source statistics, but the captures do not yet prove an isolated source-owned hit. Copied-card ownership and animation timing must be checked; do not identify the caster solely from the visible animation. These are additional evidence for the existing incomplete record, not new completed fixtures or holdouts.

The attached action's recovered path is documented in [FATE_CUT.md](FATE_CUT.md). It adds temporary prism properties before accumulating Fate Cut, and Fate Cut has its own threshold-triggered Passive damage path. Consequently, the action can modify later Strike inputs without producing an immediate Fate Cut hit. A recovered strict-inequality threshold also differs from the tooltip and awaits independent testing.

Rewatch the first boss turn with Arachne's Strike and its preceding buffs identified. Capture its pre-hit card value, STR and temporary damage states, boss modifiers and resource. Count Strike uses and any follow-ups. Resolve equipment effects to internal property slots and establish the replay build. Only then calculate a prediction and compare it with the observed statistics and actual hit/HP evidence.
