# State-layer limit calculations

`engine/state-layer-limits.mjs` implements the two recovered unit limit methods.
Both find the first matching rule with a positive limit, subtract usage, clamp
remaining allowance to zero, take the smaller of the requested count and allowance,
then round upward. If no positive matching rule exists, they ceil the request.
Zero and negative limit properties do not block an addition.

The statistics-based method reads the mapped usage property. The total method
reads the current live state's layer count, treating absent/deleted states as zero.
Its registry lookup occurs only for a matching positive limit. Statistics-based
rules read usage even when the limit is nonpositive. The input rule order is
explicit because the original loops with pairs and returns at the first positive
match; the model does not sort or take the minimum across every rule.

432 original method cases cover state matching, nonpositive/fractional limits,
fractional requests, usage, and missing/deleted/live states. They use a synthetic
single-entry property mapping and explicit getters. Multiple-rule order is covered
by a separate authored code-derived test, not that runtime fixture. Actual property
derivation and statistics accumulation/reset are not implemented here.

In an applyState request, perLimit and totalLimit each accept null (callback absent),
a finite number (explicit resolved callback result), or `{"rules":[...]}`. Each rule
contains stateIds and limit; statistics-based perLimit rules also require used.
totalLimit rules read the owner's current registry. The trace retains both input
and output of each calculation. A rule with limit zero differs from the explicit
resolved result zero: the former is inactive, the latter can block the request.

The original AddState parent passes its original calculated layer count to both
limit callbacks. Consequently, a later total result may overwrite an earlier
positive statistics-limit result; it does not necessarily take their minimum.
An earlier zero result on a positive request still stops before total evaluation.
The integration preserves this behavior. Whole-sequence execution remains
authored composition, not independent gameplay validation.

## Active PC144 mappings and unresolved counter writer

`tools/build_state_limit_catalog.py` reads the active mapping tables from original
BattleConst bytecode and joins their literal BattleApi state IDs. The resulting
`research/evidence/state-limit-catalog.json` contains three active rules:

- Poison state 3068: be_state_layer_limit_posion minus
  be_state_layer_statics_posion; total limit be_state_layer_limit_posion_max.
- Counterattack state 3905: total limit be_state_layer_limit_retaliate_max.

BattleApi also defines be_state_layer_limit_retaliate, but the active statistics
mapping does not include it. The resolver does not activate every similarly named
API property. States 76447 and 76448 supply the two total-limit properties via
StateArg1 in the exported config.

`resolveStateLimitRules` joins the catalog to supplied numeric property values and
produces the rule arrays accepted by applyState. Missing usage values throw. An
exact-reference audit of available prototype/config exports found no established
writer for the poison statistics property; that does not exclude dynamic names,
native code or missing downloaded files. No automatic usage increment or reset
is implemented or inferred from successful state additions. The catalog retains
source hashes and exact-reference paths so this unresolved issue is reviewable.
