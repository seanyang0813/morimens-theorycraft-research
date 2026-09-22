# General calculator: team builds and action sequences

The latest clarification makes this a human-and-agent theorycrafting workbench: understanding interactions, correct sequencing and why builds work, and creating new builds, are the primary outcomes. Damage totals are supporting outputs. Both interfaces must share executable scenario contracts, evidence and uncertainty; explanatory text must distinguish observed stage differences from proven individual causal attribution.

The user's clarified product is a general Morimens calculator. Mouchette/Arachne is one scenario, not the product model. A raw modifier form is useful for research/debugging but is not the intended main player interface.

## Main workflow

1. Team: choose characters and specify level, advancement, skill progression, Soulforge, Wheel and other supported equipment. Keep equipment identity separate from resolved stats so changing a Wheel can change both stats and triggered behavior.
2. Encounter: select enemy/mode, starting HP/shield, difficulty rules, relevant relics and initial state. Unsupported rules must remain visible as unresolved; do not substitute a generic target silently.
3. Sequence: arrange explicit actions (cards, Rouse, Exalt, turn boundaries). Show generated pursuits/extra effects underneath the action that causes them. Manual planned actions and generated effects must be distinct.
4. Results: show damage per action/hit, actual modeled HP changes, resource consumption, stacks before/after, trigger reasons and rounding. A user should be able to identify why changing one action changes a later hit.
5. Comparison: duplicate a scenario and change a build or sequence. Compare damage, remaining resources and unresolved assumptions under the same encounter conditions.

Character definitions, equipped items, initial battle state and the action timeline should be separate data structures. Run the same engine for all characters using data-backed skills/states; avoid a bespoke calculator implementation for each character. A Wheel must be able to contribute both stat changes and event listeners. Preserve the exact resource build and data provenance in saved scenarios.

## Questions the workbench must answer

- Interaction: which event activated an effect, which conditions passed or failed, and which later hits it changed.
- Sequencing: what changes when two actions are swapped, including resources, consumed stacks, generated effects and action legality.
- Build explanation: which equipped effect or progression choice contributes to a result, and under what encounter and sequence conditions it matters.
- Build discovery: let a human or agent clone an experiment, change explicit choices, replay it and compare the resulting trace under a stated objective.

Each resolved effect needs a stable trace identity, its parent action/effect, relevant state before and after, rule/evidence references, and rounding steps when arithmetic occurs. A failed trigger should be inspectable as a condition failure rather than disappearing without explanation. Explanations should be generated from this execution record, not independently inferred from a damage total.

Human and agent interfaces must support the same operations: inspect available definitions and supported rules, validate a scenario, execute it, inspect its trace, and compare it with another scenario. Saved experiments must pin engine and data versions. Unsupported mechanics must produce explicit unresolved dependencies; a planner selection alone must never be treated as simulated support.

Acceptance example (not yet implemented): duplicate a team/encounter scenario, swap Rouse and Exalt, and explain every resulting difference through changed state or triggered effects. If either order is illegal or a required rule is unsupported, report that specific limitation instead of producing an apparently complete total.

## Search for an optimal result

Optimization is a layer over the simulator, not a substitute for it. The user must choose an objective (for example burst in one turn or damage within a resource budget), allowed cards/equipment, initial resources and assumptions about draws/crit. Only search legal actions under supported rules. Return the sequence and trace, not just a best total. Incomplete rules can create false optima, so do not advertise optimal builds until their supported scope passes verification.

The first bounded search operation, `search-card-orders`, now exhaustively permutes supplied resolved card instances when the full factorial search fits the caller's explicit evaluation cap. It admits completed sequences and legal target-defeating terminal sequences, excludes other incomplete/rejected timelines, returns the winning trace, and claims optimality only within the enumerated actions and supported experimental runner. It does not choose builds, cards, draws or missing mechanics.

## Current implementation

Actual exported skills can now be prepared through `tools/prepare_skill_command.mjs`: command selection, progression coefficient lists, growth, parameter evaluation and rounded/overridden arguments share an auditable result with export hashes. The tool reports all command effect types and retains executable=false until full execution support is established; it does not drop unsupported rows. Inputs still include explicit internal progression and combat variables. See PREPARE_SKILL_COMMAND.md.

The local `actions.html` page now exposes the shared card-action JSON runner, a clearly synthetic fixed-cost/X order example, reversal, per-action energy/HP/shield transitions, rejected/partial outcomes and full traces. It verifies engine bytes before enabling controls and includes the runtime fingerprint with results. It does not yet offer character-driven action construction or a pinned saved comparison contract. Event-level UI and checked-module execution tests pass; actual browser visual/interaction QA remains pending because the user's computer is reserved.

The active command experiment now connects numeric rows to scheduled multi-hit active damage and shared HP/shield through a JSON/CLI entry point, retaining expression and arithmetic traces. It accepts resolved modifiers and one target, with no intervening effects; automatic cards/builds, resources, ParaPlus and arbitrary state effects remain unconnected. See ACTIVE_COMMAND_EXPERIMENT.md.

The generic numeric command-row runner now connects live conditions, parameter expressions, target/handler adapters and the effect scheduler. It reproduces 64 recovered Old Embers expression sequences and composes with the live active-damage loop. This is a component integration, with explicit target/effect/lifecycle adapters, not complete card execution; see COMMAND_ROW_EXECUTION.md.

The general card action runner now composes card checks and payment with supplied hit effects under shared energy, target HP/shield and optional controlled Old Embers layers. It refuses damage for rejected cards and stops later payments after lethal transitions. Card definitions are not yet automatically interpreted; see CARD_ACTION_TIMELINE.md. The static command inventory in COMMAND_COVERAGE_INVENTORY.md identifies state addition, generated cards and nested commands as major remaining dependencies, without claiming support from handler names alone.

The agent API's `run-snapshot-active-sequence` operation now applies repeated complete-property Active hits and threads the recovered HP and Block mutations into each following hit. This matters when the first hit consumes shield and changes later block-sensitive damage. It validates even an unexecuted suffix and stops before post-lethal hits. The input must hold the target battle tag and state-ID set constant under an explicit `assumed-absent` intervening-effect policy. State layers, callbacks, trigger events, statistics, death execution and `be_damage_statics` updates remain unresolved instead of being guessed.

The catalog-prepared snapshot boundary also supports the common two-row Defend shape `BEGainBlock → BEGainUltiEnergy`. Skill 4176 / command 834 now derives Block and energy property ownership from one complete live snapshot, retaining all reads and rounding stages. This is a reusable defensive-card path rather than a character-specific formula; automatic target generation, payment, events and later actions remain outside the operation.

Catalog-prepared state-only cards can now import their State definitions rather than asking the caller to reproduce state expressions. Skill 134203 / command 134192 applies state 3835 to an explicitly selected role on either pinned PC catalog and exposes both retained state contribution and amplified live property mutation. State immunity, layer modifiers/limits, automatic expiry and target acquisition remain unresolved instead of being inferred.

`rules.html` now exposes a searchable evidence catalog with claims, status, check scopes, limitations, original module/method fingerprints and local check identifiers. `rules.json` provides the same selected research metadata to agents. `tools/prepare_rule_catalog.py` uses an explicit field allowlist, omitting extracted code, bundle paths and private source locations. The metadata is included in the runtime fingerprint so saved sequence experiments also identify the accompanying evidence snapshot. This does not turn the registry into exhaustive mechanic coverage, and the page explicitly distinguishes component runtime evidence from independent gameplay validation. Browser interaction/layout QA remains pending.

Sequence comparison now has a shared human/agent contract: `engine/timeline-experiments.mjs` accepts schemaVersion 1, kind `morimens-timeline-comparison`, baseline and candidate timeline inputs. It matches steps by identity, separates order changes from changed hit/target/scope inputs, and reports direct/generated HP-loss differences with both full traces. An unexecuted step has null metrics; if either run stops early, the full-sequence damage delta is null. The website exports/imports the two-input JSON and shows aligned differences. `node tools/compare_timelines.mjs experiment.json` verifies the prepared runtime manifest and pins the saved experiment; a mismatched or unverified pin rejects replay. The sequence browser now verifies the runtime manifest and every listed asset, creates an isolated module graph from the checked bytes, and saves the same fingerprint as the CLI. Matching pinned comparisons can replay in either interface; mismatched pins reject. This applies to the sequence page; the older single-hit formula page is still unpinned. No archived engine snapshots, card optimizer or full battle simulation is implied.

The local sequence page now exposes the controlled Old Embers composition through the same `runResearchTimeline` entry point used by `tools/run_hit_timeline.mjs`. Input must explicitly choose `assumed-absent` or `old-embers-only-assumed`; there is no automatic inference from a build. Each Old Embers row separates direct HP loss from generated HP loss, shows layer changes, and lists generated effects with parent-hit identities. Raw calculation traces remain available. Reordering and pinned comparisons preserve the chosen scope. The deliberately synthetic examples demonstrate behavior, not realistic character damage. Event-level UI checks cover both scopes; browser visual QA and independent gameplay validation remain pending.

The controlled Old-Embers-only hit timeline now connects hit payloads to activation and command rows with shared HP/shield/layers and parent-linked generated-effect traces. This is a synthetic component composition, not yet connected-runtime or gameplay validated. It assumes other reactive effects absent and stops at lethal transitions; see OLD_EMBERS_HIT_TIMELINE.md.

The first shared-target resolved-hit timeline now carries HP and shield between hits, exposes before/after traces and stops at unsupported transitions. It requires intervening effects to be explicitly assumed absent and excludes caps, death resistance, card legality and generated actions. It now has a local website surface in timeline.html: paste the shared timeline JSON, reorder hits, pin an order for comparison, and inspect per-hit arithmetic and HP/shield transitions. This remains a resolved-hit experiment, not the event-driven card simulator. An event-level DOM harness covers reorder/comparison/error behavior; real browser interaction and visual QA remain pending. See RESOLVED_HIT_TIMELINE.md.

The website planner now calls the client-backed primary-stat resolver after explicit client-build, character, level, Gnostic-rank and Season/Soulforge advancement selection. The client selector offers the installed `pc-res150-build51` payload and the separately labeled historical `pc-res144-build51` payload; data from one build cannot be used with the other. It displays the recovered percentage promotion and an expandable JSON arithmetic/provenance trace, separately from catalog Wheel main stats. The known-component assembler exports one ledger while retaining advancement passive states, equipment and battle-start effects as unresolved. Browser interaction/visual QA remains pending.

The current client-backed primary-stat resolver accepts character, level and Gnostic rank for 60 uniquely matched PC characters. It reproduces 2,700 original resource-150 connected lookup cases and preserves original rounding. The advancement layer maps explicit supported current seasonal primary promotions and composes them through the runtime-tested rounding helper; Mouchette level 10 resolves 198 base ATK to 258. Jenkin's client identity remains ambiguous, and advancement passive states, equipment, substats and battle-state assembly remain excluded.

The build planner supports explicit Wheel enhancement and a catalog-derived main-stat preview with arithmetic. Export/import preserves unknown enhancement. Wheel passive execution, equipment legality and combination into team battle properties remain unresolved.

`engine/build-stats.mjs` now resolves catalog-derived primary stats from explicit level and resolved progression bonuses, preserving both rounding stages and source hashes. `tools/resolve_build_stats.mjs` exposes the same operation to agents. It does not yet map progression ranks to bonuses or automatically resolve planner selections; see BUILD_STAT_RESOLUTION.md.

`builds.html` now provides the first catalog-backed team/loadout planning surface: 61 character identities and 146 Wheel identities from the existing pinned SKeyDB snapshot. Export/import uses `engine/build-plan.mjs`, preserving unknown levels and unspecified Wheels. These plans have PLAN_ONLY status; selecting an identity does not assert legal equipment, applied stats, supported passives or damage. The schema is deliberately separate from resolved formula experiments until build resolution is implemented. The catalog export strips lore/images and retains source hashes and license attribution.

Retrospective battle-start data shows two serialized Weapon-source states for
405 of 408 Awakeners, one for two, and none for one. Build-plan schema 2 and the
website editor therefore represent two optional Wheel selections independently,
including enhancement and refinement, without filling empty or unknown values.
Schema 1 remains accepted for legacy imports and is migrated visibly in the
editor with its refinement left unknown.

The local agent API operation `assemble-wheel-loadout-properties` now consumes
that schema with the ignored client crosswalk and State catalog. It resolves
both selected Wheels' refinement parameters, evaluates their initial direct
owner-property expressions, and emits per-Wheel and summed ledgers. For the
explicit max-refinement Mouchette/Arachne example, Mouchette's two Wheels expose
`o_damage_per_attachpost +60` and `o_damage_per_ulti +60`, while Arachne's two
Wheels sum to `o_block_per +35`. Every involved Wheel also has trigger commands;
those remain marked unresolved and are not replaced with zero. Stat-scaled
direct properties require explicit owner battle properties.

The browser workbench now has a Wheel-event lab backed by the verified runtime.
It accepts exact JSON for each currently recovered event transition and an
ordered sequence that exposes property and counter state before and after every
event. Base values and temporary Wheel contributions remain separate, allowing
turn-end clearing without erasing unrelated bonuses. Eternal Weave resets its
counter each turn; Rota Fortunae's counter persists until battle end while its
temporary amplification clears each turn. A bounded composition now places
explicit Active hits among those events and applies the current Doomsday Strike
flat and Arachne team amplification only to later hits. It requires complete
property maps, cross-checks their baseline values against the Wheel state and
does not infer event emission from card tags. Unsupported Wheels and incomplete
inputs fail rather than receiving neutral defaults. See WHEEL_ACTIVE_TIMELINE.md.

The first experiment layer now accepts reproducible versioned JSON containing two explicit research scenarios. `engine/experiments.mjs` evaluates both with the same calculator, reports changed input paths, metric deltas and aligned stage differences, and retains both full results/dependencies. Missing results remain null. The website can pin A, compare edited B, and run pasted experiments. Agents can use `node tools/compare_experiment.mjs experiment.json`. These are single-hit experiments, not yet general team/sequence simulations or an optimizer.

The shared theorycraft API also accepts `prepare-skill-command`: an agent supplies an exported skill ID, explicit progression, combat variables, condition results and state-query results. The host selects the version-pinned skill and command rows, prepares arguments and can optionally execute the whole command through a supported narrow profile. Setup-only execution also assembles state maxima and property expressions from the hashed State export while accepting only live state facts from the caller. It never accepts caller-authored command rows or catalog state definitions through this operation, and it returns blockers instead of dropping unsupported effects. This connects real skill definitions to agents; automatic build-to-variable assembly and the website skill picker remain unfinished.

The homepage has been expanded from the Mouchette-only calculator to a general formula sandbox supporting Active, Passive, Fixed and Pure paths with optional explicit hit/HP properties. It accepts resolved inputs and does not yet offer character/equipment selection or a general sequence simulator. The Mouchette example remains a separate page. Both are local and unpublished.

The engine has arithmetic and partial event/state components, with original-runtime evidence at documented boundaries. Recent Old Embers work connects one activation but still relies on supplied lifecycle/state adapters. This is not a complete general simulator. Character/build data normalization, action legality/resources, full event-driven execution, encounter rules, browser QA and independent gameplay verification remain required. Publication follows the original verification gate.
