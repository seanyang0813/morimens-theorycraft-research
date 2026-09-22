# Mouchette modifier mapping

Character 94450, localized name 茉夏 (previous notes use Moxia). PC resource 144 / build 51. This is recovered code/data evidence; complete gameplay prediction remains unverified.

Team-property routing is now traced and checked in [STATE_PROPERTY_ROUTING.md](STATE_PROPERTY_ROUTING.md): a Player-owned state with an AWAKER_ATTR contribution mutates each current Awakener in PvE. Thus the ultimate's flat Strike contribution is stored on recipients and read from the caster; it is not inherited by a generic getter or added again as a separate Player flat bonus. Personal Mouchette states remain on Mouchette.

## Distinct damage inputs

| Source | Property/path | Scope and timing |
|---|---|---|
| Ultimate states 124034 / 124037 | Player strikecard_damage_plus = StateArg1 | Flat Strike addition; applied after ultimate damage commands. Duration reduces at turn end. |
| Awakened follow-up state 123168 | Caster i_damage_per_strikecard += 25 per changed layer | Inside Strike factor; granted after the follow-up damage effect; clears at turn end. |
| Level-10 Stars talent 122481 | All-Awakener o_damage_per_strikecard += 35 via state 123703 | Base-stage Strike factor; separate from the flat ultimate bonus and inside Strike factor. |
| Same Stars talent | Mouchette damage_per2monster_boss += 50 via state 124656 | Battle-begin Boss condition; target-dependent bonus, not team-wide. |
| Same Stars talent | physique_per, atk_per, def_per +30 | Attribute promotions, not direct final-damage multipliers. Must avoid reapplying values already supplied in battle attrs. |

Stars state 122504 routes StateArg3 through command 123700 to all Awakeners, producing state 123703. At battle begin, if BattleType is Boss, StateArg5 routes through command 124651 to state 124656 on Mouchette. Talent level 10 provides arguments 30, 500, 35, 50, 50: attribute percentage, first-awakening key energy, team Strike base percentage, death-resistance-event energy, and boss bonus respectively. These are build-specific configuration values; actual state restoration/eligibility must be confirmed for the replay.

## Skill tags determine multiplicative factors

BattleConst maps Card_Strike to i_damage_per_strikecard, Card_Skill to i_damage_per_skillcard, and Card_AttachPost to i_damage_per_attachpost. BattleCmdServer.__GetShowDamage multiplies the factors for each actual skill tag into skillTypeInsideDmgPer. Therefore:

- Ordinary Strike: the Strike factor applies.
- Human Explosion / Storm Impact: both Skill and Strike factors apply.
- Dramatic Encounter: both Strike and attached-action factors apply.

The inside Strike contribution is after the base-plus-flat subtotal in ShowDamageFormula. Thus it can scale the subtotal including resolved STR and the flat ultimate Strike bonus. The outside Strike factor is part of the base-stage product and does not automatically multiply those flat additions. It also has a card-specific o_damage_per_strikecard_limit path when a card object exists. Never apply the +35% Stars bonus to the whole subtotal merely because both descriptions say Strike damage.

Four state-123168 layers add 100 points to one property, yielding a 2x factor if that property is otherwise neutral. They do not produce 1.25^4. Other contributions to that same property add; separately mapped skill-tag properties multiply.

## Follow-up counter lifecycle

See [MOUCHETTE_FOLLOWUP_COMMAND.md](MOUCHETTE_FOLLOWUP_COMMAND.md) for the recovered command chain: Dramatic Encounter gets a fresh instruction-card command, rather than inheriting its parent's state-trigger damage flag. A separate isTriggerBST=false suppresses its AfterUseCard event. Card/prism modifier eligibility and played-card trigger eligibility must not be conflated.

Listener 123172 responds after a Strike card is used while per-turn counter 123165 is below 4 + state 133283. Command 123160 increments display counter 124024, uses interval marker 123523 to select alternating qualifying uses, and schedules attached skill 123159 through marker 123167. On the follow-up command's completion path, per-turn counter 123165 and battle counter 123307 increment when marker 123167 is set; the interval and trigger markers are removed. Per-turn counters and interval markers clear at turn end; battle counter 123307 survives until battle end. State 133283 raises the cap by one and lasts until battle end.

This is not yet a runtime-tested event simulator: reentrancy, queued follow-ups and callback order can matter. The display counter is updated inside the capped listener, so it should not be assumed to count every Strike indefinitely after the cap is reached.

## Replay consequence

The selected Frenzy record shows Mouchette's talent summary 5/10/5 and a +653 flat team Strike bonus. Her level-10 Stars configuration identifies another potential input for Arachne's Strike: the separate +35% outside Strike property. Establish whether the state is active and whether any property already includes it before calculating. No missing multiplier is solved from the observed 2205 damage.

## Mortal Blast command boundary

The resource-150 inspection request at
`research/examples/theorycraft-current-mouchette-mortal-blast-inspection.json`
prepares real Skill 122483 and Command 122499 from the pinned catalog. With its
deliberately small arithmetic fixture it derives arguments 15 and 2, but returns
no damage result. The complete command contains five rows: one two-repeat
`BEActiveDamage` against all enemies, conditional `BECreateCard` using
`GetCopyHistoryCard`, then three conditional `BEAddState` rows targeting the
created card through `LastTarget`.

The compatibility report exposes every row and marks the command non-executable.
A sequence calculator must resolve all-enemy targeting and presentation RNG,
history-card selection, card creation, `LastTarget`, and created-card state
attachment before it may claim complete Mortal Blast execution. The existing
catalog-prepared paid Wheel bridge therefore continues to reject Mortal Blast
instead of calculating its damage row while silently discarding its card and
state effects.

The complete-property prepared Active bridge now has a separate fail-closed
schema-4 prefix for this command shape. When the caller proves that exactly one
enemy is eligible, it executes row 1 through the catalog-derived repetition,
critical, property and HP paths, then returns `stop.beforeRowId = "2"` for the
`BECreateCard` boundary. It rejects multiple eligible enemies because one
supplied target cannot represent `AllEnemy`. This result is only Mortal Blast's
direct-hit component; the copied Strike and three later state effects remain
outside it.
