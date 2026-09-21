# Attached temporary-card construction

`tools/use_attach_post_card_oracle.py` executes the original resource-144 `BattleUnitBase.UseAttachPostCard` method against card-constructor, card-manager, record-manager and effect-manager observers. Four fixtures cover Arachne and Mouchette skill identifiers, different owners/camps/targets, an optional pre-command and both trigger-parameter values.

The method requests a temporary card with the attached skill ID and level, the target unit as owner, that owner's camp, and deck `NoneDeck`. It records a new-card payload with `NoneDeck`, boolean `true` and the camp, then calls `SetCurUseCard` with the temporary card and owner UID. The first record argument is intentionally retained as an unidentified table because this boundary does not establish its construction semantics.

The caller's `attachPostParam` table is assigned by identity to the temporary card's main command. The method then creates, in order:

1. `BEGenerateTargets` for the main command with an empty client target list and `cancelable=true`.
2. `BEBeforeUseCard` for the main command.
3. An optional pre-command `BECreateSkillPhase` with `skipPhase=true`.
4. The main-command `BECreateSkillPhase`.
5. `BEAfterUseCard` with the owner's camp.

The byte-identical installed resource-150 method also reproduces all four fixtures when executed with its current dependencies. `engine/use-attach-post-card.mjs` therefore accepts those two explicit builds and rejects implicit or other-build inputs. It does not execute the effects, initialize the temporary card's command internals, deliver callbacks, or establish gameplay damage. This is shared mechanics evidence; it is not a cheese strategy or a theorycraft recommendation.
