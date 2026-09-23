# Research API: bounded damage calculation stages

Entry point: `engine/calculate-damage.mjs`, export `calculateDamage`. The resolved Active, Passive, Fixed and Pure paths retain their historical `pc-res144-build51` scope. Fixed and Pure pre-hit arithmetic is also supported experimentally for `pc-res150-build51` and installed `pc-res151-build51`. Installed resource 151 additionally supports resolved Tentacle pre-hit calculation. All current-build paths reject `hitResolution`. These are experimental diagnostics, not verified gameplay predictions.

## Input boundaries

For damageType ACTIVE, supply exactly one offensive representation:

- `offense`: the complete resolved utility vector used by show-damage.mjs.
- `offenseSetup`: the complete explicit card/caster/player property input accepted by card-offensive-setup.mjs. Its build must match the root scenario. This is not a named-character/equipment resolver.

For damageType PASSIVE, supply `passive: {build, targetDead, baseDamage, passive1, passive2, passive3, dimensionFixPer}` instead. Every field is required, and the nested build must match the root. Active offense/setup, skillArgumentSnapshot and target/crit fields are rejected. The resolved Passive base expression may already contain source-specific factors; the API does not infer them or add Active buckets. Its trace shows the separate Passive target product and two rounding boundaries. A dead target skips the effect and cannot also supply a living-target hitResolution.

The same optional hitResolution can resolve a historical Passive hit through shields, incoming caps and ordinary HP subtraction. preventEligible must be false: original CheckPreventActiveDamage rejects non-Active categories. Immune is an already-resolved immunity decision, not the raw generic-immunity property; callers must account for subtype-specific eligibility before supplying it.

For damageType FIXED or PURE, supply the matching explicit `effect` input instead of Active/Passive inputs. Fixed requires a resolved base, dimension percentage and five target Fixed percentages; Pure requires only its resolved base. The current-build result stops at `preHitDamage`, cites `research/evidence/pc-res151-fixed-pure-runtime.json`, keeps `finalDamage` null and rejects HP/shield requests. `tools/run_theorycraft_request.mjs` exposes this same bounded operation to agents.

For damageType TENTACLE on installed resource 151, supply `tentacle` with a matching build, an already resolved `isCrit`, `tentacleDamage`, `critDamagePer`, four target damage percentages, Vulnerable, six resolved enemy-category/state percentages, `beDamagePlus` and `paraPlus`. Every field is required. The trace exposes each multiplication, the two flat additions and final ceiling/minimum. This method starts *after* the effect's initial parameter ceiling and does not reconstruct source/target selection, critical RNG or multiple-Awakener averages. See `research/evidence/pc-res151-tentacle-prehit-runtime.json`; `finalDamage` remains null.

The separate `calculate-player-tentacle-damage` theorycraft operation resolves the upstream `PlayerRole.tentacle_dmg` alias from explicit Player and Awaker properties, Power-layer count and Dimension percentage for installed resource 151. It averages each inside percentage across the supplied Awakers, then applies Weak, Dimension and Tentacle bonuses before the ceiling/minimum. The installed Power constant is fixed at -100% and is therefore not caller-supplied. This operation does not multiply by a card's occupation mastery or run the Tentacle effect. See `research/examples/theorycraft-installed-player-tentacle-damage.json` and `research/evidence/pc-res151-player-tentacle-runtime.json`.

The `calculate-tentacle-crit-damage` operation supplies the separate conditional bonus to use when `isCrit` is true. It requires an explicit `japan` boolean, Player `outsideCritDamage` and a nonempty list of Awaker `crit_damage` values. The international branch ceilings outside plus their average minus 50; the Japan branch uses outside alone. The operation does not establish which branch a historical replay used or whether a hit should crit. See `research/examples/theorycraft-installed-tentacle-crit-damage.json` and `research/evidence/pc-res151-tentacle-crit-runtime.json`.

`target` contains explicit, already-eligible crit and target inputs. Its conditional slots must already reflect actual card/skill/target eligibility. The API does not infer shield/barrier eligibility, forced critical flags, enemy categories or state properties.

For a damage expression that directly reads a stored ArgN, callers may supply `skillArgumentSnapshot: {raw, overrides, argumentIndex}` alongside `offenseSetup` with its `value` omitted. The index is one-based. Dense finite numeric raw arguments are ceiled first, then dense-prefix overrides replace them unchanged, including zero. The selected argument becomes the setup value; the normalized list is returned for audit. Supplying both this snapshot and a setup value is rejected. This path does not evaluate compound command expressions, infer character coefficients, or execute snapshot timing. Already resolved compound expressions must continue to use the explicit value interface.

Optional `hitResolution` must contain exactly: immune, block, puncture, hp, retainHp, limit, usedLimit, deathResist and preventEligible. The API supplies damage from the preceding target stage, so callers cannot independently override that intermediate amount. Immunity and prevention eligibility must be booleans; an immune hit cannot simultaneously qualify for active-damage prevention. The numerical helper requires a living target and explicit nonnegative values.

## Output boundaries

`mode: 'strict'` remains UNVERIFIED, with finalDamage null and no experimental models. `mode: 'experimental'` can return:

1. The recovered Active pre-hit model, including offensive and target arithmetic traces.
2. An incoming-hit request model containing original incomingDamage, explicit immunity decision, the shield helper tuple, afterRetain, converted, hpLossRequest and deathResistApplied.
3. An ordinary HP-subtraction model containing hpBefore, hpAfter, modeledHpLost, shieldAfter, overflowDiagnostic and callbackDescriptors. It uses the preceding request, clamps subtraction at zero HP and does not mutate the caller's input object.

The shield tuple is `[damageAfterShield, blockedDamageDiagnostic, shieldLoss, encounteredShield, fullyBlocked, shieldAfter]`. The original blockedDamage diagnostic can be negative when shield exceeds ordinary incoming damage. The request is not actual HP lost, and incomingDamage remains available even when immunity makes the request zero.

The HP-subtraction model computes one ordinary property change and describes its callbacks. It does not dispatch those callbacks, award statistics credit, update damage budgets, execute Old Embers/Fate Cut or process death. It must not advance a multi-hit sequence by blindly feeding either the request or the modeled HP back into the next hit: the appropriate event/state lifecycle must execute first. finalDamage remains null in every mode.

For example, a synthetic400-point incoming hit against5 HP, without other limits, returns incomingDamage400, hpLossRequest400, modeledHpLost5, hpAfter0 and overflowDiagnostic395. Enabling the supplied death-resistance flag instead yields request4 and hpAfter1. These demonstrate distinct output fields, not observations from gameplay. Callback descriptors use JavaScript numbers; Lua integer-versus-float signed-zero distinctions are not reproduced by this API.

The recovered boundary is now documented in [HP_EVENTS_AND_MULTIHIT.md](HP_EVENTS_AND_MULTIHIT.md): ordinary HP subtraction floors at zero, callbacks queue events, and the scheduler handles child effects before the next damage repetition. Attached actions can instead be appended at root level. These findings guide the missing executor; they do not make the current API a battle simulator.

## Verification

Active-prevention eligibility can now be derived in the API. Supply exactly one of `preventEligible` (explicit boolean) or `preventionProperties: {casterExists, casterPrevention, targetPrevention}` inside `hitResolution`. The API combines these properties with the scenario category and resolved immunity. Eligibility requires Active damage, no applicable immunity, a present caster, and either prevention property greater than zero. A missing caster disables eligibility even if the target property is positive. Values are resolved properties; the API does not discover the caster or reconstruct state effects. The existing retention threshold is applied only after eligibility and shield resolution.

This behavior is checked against 180 original BeHit cases, including the resulting converted damage, HP request and final HP. The oracle uses explicit lookup and property adapters; record, animation and combat event hooks remain disabled. The API's supported-category integration checks reuse independently tested offense components, rather than executing an entire original battle. Tentacle eligibility is tested but Tentacle offense is not enabled.

The hit-resolution object now accepts exactly one of `immune` (an explicit boolean decision) or `immunityProperties`. The latter contains `general`, `punctureImmunity`, and `categoryImmunities` with all five keys `Active`, `Passive`, `Fixed`, `Pure`, `Tentacle`. Each value is an explicit finite resolved property. The API derives the category and Puncture flag from the scenario, then executes the recovered immunity predicate. Negative and zero properties are inactive; positive properties are active. Puncture-specific immunity is checked first. Puncture otherwise bypasses general/category immunity; ordinary subtype checks general and matching-category immunity. Other-category immunity does not apply.

This predicate matches 270 original-runtime cases. Fixed/Pure API integration also compares resulting HP and shield against the original BeHit fixtures with raw immunity properties supplied. This removes the need for callers to calculate the decision but does not reconstruct the properties from equipment/states. Pure's effect supplies subtype 0, so Pure Puncture remains rejected even though the lower-level predicate can evaluate it.

`node --test tests/research-api.test.mjs tests/active-pipeline.test.mjs tests/skill-arguments.test.mjs` passes. The integration cases check cross-stage value propagation, rounding/cap ordering, immunity preserving incoming damage while not consuming shield, input rejection, build consistency and strict-mode withholding. Argument integration additionally distinguishes an ordinary fractional argument from a fractional override before card scaling, preserves zero overrides, and rejects ambiguous values and invalid indices. They are hand-designed synthetic integration cases, not additional original-runtime differential vectors or gameplay fixtures. The 6,878 component differential cases and 288 separate routing assertions retain their existing scopes.

## Separate Wheel mechanics search

Wheel passive graph discovery is intentionally outside the theorycraft request
API. `engine/wheel-mechanics-search.mjs` accepts an exact versioned mechanics
request and filters the sanitized capability catalog by free text, broad
mechanic category, effect type, crosswalk status and static-cycle presence.
`tools/search_wheel_mechanics.mjs` exposes the same operation to local agents.

Run:

`node tools/search_wheel_mechanics.mjs --input research/examples/mechanics-search-wheel-capabilities.json`

The response carries `analysisTrack: "mechanics"`. It returns static potential
graph metadata only; it does not execute passives, rank Wheels or become a
theorycraft, cheese, budget-scouting, gameplay-validation or holdout result.

The separate refinement resolver accepts a public Wheel ID and explicit client
refinement level, joins the ignored private crosswalk, and returns the initial
StateArg values without exposing source expressions. Run:

`node tools/resolve_wheel_refinement.mjs --input research/examples/mechanics-resolve-eternal-weave-refinement.json`

Its arithmetic is backed by 232 exact original-runtime comparisons. The result
remains in the mechanics track and stops before state attachment or execution.
