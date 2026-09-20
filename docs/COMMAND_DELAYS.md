# Command delay planning

`engine/command-delays.mjs` reconstructs original `BattleCmdServer.GetEffectDelayTimes`. `tools/command_delay_oracle.py` executes that original method with explicit command flags and cast-time callback results; the 96-case fixture compares delay values and callback lookup order.

Numeric delay values, including supported decimal numeric strings, add milliseconds to the current absolute time. A missing or false delay chooses `cast` until a nonnumeric marker has been encountered, and zero afterward. A numeric delay before the first marker does not consume that default marker. Numeric zero remains zero.

For ordinary commands, a nonnumeric marker resolves a supplied absolute cast time. A null result retains the current time; zero replaces it. Pre-commands and nested execute-command calls skip this lookup. After each row, all prior absolute times greater than the new current time are clamped down. Finally, consecutive absolute times are subtracted to produce per-row deltas. Consequently a later earlier-valued marker can change delays already assigned to preceding rows.

The authored API requires explicit `delays`, `preCommand`, `executeCommand`, and `castTimes`. Unknown needed cast-time results fail. Decimal numeric strings are supported; hexadecimal numeric strings fail explicitly. No animation time or condition result is inferred.

Original `GenerateEffectList` iterates `data_list` using `ipairs`, calculates these delays, and may subsequently override them to zero for skip-phase execution depending on `NotAwakerCardPerform`. That override is not part of this component. `GenerateEffectObj` passes the complete row to its effect object, so the absence of a metadata read in this method alone does not justify dropping that field from a general importer. Existing command compatibility blockers remain in place pending that adapter work.

This is component evidence, not a timed battle simulator or gameplay validation. It does not implement interruption, animation lookup, effect generation, lifecycle, or listeners.
