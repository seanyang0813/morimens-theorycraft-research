# Arachne signature Wheel comparison: revised scope

SKeyDB wheel-0128 identifies Eternal Weave as Arachne's SSR signature. Maximum effect values are +25% wielder shield generation, +40 percentage points of temporary amplification after each of the wielder's own pursuits (up to five per turn), and 10 Aliemus when Dimension Shuttle triggers. Its main stat is Realm Mastery. SKeyDB's maximum enhancement level is 15 (E3 +12); its SSR mastery series has base36, growth3 starting at level4 inclusive: 36 + 12*3 = 72 Realm Mastery.

PC State134231 checks TriggerAssociator2.UniqueID against StateOwner.UniqueID and player counter134383<5. Cmd134385 adds State70350 to PlayerRole; that state's property is basic_damage_per=ChangedLayer. It is therefore team Damage Amplification, not a global final-damage multiplier. Mouchette's pursuits do not satisfy the wielder identity check. The small engine helper/tests preserve that owner distinction and cap at code-derived scope, not original-runtime or gameplay validation.

## Newly identified omission in previous worked examples

SKeyDB's Destined Threads talent and PC Cmd133367/134282 show intrinsic Arachne realm effects. Cmd133367 adds permanent Prism state133368 to all Awakeners, with ceil(15*(1+player.occupation_master_final*0.0005)) layers. State133368 supplies card_damage_per3_n2=2*ChangedLayer, including eligible attached Strike cards. The command adds realm Damage Amplification and checks Pure Ultra eligibility separately. The approved 150% team Damage Amplification should be treated as the supplied final total, not increased again automatically.

The prior 168,039 calculation zeroed Prism as an extra modifier. That arithmetic is still reproducible for its supplied vectors, but it does not establish a complete ordinary Arachne-team calculation. It must not be presented as a fully reconstructed equipped result. Arachne's max Wheel also changes mastery, which can change rounded Prism and Dimension Shuttle Beacon counts; its entire effect cannot be reduced to the +40% pursuit passive.

Remaining reconstruction: final team mastery/Pure Ultra eligibility, initial turn state and Dimension Shuttle use, card-copy Beacon retention/clearing and the command-card eligibility of all generated actions. Other team members were never specified. Arachne's seasonal Strike pursuit is supplied by relic84121, not by this Wheel and not simply by being unroused. Do not enable that relic implicitly.

## Subsequent card-history trace

BattleCardMgrServer.InsertBoutHistory stores six fields: skill ID, skill level, camp, special-owner UID, performance skill ID and card types. GetHistoryCard for Copy passes those to AddNewCard; it does not serialize original card states or properties. Mortal Blast's GetCopyHistoryCard therefore does not itself preserve the played card's Beacon. New-card initialization can still supply its own effects; this is distinct from BECopyCard used by Dimension Shuttle.

State126900's before-card branch applies temporary Beacon134389 to an eligible Strike/Defense/Skill/Extend card without Beacon126895 when Shuttle is unused or extra activations remain. Cmd134388 uses ceil(25*(1+finalMastery*0.0005)). Both Beacon states contribute card_damage_per3 at two percentage points per layer and clear through their after-use trigger (priority999). Permanent Prism contributes card_damage_per3_n2. These two properties ADD in the shared utility factor; they are not multiplied as independent factors.

`engine/singularity-realm.mjs` now recalculates the equipped combo from explicit final team mastery and a per-card Beacon schedule. It rejects already-populated Prism/Beacon inputs to avoid duplicate counting. Tests check layer ceilings, shared-factor addition, differing per-card state and Prism on pursuits. No missing team mastery or starting turn state is silently supplied; no new full-team PDF total is claimed.

Local pinned sources: wheel-0128.json, talent.arachne.destined-threads.json, wheel-enhance.ts, wheel-mainstat-scaling.ts and gameplay-math.json under research/external/skeydb. PC State134231/134383/70350/133368/133993; Cmd134385/133367/134282. The evidence does not establish the friend's observed 500k-1m result.

## Mastery and original expression validation

State72023 checks the same school exclusions as Pure Ultra, then invokes Cmd71973 at StageState with priority1. That command adds State71974 with100 layers; its property is occupation_master_final_per=ChangedLayer. BattlePropertyServer.AfterAdd/AfterSub recompute final mastery as ceil(occupation_master*(100+occupation_master_final_per)/100). The engine now exposes this explicit property calculation without inferring party composition or adding100 a second time.

The original PC FuncTable module has been loaded through the copied XLua runtime. `tools/singularity_layer_oracle.py` executes the actual parameter expressions referenced by Cmd133367 and Cmd134388, with explicit player mastery and original Lua math. All19 comparison cases pass, including the separate Prism/Beacon rounding boundaries. These are synthetic runtime comparisons, not gameplay predictions.

TeamDataUtils.GetTeamOccMaster is a client utility summing AwakerDataUtils.GetAttr results. BattleUnitPlayer.GetTeamOccMaster separately sums current Awakener mastery and player mastery. Neither function alone proves the initial PlayerRole.occupation_master value used by the realm commands. CopyAwakerDataUtils.GetAwakerAttrs reads DRole.attrs and a separate occupation_master_final_add display modifier. Do not substitute any of these differently scoped values into the combo without tracing initialization.

## Opening actions and Beacon timeline

Skill122485 (Mouchette Rouse) has Card_Awake only; Skill122486 (Exalt) has Ulti_Skill only. Neither matches State126900.Judgement4. Arachne Strike126484 and Mortal Blast122483 do match. `tools/singularity_beacon_oracle.py` runs the original FuncTable predicate with actual Skill.Type lists and explicit card/player getter adapters. All24 state/tag combinations agree with the calculator.

Cmd126890 rows17/18 spend an extra admission only when counter3867 was already positive, then increment that counter; both operations require IsDimensionBout==0. The engine records this counter transition separately from copy creation and downstream events. With explicit ordinary-round start, counter0, extra admissions0 and initially unmarked cards, Rouse -> Exalt -> Strike -> Blast -> Strike -> Blast grants temporary Beacon only to the first Strike. This is a conditional schedule, not proof of a user's live turn state.

Mouchette pursuit Cmd123160 uses `123159,1,0,1`: BEAttachPostAction turns the third argument0 into attachPostParam.isTriggerBST=false. BattleUnitBase.UseAttachPostCard does construct a temporary card and BEBeforeUseCard effect, but BEBeforeUseCard.__FireBeforeUseCard checks BattleEffectServer.IsTriggerBST -> BattleCmdServer.IsTriggerBST and suppresses the event. Therefore the pursuit cannot gain a new temporary Beacon from State126900 through that path. This routing conclusion is source-derived, not a new runtime event-dispatch fixture.

## Initial mastery boundary

PVEGameplay.SpawnCampRoles assigns player properties from battleInitData.copyProperties, while each Awakener receives its own attrs. BattleUnitBase passes these to BattlePropertyServer, whose constructor ceils supplied values. PVEGameplay.OnInitBattle subsequently initializes school states and externally supplied stateList. The client source proves this input boundary but does not establish how upstream copyProperties was aggregated for the user's team. The exact final investigation Realm Mastery has been requested; it remains unknown. Do not claim the sum of two character previews is the final realm input. The local website therefore requires explicit final mastery and never prepopulates it.
