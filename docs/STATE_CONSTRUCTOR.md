# Numeric state construction

`engine/state-constructor.mjs` creates the numeric part of a state instance and
calls required parser, trigger-initialization and layer-log hooks. The enclosing
manager subsequently registers the instance and invokes AfterInit property work.
The hooks must be implemented for complete execution; supplying no-op hooks is
only suitable for an explicitly scoped experiment.

Fresh BattleStateData initializes layer, changedLayer and caster attribution from
the requested amount, defaulting to one. The constructor's maximum limits only
layer. It does not recalculate changedLayer or attribution after the cap. For a
synthetic request of 8 and maximum 4.2, those values are therefore 5, 8 and 8.
The recovered state constructor skips this cap when isRecover is true. Supplied
restored data retains its changedLayer and caster map. Skill level defaults to one.

The oracle executes the original constructor, StateData.Create (for fresh data),
InitStateParams for numeric/absent parameters, and AfterInit. Ninety-six cases
cover request defaults, caps, recovery, restored data, skill defaults and numeric
parameters. UID allocation and parser maximum evaluation are supplied; superclass,
triggers, logs and property initialization are adapters/observers. table.deepclone
uses an identity adapter, so copying/aliasing is not verified.

An authored manager/constructor composition checks that initialization observes
the capped layer alongside the original changedLayer and caster attribution, and
that property work occurs after registry insertion and before record/event calls.
This is not a connected original manager-plus-constructor execution claim.

String/list state parameters, new command-parser construction, trigger registration,
creation-argument/source copying, complete property initialization, live formula
binding and gameplay validation remain incomplete. Unsupported string/list
parameters throw. The module is not a full BattleStateServer implementation.
