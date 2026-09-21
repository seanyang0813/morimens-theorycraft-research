# Card copying and source attribution

Recovered scope: PC resource 144 / build 51. Code plus bounded original-runtime request evidence; selected replay instance ownership is not yet reconstructed.

Moxia skill 122483 (Human Explosion) is both Card_Skill and Card_Strike. Command 122499 deals its Active damage, then at potency greater than one selects a history Strike using `GetCopyHistoryCard({Card_Strike},0,99,1,0,0,{123811,124733})`, creates a hand card, and adds states 2948, 2454 and 2983. State 123811 marks Human Explosion itself. The selector's exclusion arguments must not be mistaken for damage or ownership modifiers.

`BattleCardMgrServer.InsertBoutHistory` stores the played card's skill ID, level, camp, special-owner UID, performSkillId and card types. `GetHistoryCard` reconstructs a temporary NoneDeck card from those fields. `BECreateCard` subsequently copies the selected card's ID, level, special owner, performSkillId and types into AddNewCard. Its generating command's castRoleUid is also passed as separate creation metadata, while the `owner` field is the selected card's special owner.

`tools/create_card_oracle.py` now executes the original protected `BECreateCard.DoEffect` against a synthetic card-manager observer. The observed request boundary confirms that a count of 2.2 becomes three descriptors, each descriptor keeps the selected card's ID and level, an omitted show flag becomes true, zero becomes false, and omitted explicit arguments fall back to `target.createCardArgs`. The request separately carries `castRoleUid`, the deck expression's camp, the selected card's special owner, `performSkillId` and card types. `engine/create-card-command.mjs` reproduces this bounded request construction and stops before `AddNewCard` mutates a deck or fires triggers.

Agents can run the boundary with `node tools/run_create_card_command.mjs research/examples/create-card-command.json`. The result is a list of auditable `AddNewCard` requests plus explicit unresolved dependencies; it is not a finished card-sequence simulation.

`BattleCardServer.InitOwner` uses a special owner when present. Otherwise, for an Awakener skill it resolves the configured AwakerID in that camp, with a fromCardUid fallback when the configured Awakener is absent, then a player fallback. `InitCmdServer` uses this resolved owner.uid as castRoleUid and the card's skill ID as skillConfigId.

Therefore an ordinary copied Arachne Strike can still execute under Arachne even if Moxia generated the copy. Copying alone does not transfer its attack calculation to Moxia. A special-owner override is an explicit exception and must be established for the actual card. The path also retains performSkillId separately, so animation identity must not be substituted for the logical owner without checking the rendering path and actual instance.

`BattleStatsMgr.ProcessRoleStats` credits skill-origin damage to cmdServer.castRoleUid. `BattleStatPackMgr.AddBattleStatPackSkillStats` records that role and cmdServer.skillConfigId in the turn bucket. State-origin damage instead goes through state ownership allocation. Thus a character/source statistics entry establishes the recorded role/skill bucket; it does not by itself establish the number of uses, whether the card was copied, or its modifiers at impact.

For replay-002, the Arachne Strike 2205 entry remains stronger attribution evidence than the character animation visible alongside a floating 6615. The latter may be a preceding event's number or an overridden presentation. Neither explanation is proved yet. Capture the actual card and complete event boundary before assigning the frame to a single hit.

Decompiler caution: GetBoutHistoryCard's nested state-filter branch renders awkwardly in the current decompilation. The tested creation boundary begins after a target history card has already been selected, so it does not resolve that filter. Verify its original instructions/runtime before claiming exact selection behavior for excluded states.
