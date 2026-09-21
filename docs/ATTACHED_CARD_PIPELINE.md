# Attached-card pipeline

`engine/attached-card-pipeline.mjs` composes three bounded mechanics: `BEAttachPostAction` request planning, `BattleUnitBase.UseAttachPostCard` temporary-card/effect construction, and matching-build catalog resolution for that temporary card's command. It stops immediately when a missing target or positive `seal_attachpost` gates the request.

The runnable Mouchette fixture uses explicit demonstration inputs: 1,000 `BattleAtkForce`, two layers of state 122512, one layer of state 124039, and no pre-command. These are test values, not inferred build facts or a damage prediction. With those inputs, the real resource-144 skill row 123159 resolves command 123163, base arguments `[300, 6]`, and ordered effect types `BEActiveDamage`, `BEAddState`, `BERemoveState`.

Run it from the repository root:

```text
node tools/run_attached_card_pipeline.mjs research/examples/attached-mouchette-card-pipeline.json
```

The output retains every boundary trace and catalog hash. It does not execute the command rows or effect queue, so it cannot yet calculate the follow-up's final damage. This shared mechanics artifact is neither a cheese finding nor a theorycraft recommendation.
