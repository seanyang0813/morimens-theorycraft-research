# Attached-action request boundary

`tools/attach_post_action_oracle.py` executes original resource-144 `BEAttachPostAction.DoEffect` initialization and one original `__DoMultiEffect` iteration against explicit non-monster target, role-manager and record-manager adapters. Eight fixtures cover Arachne's five-argument request, Mouchette's four-argument request, missing defaults, a fractional repeat value, trigger flags `0`, `1` and `2`, positive/zero/negative `seal_attachpost`, and an empty target list.

The first parameter is the attached skill ID. The second value is copied unchanged to `totalEffectTimes` and `leftEffectTimes`, defaulting to `1`; this boundary does not round or execute later repetitions. Parameter 3 produces `attachPostParam.isTriggerBST=true` only when it equals `1`. Parameter 4 is passed to `OnAttachPostAction` as `showPerform` and defaults to `0`. Parameter 5 is the skill level passed to `UseAttachPostCard` and defaults to `1`.

For each present target, the effect reads `seal_attachpost` from the current caster. A positive value suppresses both `OnAttachPostAction` and `UseAttachPostCard`; zero and negative values continue. The record request retains caster UID, target UID, skill ID and performance value. The card request retains target UID, skill ID, skill level and the trigger flag.

The byte-identical installed resource-150 effect also reproduces all eight fixtures when executed with its current dependencies. `engine/attach-post-action.mjs` accepts those two explicit builds and rejects monster targets and other builds. Its output is a request plan. It does not construct or play the temporary card, execute its command, deliver callbacks, traverse later repetitions, or establish gameplay damage.
