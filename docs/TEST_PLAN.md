# Verification plan

Keep three evidence streams separate: copied-original runtime differential tests, hand-designed synthetic arithmetic tests, and actual gameplay observations. None substitutes for another.

User priority: higher-difficulty content takes precedence. Select Nightmare/Frenzy (or the highest accessible equivalent) records for validation, capturing difficulty-specific enemy rules, mitigation and conditional modifiers. Normal replay-001 remains only a secondary diagnostic baseline. A passing Normal result alone must not imply high-difficulty coverage.

## Existing tests

`node --test tests/oracle.test.mjs` from the project directory checks 2,262 resolved-input cases against the copied original `ShowDamageFormula` utility. It also checks that missing or unknown input names are rejected. Exact equality, no tolerance. This covers the offensive utility and its diagnostic return only.

## Required next tests

1. Complete trace 001 without fitting missing state to 318. Resolve the pre-hit card value and character/target modifiers before comparing.
2. Expand the 2,097-case original crit/target differential suite to card and skill-tag branches, target slots 4/5, both exclusive formula subtypes and tightly targeted rounding boundaries. The existing suite covers critical/noncritical inputs, generic slots 1–3 and conditional target factors with explicit synthetic object adapters.
3. Verify a clean gameplay baseline, A only, B only and A+B for same-property and distinct-property effects. Favor values whose predictions differ by substantially more than one integer.
4. Test STR zero/positive/negative and effectiveness; test base bonuses with STR held constant to distinguish whether they scale STR.
5. Verify Vulnerable duration stacking and Psychic Trauma amount/cap behavior, including expiry.
6. Separate Fixed/Pure/Tentacle fixtures; record shield and HP changes separately from displayed/statistical damage.
7. Reserve new fully reconstructed observations as holdouts before viewing their damage outcomes. Include different character/card/target and category combinations. Freeze the formula before scoring holdouts.
8. Run strict-mode rejection tests for unknown mechanics, mismatched builds and incomplete hit-resolution state. Ensure experimental results remain explicitly labeled and cannot satisfy the publication gate.

Publication requires a complete supported path, passing exact real fixtures and independent holdouts, documented coverage and no unexplained systematic discrepancy. A zero gameplay-fixture denominator is a failure to meet the gate, not a 100% success rate.
