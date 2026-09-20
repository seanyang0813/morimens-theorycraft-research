# Old Embers command scheduling

`engine/old-embers-command.mjs` connects the recovered eight-row Old Embers iterator to the research effect scheduler. It waits for each row and its ordinary descendants before evaluating the next row's live conditions. Attached effects keep their existing root-level placement. State mutation, HP changes, events, and eligibility are supplied as explicit adapters.

The code-derived tests combine the scheduler with the recovered HP-loss helper and event dispatcher. A synthetic HpDown listener creates an exclusion state. As an ordinary child, it executes before the next stack-consumption condition, preventing consumption. As an attached effect, it executes after the command, so consumption occurs first. These examples test ordering; they do not claim that this particular synthetic listener exists in a real encounter.

Other tests check that immune HP loss does not generate HpDown, that a fractional HP limit retains its value after signed rounding, and that battle termination halts the remaining command without inventing cleanup of its temporary marker. The helper leaves finalDamage null. It is not yet part of the published calculator or the Mouchette scenario.

Remaining work includes original full-command execution, actual boss-state listeners and their targeting/eligibility rules, complete death/phase transitions, and independent gameplay observations. Neither these composition tests nor the original component oracles establish that the reported 500k–1m combo discrepancy is explained.
