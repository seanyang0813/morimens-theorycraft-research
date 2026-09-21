# Catalog-prepared snapshot Block skill

`run-prepared-snapshot-block-skill` connects a real exported Defend skill to the recovered Block and ultimate-energy paths. The caller supplies progression and live complete property maps. The host loads and hashes `Skill`, `BattleApi`, `Cmd` and `State`, prepares the selected arguments, verifies the exact command shape, and derives every Block and energy property from the snapshot.

The first supported shape is two unconditional rows: `BEGainBlock` against the selected `UpperTarget`, followed by `BEGainUltiEnergy` against `CmdCaster`. Skill 4176 / command 834 exercises this shape in both pinned resource catalogs. At level 1 with `BattleDefForce = 100`, its exported formula resolves `Arg1 = 10` and `Arg2 = 5`. Under neutral complete snapshots, the selected ally receives 10 Block and caster energy moves from 95 to its cap of 100.

The Block adapter follows the ordinary Camp 1 PvE Awakener branch of `BattleCmdServer.__GetShowBlock`. It reads player Frail, player and caster flat Block, caster outside/inside Block, Defend-tag factors, instruction-card factors, card modifiers, dimension, five Spellbound reductions, recipient gain modifiers, and Block storage properties. Missing entries in a complete property map use the original `GetProperty` zero default. The result exposes every owner/property read, tag factor, formula stage, recipient rounding step and storage cap. The prepared path uses the selected catalog skill types as the card type list; dynamic type additions and temporary-card construction remain outside this boundary.

This property assembly matches 256 executions of original resource-144 `BattleCmdServer.GetRealBlock`. The same 256 fixtures match the installed resource-150 constants, utility and command bytecode exactly. Existing original-runtime evidence separately covers 160 Block storage cases and 516 current-build energy calculation/effect/storage cases. The two-row command composition remains authored component integration: target generation, card legality and payment, effect repetition, callbacks, Block events and later actions do not execute.

Run the example with:

```text
node tools/run_theorycraft_request.mjs --input research/examples/theorycraft-prepared-snapshot-block-skill.json
```

The example is a controlled theorycraft input, not an observed build, cheese analysis, budget finding, or independent gameplay holdout. Its result remains `EXPERIMENTAL` with `finalDamage: null`.
