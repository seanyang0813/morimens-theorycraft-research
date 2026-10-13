# Season 71 Zone 3 ▼: boss replay and survival audit

The user-provided replay is a **retrospective clear, not a safe no-death route**.
It lasted 16 rounds and recorded **two player deaths and two respawns**. Its
four Awakeners were level 80/E7, 70/E8, 70/E15, and 70/E3; this is not evidence
for a low-investment lineup. We analyzed the replay without controlling the
game. The sanitized [enemy audit](../research/evidence/season71-zone3-example-enemy-audit.json)
is reproduced with `python tools/audit_season71_zone3_boss.py`.

The [Season 71 Zone 3 listing](https://qingdengbuyi.top/morimens-tools.html#zones)
and its [data](https://qingdengbuyi.top/data/morimens/skeydb/dzone/seasons/71.json)
give the ▼ Brain in a Vat **2,671,629 HP followed by 5,343,258 HP**, or
8,014,887 baseline effective HP, with Chaos Ring and Relic of the Past as
starting Creations. The replay agrees on the first bar but demonstrates that
8,014,887 is **not a fixed damage requirement during a long fight**.

## Enemy mechanics observed

The boss's `Equivalent Exchange` (`Skill` 67169) deals damage, raises its own
maximum HP by 20%, and lowers the player's maximum HP by 20%. It occurred on
turns **4, 8, 11, and 14** in this replay. Player maximum HP fell from 3,141
to **2,513 → 2,011 → 1,609 → 1,288**. Boss maximum HP rose from 2,671,629
to **3,205,955 → 3,847,146**, doubled to **7,694,292** at the bar transition,
then rose to **9,233,151 → 11,079,782**. These are observed properties, not
estimated damage multipliers. The exact resulting HP to remove depends on
damage dealt before each growth event.

The boss also spawned **27 enemies** of one type in the recorded path. Their
first observed maximum HP was **58,776**. Across the recorded fight, hits
from the boss had 9,767 incoming damage before block, and hits from spawned
enemies had 7,286, for **17,053** combined. These hit values reflect the
recorded run's enemy states and are not unmodified base attacks. The minions
make this a boss encounter with recurring mob pressure, despite the single
initial boss shown in the zone catalogue.

The replay contains 26 Posse-use events. A valid prospective model must track
Keyflare and Posse timing separately from Aliemus and card Compute. The
present enemy audit does not simulate any proposed team's shield, healing,
damage reduction, card order, Wheel effects, or resource flow.

## Implication for a no-death attempt

A slow damage plan lets the boss repeatedly increase its HP while reducing
the player's HP ceiling, and the adds compound incoming damage. The recorded
clear's two respawns violate the user's no-death-opportunity constraint. We
therefore cannot treat it as validation for that constraint, even though it
shows the boss can be beaten.

The next candidate must demonstrate both (1) enough damage or control to
limit `Equivalent Exchange` before the HP spiral and (2) timely multi-target
clear or mitigation for the adds. A replay-derived hit schedule is a stress
test only: changing the team changes enemy states, kill timing, HP growth, and
possibly attack order. No no-death or low-cost clear is yet verified.
