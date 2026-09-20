# HP subtraction and multi-hit event ordering

PC resource 144 / build 51. Recovered code chain; not a fully executed scheduler or independently verified gameplay trace.

## Ordinary HP-property subtraction

BattleUnitBase.SubProperty delegates to BattlePropertyServer.SubProperty. That method reads the prior value, applies BeforeSub, subtracts the adjusted amount, calls AfterSub and returns the resulting property. BeforeSub enforces the HP minimum of zero, so an overkill request is clamped to available HP in this ordinary property path. It does not round all values anew at this step.

AfterSub invokes RefreshMaxLimit, the owner's OnPropertyChanged and SendOnPropertyChanged. For the ordinary BattleUnitBase HP callback, OnPropertyChange_Hp creates RoleHpChanged with old/new HP and then RoleHpperChanged with HP/max-HP metadata. These are queued event effects, not direct synchronous calls to every combat-state listener.

BeHit reads HP before subtraction, receives curHp from SubProperty, and calculates realDamage as old HP minus curHp. Its changeVal field retains the earlier damage request, while castDamage retains the pre-mitigation incoming amount. These can differ on overkill. The result also records shield diagnostics and a separately computed overflowDamage; do not substitute that overflow expression for actual HP delta.

This establishes the ordinary path only. Overrides, other property callbacks, state changes, death handling and queue execution must be checked before treating a connected diagnostic request as a complete final result.

### Original-runtime subtraction checks

`tools/hp_property_oracle.py` executes the original SubProperty, BeforeSub, GetSubPropertyValueFunc, AfterSub and RefreshMaxLimit methods. It supplies explicit current HP and nonnegative requests and replaces the owner callback and SendOnPropertyChanged with non-mutating spies. Sixteen boundary cases cover zero HP, fractional HP/requests, exact lethal requests and overkill. `engine/hp-property.mjs` matches the returned HP and callback records in `tests/hp-property.test.mjs`.

Both callbacks occur even when subtraction changes HP by zero. Owner OnPropertyChanged precedes SendOnPropertyChanged; the sender receives the clamped negative amount, including negative numeric zero in the original double result. These records are descriptions, not executable combat events. The harness bypasses constructor rounding and does not execute BeHit, owner event creation, dispatch, state listeners or death handling. The helper remains outside the main calculator until those lifecycle boundaries are connected explicitly.

## Deferred events and repeated damage

### HP event payload identity

`tools/hp_event_oracle.py` executes original BattleUnitBase.OnPropertyChange_Hp with supplied getters and a CreateEventEffect spy that retains Lua references. Five cases cover ordinary loss, lethal loss, unchanged HP, fractional loss and a max_hp change. For hp, event 203 (RoleHpChanged) is submitted first; the same table then receives max_hp, hp and propertyName and is submitted as event 204 (RoleHpperChanged). Both retained references see those later fields. A max_hp change submits only event 204. Zero delta does not suppress the pair. `engine/hp-events.mjs` reproduces the submission order and shared identity, tested against the five original callback records.

The downstream recovered code retains that reference: BattleEngine.CreateEventEffect puts eventData into the effectConfig; BattleEffectMgrServer.CreateEffect passes that configuration to the effect constructor; BattleEffectServer.ctor stores it; BESendEvent.DoEffect later passes its eventData to SendEvent. This downstream conclusion is a code trace, not full scheduler execution. A simulator must not snapshot eventData at the first enqueue. The current helper accepts an enqueue function and does not dispatch listeners or infer their eligibility.

BattleEngine.CreateEventEffect constructs BESendEvent and calls the effect manager. BattleEffectMgrServer.CreateEffect constructs and pre-triggers it. Ordinary BattleEffectServer.PreTrigger attaches the new effect to the current running effect, or to the root if no effect is running. BESendEvent.DoEffect dispatches the event when the scheduler reaches it.

BattleEffectServer.AfterEffect checks its child list first. RunSubEffect removes the first child; when a child finishes, the parent resumes. Only when the child list is empty does RunNextMultiEffect run the next repetition. Thus descendants queued by an individual damage function are processed through this child-first path before the enclosing damage effect advances to its next repetition, unless battle termination or another control-flow branch intervenes.

BEActiveDamage.__DoMultiEffect creates one BEFunctionEffect for each target. Damage2SingleTarget skips dead targets, calls GenParams, resolves GetRealDmg, then invokes BeHit. It therefore runs the parameter/crit/target path for each target hit; it does not simply reuse one rounded damage result for the entire card. GenParams re-evaluation does not by itself prove every referenced skill argument is freshly recomputed: command argument caching/snapshot behavior remains a separate dependency.

Random target expressions can be regenerated for a later repetition. Some single-target effects also retarget when their prior target has died. Hit counts are initialized using the configured count, damagetimes_plus and damagetimes_per, with ceiling and a minimum of one. These are further reasons a five-hit action is not universally five times the opening hit.

## Attached actions are a separate scheduling branch

BEAttachPostAction.PreTrigger explicitly chooses the root effect as parent, unlike the ordinary running-effect parent rule. Mouchette's attached follow-up therefore must not be inserted as an immediate synchronous callback merely because its trigger was created during another hit. Existing root siblings and effect insertion order matter. See MOUCHETTE_FOLLOWUP_COMMAND.md for its card identity and trigger flags. Complete ordering across multiple root-level actions still needs execution evidence.

## Implementation consequence

### Original-runtime scheduling harness

`tools/effect_order_oracle.py` now executes the original ordinary/attached PreTrigger methods, child dispatch, repetition dispatch and completion methods. Synthetic effect bodies create two hit children, an event and command beneath each hit, and an attached action from each event. A pre-existing root sibling is also queued. The original trace is `hit1, event1, command1, hit2, event2, command2, sibling, attached1, attached2`. In the second case, the first command marks the battle finished; the trace ends at command1 and the second repetition does not execute.

The harness provides manager lookups/running-effect bookkeeping, always-eligible TryDoEffect, synthetic repeat bodies and no overflow. It does not execute real damage, skill conditions, random targets, yielding or full battle initialization. `engine/effect-order.mjs` reproduces this synchronous subset in two original-runtime comparisons. A separate synthetic integration test connects HP subtraction, reference-preserving event enqueue and listener dispatch; a queued listener command changes the next hit request before that hit executes. That wiring test is not a named boss-state implementation or another runtime fixture.

These results validate the queue boundaries needed for a future stateful calculator. Main calculateDamage remains a single-hit research API; it does not automatically execute this queue or claim final gameplay damage.

The experimental API currently stops at hpLossRequest. Implementing actual multi-hit HP damage requires a stateful event executor that preserves child/root scheduling, HP floors, state callbacks, early termination and per-hit input resolution. Automatically subtracting the request and updating every modifier immediately would not reproduce this code chain.

Sources: BattlePropertyServer.SubProperty/BeforeSub/AfterSub; BattleUnitBase.SubProperty/OnPropertyChange_Hp/BeHit; BattleEngine.CreateEventEffect; BattleEffectMgrServer.CreateEffect/GetParentEffectUid; BattleEffectServer.PreTrigger/AfterEffect/RunSubEffect/RunNextMultiEffect; BESendEvent.DoEffect; BEActiveDamage.DoEffect/__DoMultiEffect/Damage2SingleTarget; BEAttachPostAction.PreTrigger. No synthetic or real fixture count is increased by this code trace.

## Connected BeHit through HP mutation

`tools/behit_hp_oracle.py` executes original BattleUnitBase.BeHit and ImmueDamage, original BattleUnitUtil helpers including prevention eligibility, and original BattlePropertyServer mutation. Explicit ordinary Active properties and an available caster are supplied. Owner/sender callbacks are observed; recording, animation and DoDamageEvent are no-op spies. Eighteen cases cover overkill, fractional incoming damage/HP, shield excess, puncture, generic immunity, cap exhaustion, retained HP and death resistance.

`engine/ordinary-active-hp.mjs` matches serialized numerical records, treating positive and negative zero equally. Lua integer/float branches can yield different signed-zero callback diagnostics; this adapter does not model Lua numeric subtypes. It keeps incoming damage, the capped request, actual loss, shield loss and overflow distinct. Incoming200 against HP100 yields request200, actual loss100 and overflow100.

The phase-cap simulator now uses this connected HP step, followed by queued HP events and code-derived phase commands. HP1000/cap330 with hits200/200/200 yields modeled losses200/130/0; an initial shield75 with hits200/400/100 yields125/205/0. These are synthetic examples, not observations. Transition skills are recorded but not executed; full state eligibility, turn reset and death lifecycle remain incomplete. Both interfaces retain finalDamage=null.

## Fatal damage uses immediate child execution

BERoleDeadlyDamage overrides AddRunningSubEffect: it calls the child's TryDoEffect, rejects yielding, and executes XpcallDoEffect immediately when eligible; its SubEffectEnd is empty. This differs from ordinary BattleEffectServer's child-list insertion. Its DoEffect emits RoleBeforeDeathResist and then rechecks HP, applies role death resistance when eligible, otherwise emits RoleBeforeDeath and rechecks HP again before RoleAfterDeath. A revival can therefore alter the decision inside this effect body. BERoleDie later rechecks HP before committing death. BattleUnitMonster.PreCheckDeathEvent returns true; the base unit returns false and Awakener behavior depends on PvP.

`tools/deadly_damage_oracle.py` runs the original fatal-damage DoEffect in eight cases with synchronous event adapters and explicit role responses. Logging and base DoEffect are stubbed. The JavaScript control flow matches event order, remaining HP and return values. This does not validate actual revival states, IsDeathResist/DeathResist implementations, event payload identity, RoleDie or a full battle.

`ResearchEffectOrder` now has an explicit immediateChildren mode for this special parent. A synthetic integration check inserts an event child which itself queues a healing descendant; both complete before the fatal body rechecks HP, so the later death effect can skip a revived role. Existing ordinary and attached scheduling checks, plus phase-cap tests, still pass. This mode is source-derived and composition-tested; the eight-case oracle supplies synchronous responses rather than executing the original scheduler override.
