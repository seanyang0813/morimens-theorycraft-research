# Replay resource-catalog build attribution

Native replay payloads embed the exact `Cmd` and `Skill` rows used by the recorded battle. `tools/attribute_replay_catalog_builds.py` compares every embedded row against the complete pinned resource-144 and resource-150 exports after two explicit representation normalizations: contiguous numeric-key Lua tables become arrays, and `BaseSortID` transport/order metadata is excluded.

The current 42-replay private corpus yields:

- 35 replays with at least one resource-144-exclusive row, no resource-150-exclusive rows and no unmatched rows;
- 3 replays with at least one resource-150-exclusive row, no resource-144-exclusive rows and no unmatched rows;
- 4 replays with rows outside both pinned catalogs, classified as unmatched or intermediate rather than forced to either build.

The three resource-150 catalog matches are anonymous batches 02, 10 and 43. Batches 02 and 10 are already present in the retrospective native-replay audit and contribute thirteen chance-dependent branch-consistency matches with zero mismatches. This establishes that those calculations used resource-150 `Cmd`/`Skill` data. It does not identify the replay's engine bytecode directly, convert a retrospective calculation into a blind holdout, or resolve untested runtime branches.

The committed report publishes only anonymous batch labels and aggregate row counts. Player names, player/account identifiers, replay keys, battle identifiers and instance identifiers remain in ignored private artifacts.
