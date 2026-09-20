# PvE team states and per-Awakener properties

Scope: PC downloaded resources 144 / build 51. Code and isolated original-runtime evidence; no complete gameplay prediction.

`BattleStateServer.ChangeOwnerProperty` looks up the property's `BattleApi.ApiType`. If it is AWAKER_ATTR, the state owner is a Player and the battle is PvE, it calls `ChangeProperty` on every member of the owner's current `GetAwakerList()`. Otherwise it changes the owner's property component. A banned state suppresses the operation unless `extraData.ignoreBan` is true. This is mutation routing, not an inherited property getter.

`BattlePropertyServer.GetProperty` reads the recipient's stored properties (with special handling for tentacle counts). `BattleUnitBase.GetProperty` delegates to it. There is no generic player-property fallback in these getters.

## Mouchette's flat Strike bonus

States 124034 and 124037 have `ExistProperty.strikecard_damage_plus = StateArg1`. BattleApi classifies this property as AWAKER_ATTR. With a Player owner in PvE, applying the state therefore writes its contribution to each current Awakener. `BattleCmdServer.__GetShowDamage` reads `caster:GetProperty(strikecard_damage_plus)` for a Strike-tagged event, so Arachne can receive Mouchette's team buff without the getter inheriting it from Player.

`InitProperty` evaluates the expression, adds any applicable special value, applies ceiling, then routes the contribution unless `skipInitProperty` is set. The state records its contributed amount. `RemoveProperty` routes its negative through the same method. `StateArg1` does not contain `ChangedLayer`, so the ordinary layer-change path does not multiply this fixed contribution by duration. Full state merge/reapply semantics and roster changes remain outside this isolated check.

Mouchette's personal `i_damage_per_strikecard` is also AWAKER_ATTR, but its state is on Mouchette. Consequently the ordinary owner branch changes Mouchette, rather than distributing that bonus to Arachne. Property classification alone does not determine whether a bonus is shared: state ownership matters too.

## Replay consequence and STR caution

The observed +653 team Strike description is consistent with a per-Awakener +653 contribution. This resolves the apparent mismatch between a team-owned state and a caster-owned formula input. It does not prove that the contribution was present, unsuppressed and restored exactly once at the particular 2205-damage event.

Do not add a separate Player +653 on top of Arachne's already resolved flat Strike property. Likewise, `damage_plus` is classified AWAKER_ATTR, while the offensive setup separately reads Player and caster `damage_plus`. A combined UI STR display must not automatically be supplied as both values. Resolve the actual recipient properties and restoration path before predicting.

## Original-runtime check

Run `.venv/Scripts/python.exe tools/state_property_routing_oracle.py`. It executes copied-original `BattleStateServer.ChangeOwnerProperty`, using actual BattleConst and BattleApi type values. Synthetic adapters provide owner flags, PvE/PvP mode and an empty or four-member team; intercepted mutations reveal the exact recipients, property name and signed delta.

All **288** cases passed across three properties, both owner roles, both modes, ban/override combinations, deltas -653/0/+653 and team sizes 0/4. Evidence: `research/evidence/state-property-routing-runtime.json`. These are direct original-code routing assertions, not additional JavaScript differential vectors and not gameplay fixtures. The previously reported 5,960 arithmetic comparisons remain a separate count. The harness does not execute state construction, property mutation callbacks, numerical property limits, state restoration or complete lifetime/roster behavior.
