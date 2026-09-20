# Stored mastery updates

## Initial values are a separate boundary

`tools/property_initialization_oracle.py` executes the original property constructor in 24 numeric cases. It rounds each supplied property upward, preserves a supplied final mastery even when inconsistent with base mastery and percent, and does not create a missing final mastery property. `engine/property-initialization.mjs` reproduces this numeric subset. The base constructor is a no-op adapter; role creation and later hooks are not executed. Thus the change-hook formula below must not be substituted for constructor behavior. Initial server/copy properties and subsequent changes both matter.

Source inspection also distinguishes `TeamDataUtils.GetTeamOccMaster` (sum of character preview mastery times each character's percentage), `BattleUnitPlayer.GetTeamOccMaster` (ceiling of character stored mastery plus player stored mastery), and the player property `occupation_master_final`. These are different access paths, not interchangeable values. The two team getters are source-inspected, not runtime-validated here. This checkpoint does not resolve the Mouchette scenario's initial final mastery.

## Mutation hooks

`tools/mastery_property_oracle.py` executes original BattlePropertyServer.ChangeProperty, add/subtract hooks and nested SetProperty for stored occupation_master and occupation_master_final_per. It records 130 original cases with positive, negative and zero deltas, including fractional values within a nonnegative domain.

For a nonzero change, the original hooks recompute `ceil(occupation_master * (100 + occupation_master_final_per) / 100)`. If this changes occupation_master_final, its owner callback and property-change send happen before the callbacks for the initial changed property. If rounding leaves final mastery unchanged, only the initial property's callbacks fire. ChangeProperty with a zero delta does not enter either hook.

`engine/mastery-property.mjs` reproduces the stored values and ordered callback descriptors; it does not dispatch the events. The existing singularity final-mastery resolver also agrees with every resulting value. This helps a future sequence executor preserve what later triggers can see without inferring starting mastery from character previews.

Scope limits: initial properties are supplied explicitly. The constructor does not execute. The oracle owner has no IsRoleType method, so RefreshKeeperskillPer returns early; player keeper-skill recalculation is outside these cases. Owner callbacks and property-change sends are observational spies. No complete team assembly or independent gameplay validation is claimed.

The additional local inventory inspection found that BattlePVEMockDataUtil assembles mock inputs and explicit copyProperties; it does not itself provide the missing owned-character level-substat formula. AwakerDataUtils.GetAwakerLevelChangeAttrImprove computes only primary-stat deltas for preview. These negative findings are limited to the inspected methods.
