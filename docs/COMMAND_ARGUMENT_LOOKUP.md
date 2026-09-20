# Numeric command arguments

`engine/command-arguments.mjs` implements the numeric ArgN branch of the original parser. `resolveCommandArgument({index,skillArgs,readFallback})` returns the value and its origin. Positive indices are one-based; null array entries represent absent Lua keys. Supplied zero is present. Supplied or fallback fractions are preserved without rounding.

The fallback callback executes only when the requested skill argument is absent, and executes again on each absent lookup. It must resolve the current configPara environment; the helper does not cache it. If that explicit evaluator returns a list without the requested entry, the original default is zero. Missing evaluators, nonnumeric values and unsupported indices throw rather than silently defaulting.

`tools/command_argument_oracle.py` runs original BattleCmdParser.GetGlobalValue for 20 synthetic cases (80 lookups). It supplies numeric skillArgs, observes fallback reads and supplies fallback arrays through GetValueListByCmd. string.replace is adapted. The original bytecode controls lookup precedence and defaults. The first harness attempt failed because lua_rawseti was not bound; the corrected harness binds it and catches callback failures, and only successful runs write fixtures.

This layer differs from ordinary GetSkillArgs normalization, which ceilings base numeric arguments before applying explicit overrides. ArgN lookup does not repeat that normalization. Tests also exercise changing fallback values between calls to ensure future live-state bindings do not retain stale arguments.

Full expression evaluation, StateArgN, command target/condition resolution and construction of damage effects remain separate unfinished work. This helper is not evidence that any whole card or gameplay sequence is supported.
