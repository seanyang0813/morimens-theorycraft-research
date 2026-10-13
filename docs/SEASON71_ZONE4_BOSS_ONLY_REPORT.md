# Season 71 Zone 4 ▼: low-investment boss-only audit

**Verdict:** The published survival arithmetic is a reproducible stress test of
recorded incoming hits. It is **not a complete combat simulation or a verified
budget clear**. In particular, the original summary mistakenly described the
Scuttler's first 7,667,758-HP bar as the full boss. The replay itself shows a
second 11,501,637-HP bar, for **19,169,395 effective HP** across the two bars.
The [season's zone catalogue](https://qingdengbuyi.top/morimens-tools.html#zones)
independently lists those same two bars; its [Season 71 data](https://qingdengbuyi.top/data/morimens/skeydb/dzone/seasons/71.json)
labels this Zone 4's highest `▼` threat. These are sequential bars, not two
simultaneous monsters.

## What was actually calculated

`python tools/season71_scuttler_survival.py` reads the private decoded replay,
selects only enemy-to-player hits, and publishes an ID-free result in
[`season71-scuttler-survival-bounds.json`](../research/evidence/season71-scuttler-survival-bounds.json).
The replay initializes one Scuttler with 7,667,758 HP. At record 273, its
`max_hp` becomes 11,501,637. The observed boss attacks before block were:

| Player turn | Recorded attack | Incoming before block | Cumulative |
| --- | --- | ---: | ---: |
| 2 | 3 × 798 | 2,394 | 2,394 |
| 3 | 1 × 1,689 | 1,689 | 4,083 |
| 6 | 2 × 1,481 | 2,962 | 7,045 |

Using the recorded player's **3,193 maximum HP** as an *optimistic reference*,
survival requires at least 891 net healing/shielding/mitigation by turn 3 and
3,853 cumulatively by turn 6, if no kill or change in enemy actions occurs.
The player actually started this replay at **2,669 HP**, raising those deficits
to 1,415 and 4,377. These are necessary HP-budget bounds, not sufficient
conditions for a particular build: healing caps, shield expiry, card timing,
and multi-hit effects matter. The boss was already Weak when its recorded hits
landed, so applying Doll's Weakness to those numbers again would double count.

The proposed **Mouchette E3 / Ramona E0 / Doll E2 / Ogier E3** lineup has one
SSR character, but its total investment is **not established as low**. It has
no fixed levels, skills, Wheels, refinements, relic pickups, starting HP,
hand, or numerical defensive-card output. There is no replay of that lineup
clearing this fight and no prediction of its damage against either boss bar.

## Keyflare and other missing mechanics

**Keyflare is a distinct Posse resource**, separate from Aliemus for Exalt and
card Compute. The connected replay contains **10 `UseKeeperSkill` events**.
The survival script counts them for the audit but models neither Keyflare gain
and cost nor Posse availability and effects. This omission is especially
important for a Ramona card-reuse line that depends on a Posse. The repository
has bounded card-energy and Aliemus components, but this boss-only calculation
does not compose them with Keyflare, hand draws, enemy intents, or defensive
cards into a turn-by-turn battle. It therefore cannot establish that a planned
rotation is legal or affordable.

The Zone 4 listing supplies **Proto Battery and Chaos Ring** as starting
Creations, and the period has **Astral Reign** as its stage effect. The prior
survival calculation assigns no complete Creation or Wheel loadout and does
not execute the stage effect. Mouchette's signature Wheel and the other three
characters' Wheel choices can materially change damage, resource gain, and
defense; none was included in the numerical result. The zone listing also
contains two other possible high-threat monsters, while this particular replay
initializes only Scuttler. Its survival numbers cannot validate those fights.

## Assessment and next evidence needed

The replay extraction and HP-budget sums are real and reproducible. Calling
the result a *boss fight simulation* or a *low-cost clear* would overstate it.
The two-bar correction increases the required total boss damage from a falsely
assumed 7.67 million to **19.17 million** before other mechanics. No result yet
shows the proposed team doing that damage while surviving.

A credible prospective test needs a fixed, legally obtainable build (E-level,
levels, skills, Wheels, refinements, and Creations); initial HP, Keyflare,
Aliemus, Compute and hand; a turn sequence including Posse/Exalt and shield
timing; both Scuttler HP bars and intent changes; then an independent replay or
controlled battle for comparison. Until then, use the current numbers only as
an incoming-damage requirement, and treat the lineup as a test candidate.
