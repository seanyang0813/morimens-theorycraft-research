# State property contributions

`engine/state-property-contribution.mjs` tracks one non-card state's contribution
to one property. Initialization evaluates its expression, adds the resolved
special bonus if applicable, and rounds upward. The contribution is stored even
when initialization is skipped or its owner mutation is banned. These flags are
not interchangeable with erasing the stored contribution.

Expressions containing the literal `ChangedLayer` are marked layer-dependent.
On an ordinary update they are evaluated again and their rounded result is added
to the stored contribution. This also happens for a zero changed-layer argument;
the expression, rather than this method, determines the resulting delta.

The original special properties are weak_per, frail_per and vulnerable_per. With
a positive changed-layer argument, they instead request only the nonnegative
increase over their remembered special bonus. The maximum is retained if a later
caster supplies a lower bonus. This branch replaces expression evaluation even
when the increase is zero. The increase is not rounded here and can be fractional.

The original-runtime oracle runs InitProperty, UpdatePropertyWhenLayerChanges,
CalcSpecialValue and ChangeOwnerProperty together for 432 cases. It covers one
ordinary property and vulnerability, positive/zero/negative updates, fractional
values, special-bonus increases/decreases, skipped initialization and bans. The
authored component matches stored contributions, requested owner mutations and
expression-evaluation order. Its additional sequential-maximum test is authored
composition evidence, not a separate original-runtime fixture.

Expression results, ban flags and caster property values are supplied to the
oracle. The caster is present and is not an Awakener; the special PvE player-value
branch is not exercised. The owner is neither player nor card. Recipient mutation
is observed, not applied by BattlePropertyServer. The authored module returns
requested deltas for separate routing and mutation; it does not know bans, choose
recipients, construct states, register events or resolve damage. Missing/failed
expressions throw instead of emulating the original partial initialization error.

This is another link toward general buff-to-damage sequencing. Complete state
creation, property-server effects, connected battle execution and independent
gameplay verification remain outstanding.
