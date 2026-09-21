# Command damage-prefix execution

`engine/command-damage-prefix.mjs` imports an exported command in original row order and executes only its leading ordinary `BEActiveDamage` rows. It stops before the first unsupported row and never skips a row to reach later damage. Target selectors must be bound explicitly to one supplied target. Presentation fields such as `VFX`, `BaseSortID` and `DelayTime` are retained as evidence but are not executed.

For real resource-144 Mouchette follow-up command 123163, row 1 is `BEActiveDamage` against `RandomEnemy`; rows 2–7 mutate states. With explicit arguments `Arg1=300`, `Arg2=6`, neutral modifiers, 100,000 target HP and no Block, the prefix produces six 300-damage hits and 1,800 modeled HP loss, then stops before row 2. This verifies the prefix engine and row ordering under those test inputs. It is not a Mouchette build prediction because attack, target, modifiers, target selection and state callbacks are supplied or excluded.
