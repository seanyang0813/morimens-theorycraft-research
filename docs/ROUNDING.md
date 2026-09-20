# Rounding

Evidence: PC144 BattleUtilServer.ShowDamageFormula, BattleCmdServer.__GetFinalDamage, BattlePropertyServer and BattleUnitBase. The Lua runtime uses 64-bit floating-point values for tested formula inputs; integer values are also represented by Lua integer tags in constants.

1. Offensive scaling: max(ceil(x - 0.00001), 1).
2. Five spellbound reductions: max(floor(x + 0.00001), 1).
3. Crit and target layers: max(ceil(x), 1), no epsilon.
4. GetRealDmg returns ceil again.
5. Shield/HP processing may ceil the remaining amount.

Property initialization and many SetProperty paths also ceil. A caller cannot assume all fractional inputs survive stat preparation. The utility oracle uses direct synthetic resolved values deliberately to test numerical behavior, not to claim all such values occur in gameplay.

The JavaScript utility matches both returned values exactly in 2,262 original-runtime cases, including values immediately around the epsilon boundary. No tolerance is used. The diagnostic baseDamage return has its own evaluation order and is not the pre-flat intermediate reused by the main expression.

Unresolved: the complete property aggregation paths, all cap boundaries, RNG range, and per-effect parameter regeneration timing. These must be resolved before claiming end-to-end exactness.

Record UI has an additional display boundary: `CopySettleModel.GetAttrShowStr` passes `ceil(attrVal)` to the attribute formatter. Its map adds recorded base attributes, weapon values, trinket totals and active set attributes. Arachne's record displays crit damage 52%, while the base preview is 50% and the trinket tooltip contributes 1.2%. This does not establish a 51.2% combat input: `BattlePropertyServer.ctor` also ceils incoming role properties, and later changes must be traced. Preserve display values, raw equipment values and resolved combat values separately.
