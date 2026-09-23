# Local calculator website

`website/dist/index.html` is the general resolved-input formula sandbox. It is visibly labeled as the theorycrafting track, and its direct calculations and shareable A/B experiments carry `analysisTrack: "theorycrafting"`; inputs labeled as cheese analysis are rejected. The adjacent Actions, States, Timeline, Builds, Property Snapshots and Rules pages expose bounded command, state, sequence, build, captured-input and evidence components for human or agent-led theorycrafting. `mouchette.html` preserves the Mouchette/Arachne case study. These pages do not form a complete battle simulator or infer a final build from a character name.

The Property Snapshots page accepts complete live resource-144, resource-150 or bounded resource-151 caster, player, target and optional card property maps. It runs the verified local snapshot adapter, displays pre-hit damage and exposes every property read, including original getter zero defaults. Schema 2 also displays modeled HP loss after immunity, shield/Puncture, retained-HP, incoming-limit and death-resistance handling. Its synthetic installed-client resource-151 single-hit example renders 317 pre-hit damage, consumes 50 shield, reports 267 modeled HP loss and records 79 property reads. Its installed-client sequence example threads only HP and Block across two hits and reports 150 modeled HP loss. Partial maps and unsupported branches fail closed; callbacks, death execution, independent gameplay verification and verified `finalDamage` remain unresolved.

The Builds page has separate source-bound selectors and payloads for the installed resource-151 client, previous resource 150 and historical resource 144. The installed progression data resolves 60 character identities and is bound to 2,700 exact executions of resource 151's original primary-stat lookup. Its eight source modules are byte-identical to resource 150, and the derived character rows are equal. Advancement primary-stat rows are included where supported. The Wheel picker searches all 146 pinned identities by name, associated owner, main stat and normalized mechanic tags, marks owner matches without assuming a unique signature, and keeps passive execution unresolved. The page refuses cross-build data use; advancement passives, equipment effects and battle-property assembly remain unresolved.

`tools/prepare_local_website.py` prepares 136 explicitly allowlisted authored engine modules plus sanitized catalogs and page assets. It does not publish original Lua, native libraries, keys, screenshots, replay observations or private research directories. The verification suite checks copied engine modules byte-for-byte against their authored sources, along with static references, JavaScript syntax and calculation integrations.

The Actions page can render ordered single-target Block gain and the shield consumed by later supported damage rows. The underlying formula/recipient/storage path has 911 exact copied-original component comparisons. This adds an evidence-backed command operation, not automatic loadout-property resolution or gameplay validation.

The Actions page also renders ordered target/caster Heal, including maximum-HP overflow and the HP seen by later damage rows. Its formula/recipient/storage path has 871 exact copied-original component comparisons. Repeated and multi-target Heal, Heal-trigger events and revival remain unsupported.

On 2026-09-20, a local HTTP browser smoke test loaded the original seven pages in the in-app browser with their expected titles and headings and no browser console warnings or errors. An Active example with base 1000, 150% team Damage Amplification, a critical hit, 150% character Crit DMG bonus and 50% Vulnerability rendered 9,375 with the expected 1,000 -> 2,500 -> 6,250 -> 9,375 trace. The Actions synthetic cost-order example completed with 500 modeled HP lost, zero energy left and two accepted actions. That pass found and corrected four pre-existing mojibake strings on the Actions page, then verified the corrected page from a fresh browser origin. On 2026-09-21, the Property Snapshots page loaded through the verified runtime. Its schema 2 resource-150 example rendered 317 pre-hit damage and 267 modeled HP loss after consuming 50 shield, with 79 recorded property reads and no displayed error. A later local browser pass ran the new two-hit sequence example through the checked runtime, displayed 150 total modeled HP loss, 2/2 executed hits and the target transition from 1000 HP / 150 Block to 850 HP / 0 Block, with no browser warnings or errors. The Rules catalog now contains 269 evidence entries, including installed resource-151 progression, paid catalog-backed state-to-Active sequence composition and its reproducible freeze boundary, 102-record PvE budget frontiers, expanded retrospective replay consistency, two-build static DEF-consumer inventory, Wheel discovery and replay-domain routing. Full interactive build-planner and responsive QA remain pending.

This was a bounded smoke test. States, Timeline, Builds and Mouchette were loaded but not interactively exercised; responsive layouts, import/export flows, browser Blob execution and the optional WebMCP surface remain unverified. Browser rendering does not add gameplay validation.

On 2026-09-21, the updated Builds page loaded from a fresh local origin with
the 146-Wheel picker, search module, both client progression payloads and all
dependent authored modules present. The accessibility tree exposed the filter,
owner labels and main-stat labels. That pass also caught and corrected an empty
character selection being displayed as an owner match. Search behavior remains
covered by the deterministic engine/API tests; this browser check does not
validate Wheel passives.

The Rules catalog now contains 269 entries. Its Wheel mechanics entry reports
the sanitized 141-of-146 identity-to-initial-state crosswalk, 63 direct property
maps and 229 fully resolved trigger-command references. The Builds page exposes
the sanitized capability fingerprint beside its public discovery metadata and
main-stat preview; it does not execute those passive state graphs.

The same mechanics report now expands literal state-add links into a static
potential graph of 353 states, 260 distinct trigger commands, 589 command-row
occurrences and 32 effect types. Three cyclic components and nine runtime-state
identities remain explicit blockers to naïve graph evaluation. This inventory
guides engine coverage work but does not widen the website's execution claims.

The packaged site also includes
`wheel-mechanics-capability-catalog.json`, a 146-row mechanics-discovery index.
For 141 uniquely crosswalked Wheels it reports static graph size, effect types
and thirteen broad categories without client text or formulas. Five unresolved
crosswalks remain fail-closed. This is machine-readable inspection data rather
than passive execution or theorycraft ranking.

A local browser check selected Eternal Weave in the Builds page and rendered
the separate mechanics-track fingerprint `state, ultimate-energy` with three
potentially linked states. The page displayed the activation, magnitude, timing,
legality, stacking and optimality limitations, and produced no browser warnings
or errors. This UI check does not add gameplay validation.

On 2026-09-22, a fresh local-browser check selected the installed
`pc-res151-build51` payload, Mouchette at level 90, Gnostic rank 5 and
advancement talent 122481 at level 10. The Builds page rendered base
CON/ATK/DEF 168/198/168 and advanced 219/258/219. Assembling known components
produced the same build identity, the advancement arithmetic trace and an empty
`issues` array; `finalDamage` remained null with equipment, passives, battle
properties, sequencing and gameplay validation listed as unresolved. This
checks the browser wiring of the installed-client progression path, not the
accuracy of a complete build or damage outcome.

The packaged authored module `wheel-mechanics-search.mjs` and its local CLI
provide the same catalog as a strict mechanics-track query. This API remains
separate from `theorycraft-api.mjs`; a search result cannot inherit a simulated
build, strategy, cheese, budget or verification claim.

The Rules catalog also records the installed-client Wheel initial-state drift:
136 retained direct-property maps remain equal, three changed, and two old Item
IDs have unique current full-icon replacements with equivalent initial rules.
One historically missing Wheel now has a unique current Item and matching
catalog main-stat base. The Builds page carries these statuses into current-build
previews and assembly; four ambiguous mappings fail closed. Current enhancement
scaling and Wheel passives remain unverified there.

A fresh local-browser check on 2026-09-22 selected resource 151, then the
historically ambiguous Wheel Unseen. The picker explicitly reported
`HISTORICAL_CROSSWALK_UNRESOLVED` and withheld a current-build main-stat
contribution. Selecting Ever Sunward instead, with E3 + 12 enhancement,
rendered a 28.8% pinned-catalog Crit Rate preview and stated that its installed
main-stat base matches while current enhancement scaling remains unverified.
The source audit identifies Ever Sunward's unique current Item replacement;
the browser check confirms the warning and preview wiring only.

The authored Wheel refinement module is also packaged, but the full private
parameter map is not. Its local resolver uses the ignored client crosswalk and
returns StateArg values for an explicit refinement level. The arithmetic has
232 exact original-runtime comparisons and stops before passive execution.

No hosted Site is registered or deployed. There is no `.openai/hosting.json` project ID. The source checkpoint is on GitHub, labeled as unverified research. Deployment as an accurate build recommender remains prohibited until the gameplay prediction and independent holdout gate passes.

Remaining product work includes source-backed character/build normalization, broader action and encounter execution, complete event/HP behavior, full browser and responsive QA, independent gameplay regression, a separately frozen holdout, discrepancy review, and publication only after the original gate passes.
