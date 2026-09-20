# General state-layer calculation

`engine/state-layer-pipeline.mjs` implements the recovered PC res144 build51
BEAddStateParent.__CalcStateLayer pipeline. It returns the calculated layer count,
an arithmetic trace, and the ordered property reads. This is a component for
general buff interactions, not a complete state lifecycle or battle simulation.

The order is:

1. Round the requested count upward; an explicit null means the original default
   of one. Numeric strings are intentionally unsupported.
2. Unless skipCasterStateLayerPerAfterFormula is set, apply matching caster
   percentages. The special power-by-command percentage requires a non-trigger
   command, an eligible current card skill, and an Awakener caster.
3. Within that same branch, non-trigger commands apply ultimate, command-card,
   and selected-card percentages.
4. Apply target percentages.
5. Unless noDirectCmd is set, apply target direct-command percentages. A trigger
   does not suppress this target stage.
6. For non-trigger commands without noDirectCmd, apply ultimate-fixed,
   command-card-fixed, selected-card-fixed, and caster direct-command percentages.
   The earlier skipCaster flag does not suppress these stages.
7. Apply CalFinalVal for each match in DimensionStateList, then round upward.

Each ordinary matching percentage multiplies by `1 + percent / 100`. Selected
card percentages combine with eligible linked character percentages inside one
multiplier; see CARD_STATE_MULTIPLIERS.md. No intermediate rounding is added.

All context flags and property families must be supplied explicitly. An empty
family represents an explicitly absent modifier, not an unknown value. Current
card and modifier card are separate contexts because the original helper can
select a trigger state's owning card. `currentCardSkill` must include the original
BattleCardServer class and card-type eligibility checks. The caller resolves that
eligibility and the selected card; this module does not perform those lookups.
Property arrays preserve supplied traversal order and duplicate state matches.
Real BC maps use Lua pairs, so a future resolver must preserve the observed order
rather than assuming an arbitrary order is numerically interchangeable.

`tools/state_layer_pipeline_oracle.py` runs original __CalcStateLayer and its
original percentage, direct-command, card-selection and dimension-selection
helpers together. Its 392 cases vary trigger, skip, direct-command, ultimate,
card-type, role, dimension, missing card/caster and mapping-match branches. The
authored pipeline matches both final layers and property-read order.

The oracle uses synthetic ordered property families, state-ID expression results,
property getters and current-card context. CalFinalVal itself is a supplied 1.3
multiplier; these tests do not verify dimension arithmetic. Both instruction and
card-skill matching use one supplied flag in the fixture. Trigger-state-owned
card selection is not exercised. Actual property derivation and mutation, original
config resolution, state creation/merging, events and gameplay remain unverified.

An authored composition test feeds the pipeline into planAddStateRequest, checking
initial rounding and immunity short-circuiting. This composition is not a connected
original AddState-to-modifier execution claim. These modules are not yet offered
as a complete state effect in the website.
