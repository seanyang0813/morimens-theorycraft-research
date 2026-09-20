# Connected original effect and HP checks

`tools/effect_hp_oracle.py` runs one original Passive, Fixed or Pure effect iteration. The original effect directly invokes original `BattleUnitBase.BeHit`, which invokes the original shield/limit helpers and original HP property mutation. These calls occur in the same copied PC Lua runtime and state. This is stronger integration evidence than supplying a separately computed pre-hit value to an isolated BeHit test.

The 25 fixture cases cover nonzero category modifiers, a dimension modifier, fractional bases, shields below/above incoming damage, generic immunity, partially exhausted damage caps, overkill and death resistance. Passive and Fixed additionally cover Puncture with shields and generic immunity. Pure uses ordinary subtype only. The calculator agrees on incoming damage, effective immunity, HP request, actual HP lost, remaining HP, remaining shield, death-resistance application and overflow diagnostics.

The initial comparison caught a harness parameter error: parameter 3 is a damage subtype for Passive/Fixed, but statistics inclusion for Pure. Supplying 1 indiscriminately requested Puncture on the first two categories. The harness now supplies each parameter deliberately and retains explicit Puncture cases. No calculator arithmetic change was needed to resolve that mismatch.

The harness supplies a living target, resolved properties, dimension modifier and effect arguments. It starts at `__DoMultiEffect`, not the full scheduler. Property callbacks are observed; animation, damage events and statistics processing are disabled. It does not reconstruct a character, run state listeners, repeat a multi-hit action, or validate a real gameplay prediction. Final damage remains unverified and publication remains gated.

Reproduce with `.venv/Scripts/python.exe tools/effect_hp_oracle.py`, then `.venv/Scripts/python.exe tools/verify_research.py`. Fixtures and original module hashes are in `tests/synthetic/original-effect-hp.json`; comparisons are in `tests/effect-hp-connected.test.mjs`.
