# Season 71 Zone 3: minimum-comp screen

**Test first:** Mouchette E3 / Lotan E7 / Doll E2 / Ogier E0, all four in
Chaos for the starting Chaos Ring. This is a *mechanically complete on-paper
candidate*, not a proven minimum-cost or winning lineup.
It has AoE, a boss-HP-scaling attack, healing, and Block in four slots. The
E-levels are explicit breakpoints; Lv70/90, skills, Soulforge, and Wheels must
be set from an actual build before a damage or Block prediction. Do not infer
ownership or equipped Wheels from this proposal. In particular, Mouchette's
signature Wheel is **not** assumed here.

The user-supplied 16-round [replay audit](SEASON71_ZONE3_BOSS_REPLAY_AUDIT.md)
is the enemy source. It records 27 summons, 17,053 incoming pre-Block damage,
four boss HP-growth/player maximum-HP-loss events, and two deaths before a
win. It therefore cannot validate a no-death route. The [frontier data](../research/evidence/season71-zone3-survival-frontier.json)
are regenerated with `python tools/season71_zone3_survival_frontier.py`.

## Replay-conditioned defense simulation

The **3,141 starting HP belongs to Meruru's recorded team**, not to the
Mouchette/Lotan/Doll/Ogier candidate. No candidate-team HP was calculated.
The model starts at that replay HP, replays its enemy hits in order,
applies the observed maximum-HP reductions, and disallows death. A fixed
amount of fresh Block is granted each turn and expires at turn end; fixed
healing, when present, is granted at turn start and capped by maximum HP.
These are **required thresholds**, not outputs assigned to Ogier or Doll.

| Survive through | Fresh Block/turn, no heal | With 250 heal/turn | With 500 heal/turn |
| --- | ---: | ---: | ---: |
| Turn 4 | 0 | 0 | 0 |
| Turn 8 | 614 | 338 | 138 |
| Turn 11 | 1,077 | 740 | 646 |
| Turn 16 | 1,344 | 1,062 | 812 |

For example, a build that truly produces 500 effective healing and 646
effective fresh Block each turn meets this **recorded-hit** HP test through
turn 11; its card access and resource costs remain untested. At turn 9 alone,
the recorded incoming total was 2,656. New team buffs, earlier add kills,
enemy targets, and mitigation can alter these numbers. Doll's Surgery is a
2-Compute heal plus all-enemy Weakness (`Skill` 4365); E1 improves its heal
and Weakness duration, and E2 improves other healing/Block. Ogier's base
Defend (`Skill` 4176) and Indeterminate Rampart (`Skill` 4195) create Block.
We have not resolved their actual output for a specified Lv70/90 build, so
the table is a survival **screen**, not a pass for the proposed lineup.

## Damage and mobbing screen

The unmodified two boss bars total **8,014,887 HP**. Even ignoring adds and
the observed 20% boss maximum-HP growth, this requires an average of about
2.00M damage/turn by turn 4, 1.00M by turn 8, or 729k by turn 11. These are
necessary rates, not predicted DPS. A slower plan faces a larger boss and a
lower player HP ceiling. The replay's boss reached 11,079,782 maximum HP on
the second bar by turn 14.

Lotan's E7 (`AwakerPotency` 13146) adds one 15%-of-target-max-HP pure hit to
all enemies in its specified action. Against the *unmodified* first and second
boss bars that coefficient corresponds to about **400,744** and **801,489**
raw HP respectively, provided the action is charged, legal and lands. This is
an isolated effect, not a rotation or final-damage prediction. Against the
first 58,776-HP summon it is only about **8,816**, leaving about **49,960**.
If Mouchette has completed her first E3 Exalt so Mortal Blast makes three
all-enemy hits (`Skill` 122483, state 124039), the Blast must then deal at
least **16,654 actual HP damage per hit** to finish that add without other
damage. The prior observed Mouchette Blast dealt only 13,815 total damage to
each of two different small enemies in another stage. Neither observation
establishes this add-clear threshold for the proposed build. Add control is
still a real failure mode.

The candidate's appeal is specific: Mouchette can hit the boss and summons
together, Lotan E7 addresses the two large boss bars, Doll can heal and apply
Weakness, and Ogier supplies Block. Replacing Ogier with Ramona may improve
card access but loses the directly sourced Block slot, so it should be tested
only after the survival threshold is met. Helot's area damage spends current
team HP and is a poor initial fit for this boss's shrinking maximum HP.

**Verdict:** the candidate is worth a controlled test, but no minimum viable
clear is verified. The current calculator does not yet sequence its actual
cards, Keyflare/Posse, Wheel procs, enemy response, or damage. A valid next
gate is to use actual build stats to show (1) Block/heal timing above the
required frontier, (2) add kills before their attacks, and (3) both boss bars
before repeated Equivalent Exchange. We should not spend account resources
on the basis of this screen.
