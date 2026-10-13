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

## Survival input boundary

The **3,141 starting HP belongs to Meruru's recorded team**, not to the
Mouchette/Lotan/Doll/Ogier candidate. The earlier numeric Block/heal table
used the wrong team's HP and is **withdrawn**. No candidate-team HP, healing,
or Block was calculated. The installed PvE client routes the player's
`battleInitData.copyProperties` into battle; the current character catalog
does not reconstruct that final player HP for a hypothetical build.

The reproducible [enemy-pressure data](../research/evidence/season71-zone3-survival-frontier.json)
now leave the candidate survival frontier empty until a verified candidate
HP and effective healing input are supplied. The script accepts these through
`--candidate-hp` and `--healing-per-turn`; it scales the boss's 20% maximum-HP
cuts to that input. Even then it is a replay-conditioned stress test: new team
buffs, earlier add kills, enemy targets, and mitigation can alter incoming
damage. At turn 9 alone, recorded incoming damage was 2,656. Doll's Surgery is a
2-Compute heal plus all-enemy Weakness (`Skill` 4365); E1 improves its heal
and Weakness duration, and E2 improves other healing/Block. Ogier's base
Defend (`Skill` 4176) and Indeterminate Rampart (`Skill` 4195) create Block.
We have not resolved their actual output for a specified Lv70/90 build, so
there is no survival pass for the proposed lineup.

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
clear is verified. The current calculator does not yet resolve its player HP or sequence its actual
cards, Keyflare/Posse, Wheel procs, enemy response, or damage. A valid next
gate is to use actual build stats to show (1) Block/heal timing above the
required frontier, (2) add kills before their attacks, and (3) both boss bars
before repeated Equivalent Exchange. We should not spend account resources
on the basis of this screen.
