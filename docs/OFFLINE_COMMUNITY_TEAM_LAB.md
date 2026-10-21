# Offline community team and threshold lab

The new lab explains eight main lineup templates from the supplied community
sheet, checks their shared resources, exports them to the existing build
planner, and searches explicit combat scenarios against a damage threshold.
It works without an installed game. **It does not establish an optimized
real-team clear or a minimum account investment.**

Start locally:

```bash
python -m http.server 8765 --directory website/dist
```

Open `http://localhost:8765/teams.html`. Formula experiments and the Build
planner also link to it. Stop the server with Ctrl-C when finished.

A separate [native Sheet copy](https://docs.google.com/spreadsheets/d/1JL-2Z5jwaUoHlfdde8BpbuFQRzGEb1AGSWm89lmFyYg/edit)
preserves the original image-heavy `SkeyDB` tab and adds Start here, Team guide,
Investment, Engine results Survival lab, Damage grids and Critical audit. The original linked workbook was
not modified. The Survival lab requires explicit HP/heal/Block inputs; its
hypothetical check values were cleared after verification.

## What the sources explain

`research/community/suggested-teams.json` records source cell addresses, image
hashes, canonical character variants, verbatim investment entries and short
rationales linked to video chapters. The source title refers to five teams,
with alternatives for the first and Chaos slots; we transcribe eight main
lineup images, not eight independent recommended deployments.

KizunoV's [27-minute overview](https://www.youtube.com/watch?v=pGtbG3TBb5I)
links the exact original sheet. Its full English auto-caption transcript was
read. Relevant passages in the [mono-Chaos guide](https://www.youtube.com/watch?v=m-tVVRDFGBQ)
and [Helot: Catena guide](https://www.youtube.com/watch?v=maPTXSitEcI) were also
read. Auto-caption character names are unreliable; the image labels and pinned
catalog ground identity. Video frames were not independently audited, and
complete transcripts are not redistributed.

The explanations are recorded once in the catalog and
`research/community/guide-crosscheck.json`. Their practical implication for
simulation is to test the dependency before ranking a team: base-damage
amplification timing, Keyflare availability, defensive output, and the
encounter's HP bars can each determine feasibility. Community advice is not
independent verification of the recovered engine.

The [Flares workbook](https://docs.google.com/spreadsheets/d/1cC7FOebdy_J2hONmVT1QUSk6SxIRTuVoI4XADVlq5JU/edit#gid=1757667844)
was inspected in bounded ranges of Starter Realm Guide, Basics of
Teambuilding, and STR SCALING SHEEt. Its carry/support/debuff checklist is
useful; its unmatched damage totals and tier ranks are not engine inputs.
The [Keyflare wiki](https://forget-last-night-morimens.fandom.com/wiki/Keyflare)
was readable through search-index text only. The handbook timed out and direct
Fandom access was blocked. Those access limits are not a claim that the sources
contain no further useful material.

## Executed optimization and thresholds

The committed [audit](../research/evidence/community-planning-audit.json)
records actual executions of the existing paid Wheel engine:

| Synthetic candidate | Best modeled HP loss | Pass 1,000? |
|---|---:|---|
| No pursuit amplification | 850 | no |
| Arachne signature refinement 0 | 975 | no |
| Signature refinement 1 | 1,000 | yes |
| Signature refinement 2 | 1,025 | yes |
| Signature refinement 3 | 1,050 | yes |
| Signature and secondary, both refinement 3 | 1,125 | yes |

All 12 candidate/order permutations are evaluated. With amplification,
setup then burst wins. Refinement 1 is the lowest passing **examined
signature-only refinement**, among all four supported refinement levels.
Thus maximum effect is not necessary for this particular synthetic threshold.
This is not a new recommendation about a real team. The example explicitly
supplies neutral live property maps, two available one-cost actions, 2 Compute,
100/500 base values, Doomsday owner attack 1,000 and one Arachne pursuit.
Draws, pursuit generation and Keyflare are not inferred.

The survival lab separately holds the published Season 71 Zone 3 enemy hits
fixed. For hypothetical maximum/starting HP 3,000, healing 200 at each turn
start, and an eight-turn horizon, minimum fresh expiring Block is 406/turn.
405 fails, and 406 leaves a minimum of 3 HP. JavaScript matches the existing
Python model on six supplied HP/heal combinations. Google Sheets' independent
formulas reproduce the 406-pass / 405-fail pair. These are defensive supply
requirements, not Doll's or Ogier's measured output or a counterfactual clear.
Starting HP is separate from maximum HP, and no recorded team's HP becomes a
candidate default. Ordered hits, healing caps, shield consumption and the
encounter's post-hit 20% maximum-HP cuts are preserved.

The roster search enumerates all 256 subsets of the eight supplied templates.
It finds three maximum-size five-template portfolios under exact character-ID
and Posse non-overlap. Variants remain distinct; actual variant restrictions,
shared Wheels, Creations, borrows, ownership and wave assignment are unresolved.
The corrected `All of Her` Posse for the 24 template comes from the explicit
H58 instruction, overriding the image's `The Gated Answer`.

## Reproduce and extend

```bash
node tools/plan_community_teams.mjs portfolio
node tools/plan_community_teams.mjs check mouchette ogier-oathbound
node tools/plan_community_teams.mjs build mouchette
node tools/plan_community_teams.mjs threshold research/examples/community-wheel-threshold.json
node tools/plan_community_teams.mjs minimum-block research/examples/community-survival-hypothetical.json
python tools/prepare_local_website.py
```

The damage request accepts up to 100 explicit candidate timelines, enumerates
each candidate's full factorial, and refuses a combined evaluation count above
the declared cap. A rejected/unaffordable sequence cannot win by accumulating
partial damage. Existing engine validation rejects incomplete property maps,
unsupported builds and unsupported effects. Results retain `finalDamage:null`
and `gameplayClear:null`.

`tools/prepare_community_sheet.py` generates bounded native Sheets requests into
ignored `tmp/`. Apply them only to a newly verified **copy**: its sheet IDs and
addSheet requests are intentionally not an idempotent overwrite workflow.
The authored table widths, wrapped text, frozen headers and filters are
reproducible. Live Sheet changes should be read back after writing.

## Verification and remaining work

The focused 28-test command is:

```bash
node --test tests/damage-worksheet.test.mjs tests/community-planning.test.mjs tests/browser-runtime.test.mjs tests/general-website.test.mjs tests/paid-wheel-order-search.test.mjs tests/wheel-trigger-transitions.test.mjs
```

It passes, including ownership/counter/payment negative cases, exact search
caps, build export compatibility, immutable requests, lethal-before-HP-cut
handling and Python agreement. Native Sheet formulas and all authored ranges
were read back. No browser backend or artifact-tool renderer was available;
Google-rendered appearance and local webpage interaction QA remain unverified.
Formatting was checked through API metadata as a fallback.

The full suite on an untouched GitHub HEAD worktree has 634 passes, 117 failures
and one skip across 752 tests on this asset-free Linux checkout. After this
change it has 653 passes, 110 failures and one skip across 764 tests, with no
new failing test names. Seven baseline failures now pass after refreshing the
prepared runtime and updating its file allowlists. Remaining failures include
missing ignored client/raw files and pre-existing Windows Python assumptions.
The historical verification snapshot is preserved; local results are recorded
in the separate community audit. `NOT_READY` remains the gameplay publication
status. This comparison does not establish that all remaining failures are
harmless or that the full suite passed.

A real-team threshold pass still needs candidate-specific final HP and complete
properties, supported upgrade/skill branches, a legal hand and resource model,
Posse/Keyflare timing, and the encounter's actual bars and enemy response. The
October guides must not silently inherit parity with older pinned PC builds.
Without those inputs the useful result is an executable, bounded threshold
study and an explicit list of what prevents a full simulation.

## Reusable damage worksheets from the supplied examples

The worksheet engine and page retain the useful historical format: named
ability/setup rows, source and cost notes, two numeric axes, full traces,
and distinct noncritical, critical and expected outputs. Up to 500 cells and
eight setups may be evaluated. Axes require explicit resolved coefficients;
raw STR, incoming-damage storage, stack counts and upgrade labels never acquire
invented skill transforms. Expected values remain null without probability.
Costs are descriptive and do not establish rotation affordability.

```bash
node tools/run_damage_worksheet.mjs research/examples/damage-worksheet-visible-rotan.json
node tools/run_damage_worksheet.mjs research/examples/damage-worksheet-active.json
node tools/run_damage_worksheet.mjs research/examples/damage-worksheet-tentacle.json
```

The visible Rotan average-hit formula reproduces the three unobscured values
19,950 / 24,725 / 30,693 at STR 100 / 500 / 1,000. It weights the critical
branch but drops the noncritical branch. Under the same displayed 74.6%
probability, STR 100 gives noncritical 8,357 and conditional critical 26,743;
their expectation is 22,072.956. The regression preserves those numbers.
The native Critical audit tab independently computes both branches and the
original visible expression. This establishes an arithmetic defect in the
visible formula, not validation of its game coefficients. Actual runtime
probability may also differ because of discrete critical-roll resolution.

The Vortice RM component ledgers sum to 1,036.8 and 939.6 before display
rounding, consistent with the images' 1,037 and 940. Their skill damage totals,
E1 percentage-HP damage, repeated hits and proc interactions remain unaudited.
Vivian/Caraboo heal, shield and corrosion outputs and Rotan's incoming-damage
storage are useful future worksheet columns, but need independently recovered
ability transforms. No game art or user screenshot bytes are redistributed.
The cash-shop example does not define a combat objective or supply an account
investment model; its historical prices are not used by these optimizers.
