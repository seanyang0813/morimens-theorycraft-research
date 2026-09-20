# Card bonuses to state layers

The original PC144 methods ApplyCardStateLayerPer and
ApplyCardFixedStateLayerPer use the same arithmetic with different property
families. For each matching state ID, they multiply the incoming layers by:

`1 + cardPercent / 100 + linkedCharacterPercent / 100`

The linked character percentage applies only when the property has a linked
character property, a caster exists, and the card matches CardTypeInstruction.
Without a card, the layer count is unchanged. There is no rounding inside these
methods. Matching duplicate state IDs apply the multiplier repeatedly; the
authored implementation preserves this observed behavior rather than deduplicating.

For illustration only, 2.2 layers with 50% card and 25% eligible character bonuses
become 3.85 before later rounding. These synthetic numbers are test inputs, not a
character build or recommended gameplay baseline.

`tools/card_state_multiplier_oracle.py` executes both original methods for 128
cases. The property family and state mappings are synthetic; card selection,
type matching, caster presence, expression lookup and properties are adapters.
`engine/card-state-multiplier.mjs` matches the numeric results and relevant
property-read order. Selection of the actual property family, live property
changes, surrounding layer pipeline and gameplay are not verified by these cases.
The module does not yet enable a complete state-add effect in the website.
