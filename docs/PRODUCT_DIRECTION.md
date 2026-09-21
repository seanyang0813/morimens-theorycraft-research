# Product direction: Morimens theorycraft workbench

Replay-derived discovery is split into budget-comp scouting, cheese analysis, forward theorycrafting and verification. They share parsers and catalogs but keep separate labels and evidence standards; see `docs/REPLAY_ANALYSIS_WORKFLOWS.md`.

## Purpose

The final product is a general tool for Morimens theorycrafters. Mouchette/Arachne is a demanding case study, not a hard-coded calculator path.

Morimens builds one shared combat deck from a team of Awakeners, and its official description emphasizes tactical synergies across mechanics such as poison, shield breaking and counters. That makes a single-hit formula useful but insufficient: card order, Exalt timing, state duration, generated cards, resources, target selection and encounter rules can all change the result. Existing community resources provide character/build data and hand-authored damage guidance, but theorycraft still relies heavily on experiments and manually connecting those layers.

Context sources:

- [Official Morimens site](https://morimens.com/): team-based shared-deck structure and synergistic archetypes.
- [Official Steam page](https://store.steampowered.com/app/3052450/Morimens?l=english): four Realms, a large card pool, progression, challenge modes and PvP.
- [SKeyDB](https://github.com/dansa/SKeyDB): an open-source fan database and team planner whose original data is available for non-commercial community reuse; game-owned assets remain separately licensed.
- [Morimens New Player Handbook](https://morimens.info/): community terminology and current strategy context.
- [Community damage-formula discussion](https://www.reddit.com/r/Morimens/comments/1ldikbc): evidence that players currently validate formula layers and rounding experimentally.

## Two interfaces over one engine

`engine/theorycraft-api.mjs` is the stable JSON dispatcher shared by agents and future browser controls. `tools/run_theorycraft_request.mjs` runs the same interface from a file and loads the pinned local build catalogs. It dispatches only named bounded operations and preserves each component's `EXPERIMENTAL`, `PLAN_ONLY`, `CATALOG_DERIVED` or `UNVERIFIED` status.

The first assembly slice is implemented as `assemble-build-components`: it joins recovered character primary-stat progression, explicit Season/Soulforge percentage promotion and catalog Wheel main stats into a provenance-bearing ledger. It reports missing inputs as typed issues. It is not a final property snapshot because advancement passive states, equipment and battle-start effects are still unresolved.

For captured battles, `calculate-snapshot-active-damage` accepts complete live caster, player, target and optional card property maps and executes the bounded PvE Active path. This is the agent bridge for independent replay predictions while full build-to-property reconstruction remains incomplete. Partial maps, observed critical outcomes in place of required pre-outcome rolls, and unsupported skill branches fail closed.

The agent skill-preparation boundary is also build-pinned. Version 2 requests name resource 144 or 150, and the host refuses to execute them against another build's Skill, BattleApi, Cmd or State tables. Current tables remain local installed-client evidence rather than public catalog payloads.

The first agent-state enumeration slice is implemented as
`enumerate-legal-card-actions`. Given explicit ordinary PvE dispatch state,
energy, cards, costs and status properties, it returns every currently playable
card plus gate diagnostics for rejected cards. It does not choose a target or
execute an effect, so search code can distinguish action legality from outcome
simulation.

### Human workbench

The website should let a player:

1. Choose the game/build-data version and encounter.
2. Configure the full team, levels, breakthroughs, Gnostic Potential, wheels, wheel ranks, card levels and relevant progression.
3. Inspect the assembled starting properties and the provenance of every value.
4. Build a turn sequence by playing cards, Exalts and other supported actions in order.
5. See damage, Block, healing, HP, energy, card-zone and state changes after every row and hit.
6. Compare builds or sequences while holding selected variables constant.
7. Expand any result into a plain-language derivation with modifier buckets, rounding points, caps, target selection and unresolved mechanics.

### Agent interface

The same deterministic state-transition engine should expose structured JSON operations so an agent can:

- enumerate legal actions from a state;
- simulate a proposed sequence;
- branch on controlled RNG assumptions;
- compare builds and rotations under the same encounter;
- search sequences subject to turn, resource and survivability constraints;
- return a trace that the human interface can render and audit.

An optimizer must never invent missing values. Unsupported effects should stop a branch with a typed reason. Search quality and mechanic correctness are separate: a strong search over an incomplete ruleset is still incomplete.

## Architecture

1. **Versioned catalog adapters** import normalized Awakeners, cards, wheels, enemies and progression data. SKeyDB can be one community-data adapter where its license permits; replay-embedded tables and inspected client tables remain evidence sources rather than website payloads.
2. **Property assembly** derives battle-start properties from the chosen build and records every contribution.
3. **Rule engine** executes supported command rows, modifier buckets, target selection, caps, rounding and event ordering as small fail-closed modules.
4. **Battle state** stores roles, enemies, cards, zones, resources, states, counters, turn/phase data and queued callbacks.
5. **Sequence simulator** applies legal actions to immutable states and emits a complete transition trace.
6. **Search layer** explores action/build branches using explicit objectives such as total damage, lethal probability, survival or resource efficiency.
7. **Explanation layer** converts the same trace into human-readable working. Explanations are generated from executed operations, not reconstructed afterward from a final number.
8. **Evidence layer** maps each supported mechanic to source hashes, runtime probes, replay regressions and independent holdouts.

## Accuracy labels

Every result should carry one of these scopes:

- **Verified**: supported build and encounter, complete inputs, passed independent gameplay holdouts, and no unresolved path affected the result.
- **Experimental**: executable result from recovered rules with explicit unresolved dependencies.
- **Unsupported**: calculation stopped because a required rule, value or target binding is missing.

The current repository remains Experimental. Exact retrospective replay matches strengthen the engine but do not replace prediction-before-reveal validation.

## Delivery path

1. Finish a stable versioned build schema and property assembler.
2. Expand ordered command execution into a complete battle-state transition API.
3. Add a sequence editor and trace viewer to the website.
4. Expose the simulator as a documented JSON/CLI API for agents.
5. Add bounded sequence search after legality and state transitions are reliable.
6. Complete independent frozen gameplay holdouts before presenting recommendations as verified.

The first useful public release can be an explicitly Experimental workbench. The verified label remains gated per mechanic, build and encounter rather than being applied to the whole site at once.
