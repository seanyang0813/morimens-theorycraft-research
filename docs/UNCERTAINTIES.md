# Open questions

1. **Full gameplay state:** replay-001 has an observed 318 Strike but lacks enough inputs for an independent prediction. Obtain a replay reference/export or capture a simpler fully visible trial.
2. **Replay version:** the viewing client's version is known; the battle's original content version is not. Same-day timestamps alone do not prove identity.
3. **Display-to-internal stat mapping:** character preview and equipped record differ. Resolve actual attack, Damage Amplification sources and conditional effects; do not import preview defaults.
4. **HP resolution:** active damage formula output precedes immunity, shield, thresholds, damage budgets and death resistance. Implement and independently test the selected supported subset before reporting final HP loss.
5. **DEF:** no generic DEF divisor is present in the traced active formula/hit path. DEF appears in skill expression inputs (e.g. guard generation). This does not yet establish every category or every special effect. Test same attack/target conditions with only DEF changed.
6. **Crit RNG:** active and Tentacle paths use different comparison expressions. Establish random range, forced overrides and per-hit sampling separately from deterministic supplied-crit calculations.
7. **Status generation and triggering:** independently trace Poison, Counter and Bleed application and subsequent damage. Never apply the generation bonus again at trigger time without evidence.
8. **Timing:** stack changes can round at property application. Capture temporary STR, multi-hit effect updates and snapshot behavior. The recovered state code includes special-property maximum retention; it is not safe to assume all values resample identically.
9. **Category coverage:** Fixed, Pure and Tentacle entry points are recovered but lack completed original-runtime differential suites and independent gameplay holdouts.
10. **Decompiler limits:** normalized Lua is an analysis aid. Inspect bytecode or invoke original code for ambiguous branches. The original indexer swapped integer/float interpretation; negative integers were damaged by a JSON NaN round trip. All prototypes must be regenerated directly from copied originals, not repaired by bit reinterpretation. Original-bytecode oracle fixtures and direct config exports bypass this defect.

Strict mode must return no verified final damage while any relevant dependency above is unresolved. Synthetic agreement with an original utility validates the translation of that utility; it does not validate a complete gameplay scenario.
