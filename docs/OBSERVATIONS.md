# Gameplay evidence

Raw screenshots are in `research/observations/replay-001/`. This is a real game replay, not synthetic runtime output. User identified the 融灾禁区 (Rongzai Jinqu) records entry. The inspected record is 星辰篇, wave 1, Normal, player Goodluck, displayed date 2026/9/19 23:46 (server display timezone not established).

The team is Castor level 60, Colleen level 50, Alacrin level 60 and support Pollux level 70. Record summary: four total turns, two final-battle turns, maximum turn damage 46,257. Colleen's Strike level 3 is attributed 318 damage, all in boss turn 1; replay also visibly showed a 318 critical-colored number. The exact crit flag and pre-hit modifier state still need confirmation.

Opening the character portrait displays base-character attributes (Colleen 5% crit, 50% crit damage), while the equipped record shows 8% and 51%. These are not interchangeable. The base preview must not overwrite recorded combat values.

The equipped summary applies upward display rounding (`CopySettleModel.GetAttrShowStr`). Its displayed values are observations, not raw fractional attribute totals or proof of per-event combat values. Combat property initialization also rounds upward; see ROUNDING.md. The Frenzy Arachne equipment/base observations are now detailed in DAMAGE_TRACE_002.md.

The in-game Damage Amplification tooltip says it raises all Awakeners' base damage, fixed-value Poison/Counter application amounts and initial Deepsea tentacle damage. Screenshot saved. This is official in-game description evidence; internal ID correspondence and insertion points still require code/data mapping.

No complete deterministic gameplay fixture has passed yet. The candidate remains incomplete; predicted damage and difference are null. It has not been reserved as a holdout because its output has already been examined during formula research.

Higher-difficulty work now takes priority. A Frenzy record has been opened and its team summary/opening state saved; see HIGH_DIFFICULTY.md. Turn-two screenshots now preserve exact Old Embers counts 594509 and 552052 across a sequence, and overlapping floating labels 22110, 22362 and 67086. Although 67086 is three times 22362, pairing those labels to one event is not established. The resource delta spans other actions and cannot be assigned to these labels alone. This is an incomplete sequence fixture, not an additional verified attack or a holdout.

A separate filtered statistics view gives stronger aggregate evidence: boss turn 1 credits 阿拉克涅 with Strike 2205 and Old Embers 6615 (total 8820). The 3:1 ratio is consistent with the code-derived rule. Hit count, exact pre-hit inputs and HP loss remain unknown; this supports only an aggregate consistency claim, not a verified full damage prediction.
