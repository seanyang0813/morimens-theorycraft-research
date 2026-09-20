# Conditional skill-field variants

`engine/conditional-variant.mjs` implements the dense scalar subset of BattleUtilServer.GetTrueConditionByCmd, GetTrueConditionIndexByCmd and IsCondMatch. Lists are scanned from last to first, returning the last matching entry's value. Boolean conditions and literal string `true` bypass expression evaluation. Evaluated numbers match only when greater than zero; booleans use their value and explicit nil (null) does not match. Unknown/undefined values and unsupported value types throw.

This is distinct from BattleCmdServer.CheckCondition, whose row gate requires boolean true. For example an expression returning 2 selects a conditional variant but fails the strict row gate. When binding `compileCommandCondition`, use its raw values[0] for variant selection, not its passed flag. Zero is truthy inside Lua logical expressions but is not a positive numeric match for IsCondMatch.

`tools/conditional_variant_oracle.py` executes the original three-method chain in 39 cases, observing which expression adapters are called. Cases cover reverse priority, boolean/numeric/nil results, literal bypass and empty/no-match lists. The fixtures use numeric selected values; scalar strings in the authored selector are source-supported but not covered by those runtime cases. Actual skill-field routing, sparse/nested lists, parser/environment behavior and gameplay remain outside this evidence.

Progression maps use the separate selector documented in SKILL_VARIANT_SELECTION.md. The caller must establish the field format through original routing rules; a table must never be classified only by a plausible shape and silently resolved. Full character-to-card assembly remains incomplete.
