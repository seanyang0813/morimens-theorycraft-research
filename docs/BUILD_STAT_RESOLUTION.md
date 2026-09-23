# Catalog-derived primary stats

## Current installed-client path

The build planner can select `pc-res150-build51`, whose character progression payload is generated from the installed client's `AwakerConfig`, `AwakerUpgrade`, `AwakerTalent`, `ActorAttrType`, `Constant`, `FuncTable`, `AwakerDataUtils` and `AttrUtils` modules. `tools/build_current_client_build_data.py` executes the original current-client `GetAwakerBaseAttrValue` lookup for 60 uniquely resolved characters at five levels, Gnostic ranks 0/1/5 and all three primary stats. All 2,700 cases match the authored resolver. The same payload contains supported current advancement primary-promotion rows, and the tests exercise every recorded talent at level zero and its maximum level through the shared client rounding rule.

This current path is mechanics evidence for progression assembly. It does not resolve advancement passives, equipment, substats, battle-start effects or final battle properties, and it receives no gameplay or holdout credit. One SKeyDB character identity remains unresolved. The older `pc-res144-build51` dataset is retained as a separately labeled historical research build.

The broader client-config audit found 120 one-point rounding differences across 97,200 comparisons. All 120 are now confirmed by original compiled Lua expressions, with 240 adjacent-level controls also recorded. See PRIMARY_STAT_CLIENT_AUDIT.md before treating this preview as client-equivalent.

`engine/build-stats.mjs` exposes `resolvePrimaryStats(input, catalog)` for the build resolver. The agent CLI is `node tools/resolve_build_stats.mjs inputs.json`. It uses the same saved catalog as the planner.

Every input is explicit: catalogRevision, characterId, level, gnosticBonusLevels (CON, ATK, DEF), and soulforgeBonusPercent. These are resolved bonuses, not Gnostic or Soulforge ranks. Rank-to-bonus mapping and legal combinations are not implemented. No omitted bonus becomes zero, and no out-of-range level is silently clamped.

The saved SKeyDB `awakener-level-scaling.ts` supplies the calculation:

1. `ceil((primaryScalingBase + level + gnosticBonusLevels[stat]) * statScaling[stat] - 1e-9)`.
2. `ceil(firstResult * (1 + soulforgeBonusPercent / 100) - 1e-9)`.

The supported level range is the source's 1–90 range. Each stat returns both raw and rounded stages, along with pinned catalog revision and source-file hashes. Output is marked CATALOG_DERIVED and finalDamage remains null. This is secondary-source arithmetic, not an original-client or gameplay verification claim.

Regression coverage includes the previously used explicit Mouchette ATK inputs (90, +10 bonus levels, +30% primary bonus → 198 → 258), Arachne's explicit 90/+10/+0% ATK → 138, all catalog characters at levels 1/70/90 with explicit zero bonuses, and rejection of missing or invalid inputs. Those examples do not establish that a particular loadout supplies those bonuses.

Substats, Wheel effects, team properties, action sequences, and final battle stats remain unresolved. The build planner does not auto-apply this resolver because its current saved plan lacks explicit progression choices.

## Wheel main-stat preview

`engine/wheel-stats.mjs` accepts catalogRevision, wheelId and explicit enhanceLevel (0–15, corresponding to E0 through E3 + 12). It uses saved `gameplay-math.json` series selected by rarity and mainstatKey. Growth starts at enhancement 4: `base + max(0, enhanceLevel - 3) * perLevel`. The output distinguishes flat values from percentages and preserves raw arithmetic before the source's two-decimal display formatting. Description rank caps at four (E3); this does not execute a passive.

The planner now previews this calculation and exports optional wheelEnhanceLevel. Legacy plans without this field preserve its absence; null is explicitly unknown; zero means E0. Changing the selected Wheel clears enhancement to unknown. All 146 catalog Wheels have matching scaling series. Coverage exercises all sixteen enhancement levels, the no-growth boundary through E3, SSR Realm Mastery 36 → 39 → 72, and SSR Crit DMG 43.2% at maximum. This remains catalog-derived evidence, not final character stats or gameplay validation.

## Wheel discovery metadata

The pinned catalog now retains normalized associated-owner labels and mechanic
search tags where SKeyDB provides them. `engine/wheel-search.mjs` exposes the
same exact search to the build planner and agent API across all 146 Wheel
identities. It can filter by free text, associated owner, realm, main stat and
exact tags, and it reports truncation explicitly.

This is a discovery surface rather than a passive simulator. An owner match is
not called a unique signature because one character can have multiple associated
Wheels. Tags such as Strike or Pursuit identify candidates to investigate; they
do not specify numbers, activation rules, stacking, legality or optimality. No
passive description or lore is copied into the public calculator catalog.

Agents can run the same search through
`research/examples/theorycraft-search-wheel-catalog.json` and
`tools/run_theorycraft_request.mjs`.

## Wheel-to-state mechanics boundary

`tools/audit_wheel_state_crosswalk.py` joins the pinned SKeyDB Wheel icon asset
identifier to the basename of the PC client's Weapon icon. The exact join is
unique for 141 of 146 public Wheel identities. Every unique row exposes an
initial state, a state target and at least one parameter slot. One Wheel is
missing from this client export and four icon identifiers are reused by multiple
client rows, so those five fail closed.

All 141 unique initial states resolve in the client State catalog. They contain
63 direct property maps and 229 trigger-command references across 190 unique
commands; every referenced command is present in the client Cmd catalog. Four
initial states have no trigger command, while the others have one to four. This
shows that a general passive engine must support both retained properties and
event-triggered command graphs instead of treating every Wheel as one scalar.

Following only literal `BEAddState` targets expands the 141 initial states into
353 potentially linked states at a maximum depth of three. Those states refer
to 260 distinct trigger commands and 589 command-row occurrences across 32
effect types. The graph includes three small cyclic components and nine dynamic
state-add rows whose state identity comes from runtime arguments. This is a
static superset: conditions, event timing, targets and mutually exclusive rows
still decide which edges execute. A simulator must dispatch events and enforce
state lifecycle rules; recursively applying every edge would be incorrect.

`research/evidence/wheel-mechanics-capability-catalog.json` converts that graph
into a public per-Wheel discovery index. It exposes only public Wheel identity,
crosswalk status, graph-size facts, effect-type names and broad categories such
as state, damage, block, healing, energy and card operations. It excludes client
descriptions, parameters and judgement expressions. The local website package
ships this JSON for human or agent inspection, but does not execute it.

This establishes a general entry point for passive reconstruction:

`Wheel identity -> client Weapon row -> initial State -> later state/command graph`

The current audit stops at the initial-state boundary. It does not execute the
state graph or interpret private parameter expressions. The four Mouchette and
Arachne associated Wheels used by the case study all join uniquely, but that
does not show that any Wheel is equipped, active, legal, optimal, or uniquely
owned. The public report contains aggregate counts, hashes, and a small derived
case-study boundary; raw client rows stay private. See
`research/evidence/wheel-state-crosswalk-audit.json`.

## Wheel refinement parameters

The private client crosswalk contains 63 unique initial `StatePara` expression
forms. Five are numeric literals; the other 58 use a restricted
`base + GetRefiningLevel() * slope` grammar, including an optional implicit
slope of one. `tools/wheel_refinement_oracle.py` executes every dynamic form at
refinement levels 0–3 through the original compiled PC `FuncTable`. All 232
comparisons match the authored arithmetic exactly.

`engine/wheel-refinement-parameters.mjs` exposes the strict arithmetic boundary,
and `tools/resolve_wheel_refinement.mjs` joins a public Wheel ID to the private
client row locally. For example, Eternal Weave at refinement level 3 resolves
StateArg1/2/3 to 25, 40 and 10. This supplies initial state arguments only; it
does not equip the Wheel, attach the state, execute direct properties or fire a
trigger. Detailed expressions and the full per-Wheel values remain private.

## Initial Wheel property contributions

The 141 uniquely crosswalked initial Wheel states contain 100 direct property
entries across 63 states. All 100 use one of seven bounded numeric forms: a
named StateArg, a numeric literal, explicit Physique scaling, or explicit ATK
scaling with a ceiling. All 141 initial attachments target the command owner.
`research/evidence/wheel-initial-property-audit.json` publishes only aggregate
grammar counts and source hashes.

`engine/wheel-initial-properties.mjs` resolves those source-bound expressions
and reports both the raw result and the separately matched local-client
`InitProperty` ceiling result. `tools/resolve_wheel_initial_properties.mjs` combines the private
crosswalk, refinement resolver, and initial State property map locally. The
request must provide owner ATK/Physique values when an observed expression
reads them; unsupported syntax or missing values fail closed. Eternal Weave at
maximum refinement therefore requests a 25-point `o_block_per` contribution,
while Doomsday Rampage requests 60 points each for its direct attached-post and
ultimate outgoing-damage properties.

The 102-replay retrospective audit covers 812 serialized Weapon states. Of 793
with unique public crosswalks, all match the expected state identity, one
refinement level, embedded direct-property definition and raw serialized
property contribution. Five Fin of Sorrow snapshots preserve fractional raw
values where local client `InitProperty` would ceil. The serialized role
properties preserve the same fractions, so the calculator now exposes these
as distinct boundaries instead of silently rounding the server-prepared state.
The corpus contains two Weapon states for 405 of 408 Awakeners, one for two,
and none for one; a build planner therefore needs two optional Wheel slots.

This result describes initial direct property expressions only. It does not prove
equipment legality, attachment timing, trigger behavior, recipient mutation,
later updates, stacking, final damage, or gameplay agreement.

## Installed-client Wheel drift

`tools/audit_current_wheel_initial_states.py` compares the 141 historically
unique Wheel-to-Item links with the installed resource-151 Item and State
tables. The exact Item ID, full icon asset, initial state, target and StatePara
values still agree for 139 Wheels. Two historical Item IDs are absent, but
each has exactly one current Item with the same full icon, main/sub-attribute
rows, state parameters, target and initial direct-property map. All 141
source-confirmed current Items therefore keep the historical main/sub-attribute
rows. Of the 139 retained Item IDs, 136 initial direct-property maps are
unchanged and three changed. The changed maps include two property-name
substitutions and one owner-attack source change; historical expressions must
not be reused for those Wheels in current-build calculations. The sanitized
count, exceptions and source hashes are in
`research/evidence/pc-res151-wheel-initial-state-compatibility.json`; detailed
client rows remain private. The website and local agent build assembler now
refuse a current-build Wheel main-stat contribution when this mapping is
unresolved, and expose changed direct-property rules separately from preserved
catalog main-stat previews. A formerly missing Wheel also has one unique
current exact-icon Weapon Item whose sub-attribute code and base value match
the mapping established across the other 141; its historical passive-rule
comparison remains unavailable. Four crosswalks remain ambiguous. No Wheel
enhancement scaling or full Wheel execution is validated in gameplay.

The installed resource-151 `ItemDataUtils` bytecode has a narrower static
cross-build result. After normalizing the client's instruction encoding, 178
of its 182 direct function prototypes match the historical PC copy; the
five candidates for Weapon item construction and attribute lookup/display
match exactly in their parameters, constants, upvalues, child structure and
instruction bodies. Four other functions differ. This narrows the client
change search but does not reveal server-calculated enhancement values or
prove that the SKeyDB scaling curve is the installed game's rule. The
identifier-free report and reproducible audit are
`research/evidence/pc-res151-item-data-utils-parity.json` and
`tools/audit_installed_item_utils.py`.

A focused installed-bytecode audit identifies the separate
`ReqCalWeaponAttr` client entry point and its
`ProtoManager.Instance.ReqServer(GameRequest.OnCalWeaponAttr)` request, with
success and failure callbacks. The request body is equal to the historical PC
copy. This confirms that the client asks for a weapon-attribute calculation;
it does not expose the server's enhancement arithmetic, response values or
battle-property application. The identifier-free evidence is
`research/evidence/pc-res151-weapon-attribute-request.json`, reproduced by
`tools/audit_installed_weapon_attr_request.py`. Current-build Wheel enhancement
values therefore remain catalog previews until independently checked against
server-returned values or gameplay.
