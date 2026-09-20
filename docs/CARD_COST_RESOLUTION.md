# Card cost resolution

## Connected payment integration

`tools/connected_card_payment_oracle.py` now connects original before-use `__CostEnergy` to original player `EnergyEnough`/`ConsumeEnergy` and original property subtraction in one Lua state. The 192 cases cover ordinary, X and capped-X requests; four energy values including a fraction; force modes; attached actions; and ignore-cost allowance. `tests/connected-card-payment.test.mjs` compares the authored plan/subtraction composition to actual stored energy, card realCost, event castValue, ignore/reset flags and ordered callbacks. This upgrades the earlier separate payment-component evidence. The full `DoEffect`, use-cost derivation, play checks, energy listeners and gameplay remain outside the chain.

## Command dispatch boundary

`engine/command-gate.mjs` reproduces the ordinary PvE play-command entry gate, matching 24 original `BattleEngine.OnReceiveCommand` cases. Waiting effects take precedence over a running root and battle-finished checks. Each waiting attempt increments the counter; at five or more the original calls the robot waiting handler between timeout-flag true/false. A running root with no waiting command also rejects dispatch. An idle unfinished battle resets waitingTimes before dispatch. The original test deliberately stops at a missing-card lookup and uses Camp2 to avoid conflating this gate with the Camp1 play-count cap.

This gate is not proof that it is the player's turn or that a play is legal. Camp1's per-turn cap is handled inside `lg_UseCard`, before card lookup; its response calls `lg_BoutEnd`, whose eligibility and effects remain separate. Robot response effects, cap/turn handling and the complete command-to-card execution chain are not yet composed. Preserve this boundary when adding a sequence scheduler.

## Normal PvE resource composition

`engine/card-use-resources.mjs` connects cost resolution, a non-keeper PvE play check, payment planning and energy subtraction. `node tools/resolve_card_resources.mjs inputs.json` accepts explicit costInput and conditions; variable-cost classification and affordability are derived rather than independently supplied. Rejected checks do not pay. An affordable ordinary play resets the ignore-cost allowance before payment, while an explicitly allowed unaffordable play preserves energy. X requests available energy. This remains component composition, not a connected original full-play run; it does not execute commands, turn checks, deck changes, targets or listeners.

The check component matches 90 original `BattleUnitBase.CanUseCard` cases. Original order checks the hand, keeper branch (excluded here), cost usability, card/owner blocks, command presence, death, coma, use/strike prohibitions, then ordinary energy. X skips ordinary affordability. The client constant table lacks CardFailedReason.Coma, so that original rejection returns no numeric reason; the model retains null plus a named gate instead of inventing a code. Full player-turn/actor eligibility remains unresolved outside this method.

`engine/card-cost.mjs` reproduces the resolved-input boundary of original `BattleCardServer.GetBaseCost`, `GetUseCost`, `GetFixedCost`, `GetVariableCostMode` and `ResolveVariableConsumeCost`. The original fixed-switch and variable parsing helpers also execute in `tools/card_cost_oracle.py`. The 108 cases cover absent/zero/numeric/X/X3/X0 configured costs, zero/low/high available energy, competing fixed settings, keeper cards, PvP absence handling, and negative modifiers.

Keeper cards use the supplied keeper cost first. Ordinary cards select the lowest active fixed-cost index, if any; X cards bypass fixed settings. Without an override, absent configuration gives zero base cost, X gives the display sentinel -1, and ordinary cost is max(0, origin + resolved delta). Use cost then applies the supplied harmonize modifier, except keeper, variable and the original PvP/no-config special case. Thus a fixed base cost is not necessarily the final use cost. X consumes all supplied energy; Xn resolves min(n, energy). No rounding is added at this boundary.

Inputs deliberately require resolved delta/harmonize values and explicit keeper/PvP decisions. The harness supplies those adapters; it does not validate their derivation from card tags, progression or states. The returned variable amount is not an assertion that payment occurred or the play was legal.

Next boundary: original `BEBeforeUseCard.__CostEnergy`, which branches for attached actions, forced plays, partial payments and ignore-cost rules before calling the player's energy methods. The source places forced X handling before forced ignore-cost handling; copying an ordinary free-play rule onto X cards would be unsafe without checking that path. Hand membership, targets, turn eligibility, resource mutation and action-generated effects remain outside this resolver.

## Payment branch checkpoint

`tools/card_payment_branch_oracle.py` now executes that original branch method plus original variable-cost parsing/resolution in 144 cases. `engine/card-payment-plan.mjs` agrees on whether payment is called, the requested amount, the SkillIgnoreCost flag and ForceConsumeMode cleanup. The attached-action branch wins first. Forced X cards take the variable-payment branch before the forced-free branch, even with IgnoreCost mode. Ordinary partial payment requests min(available energy, use cost). A normal unaffordable card only takes the ignore-cost branch if the supplied allowance is true.

The harness supplies EnergyEnough and observes ConsumeEnergy, returning the requested amount without changing resources. This is deliberately not proof of actual payment or play permission. The planner returns energyAfter null. Original player ConsumeEnergy itself reports the requested value after calling property subtraction; its event/record amount must not be equated to measured resource loss without checking the property path. Resource mutation and pre-play eligibility are the next integration boundaries.

## Connected energy subtraction

`tools/energy_payment_oracle.py` now executes original `BattleUnitPlayer.ConsumeEnergy` through original property subtraction in 30 cases. `engine/energy-payment.mjs` agrees on energy remaining, actual loss, reported cost, and ordered property/event/record descriptors. With 2 energy and a request of 5, actual loss is 2, reported cost is 5, and the record's requested delta is -5. The -1 sentinel resolves to available energy. Zero requests still reach the observed callbacks and event. Fractional values are preserved at this boundary.

The supported initial energy domain is 0..99, excluding abnormal over-cap initialization. The harness supplies a one-field clone adapter and property getter; listeners do not run. Cost branch selection and subtraction have separate original-runtime evidence, but a full original before-use-to-payment chain, energy-trigger effects and play permission still require validation. A successful low-level payment call cannot prove the card was playable.
