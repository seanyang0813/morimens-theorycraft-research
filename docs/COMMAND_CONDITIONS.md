# Command condition evaluation

`compileCommandCondition` in `engine/command-expressions.mjs` adds numeric comparisons (`==`, `~=`, `<`, `>`, `<=`, `>=`), boolean literals, `not`, and short-circuit `and` / `or` to the supported arithmetic expression subset. It returns the evaluated value, variable/call traces and `passed`, which is true only for boolean true, matching the source of BattleCmdServer.CheckCondition.

Lua truthiness is preserved within the supported number/boolean domain: zero is truthy, and logical operators return operands rather than forcing booleans. Thus `0 or missing` returns zero without reading missing, but does not pass the strict command gate. `0 and true` passes. Unknown values throw even in a condition; nil, strings and tables remain unsupported. Arithmetic and ordered comparisons require finite numeric operands. Function arguments remain numeric, while condition bindings may return finite numbers or booleans.

The numeric parameter API remains strict: it does not accept comparisons or booleans. Conditions must produce one value; comma-separated condition lists are rejected. Existing function allowlists and explicit live bindings apply to both APIs.

`tools/command_condition_oracle.py` executes seven distinct original FuncTable conditions from commands 80572, 81060 and 117337 over 84 environments. Authored evaluation matches each boolean result and exact state-query sequence, including short-circuit skips. The state getter is supplied and observed; original parser lookup, state storage and CheckCondition itself are not executed by this oracle. Strict gating and remaining grammar semantics have authored tests/source support rather than a claim of full original-runtime coverage.

These are expression-level rules. Row scheduling, effect handlers, target resolution and complete card execution still need integration. No card is newly declared gameplay-validated.
