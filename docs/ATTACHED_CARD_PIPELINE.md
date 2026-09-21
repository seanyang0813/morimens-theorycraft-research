# Attached-card pipeline

`engine/attached-card-pipeline.mjs` composes three bounded mechanics: `BEAttachPostAction` request planning, `BattleUnitBase.UseAttachPostCard` temporary-card/effect construction, and matching-build catalog resolution for that temporary card's command. It stops immediately when a missing target or positive `seal_attachpost` gates the request.

The runnable Mouchette fixture uses explicit demonstration inputs: 1,000 `BattleAtkForce`, two layers of state 122512, one layer of state 124039, and no pre-command. These are test values, not inferred build facts or a damage prediction. With those inputs, the real resource-144 skill row 123159 resolves command 123163, base arguments `[300, 6]`, and ordered effect types `BEActiveDamage`, `BEAddState`, `BERemoveState`.

Run it from the repository root:

```text
node tools/run_attached_card_pipeline.mjs research/examples/attached-mouchette-card-pipeline.json
```

The output retains every boundary trace and catalog hash. Callers may also supply an explicit damage-prefix context; the pipeline then binds its resolved `ArgN` values into `engine/command-damage-prefix.mjs`. A matching conditional state-suffix context can handle the remaining state rows when its explicit branch is supported. In the covered Mouchette branch, all seven rows are accounted for: six 300-damage hits occur before state 123168 adds 25 `i_damage_per_strikecard`, while the other gated state rows are skipped or remove an absent state. The effect queue, callbacks and other condition branches remain incomplete. This shared mechanics artifact is neither a cheese finding nor a theorycraft recommendation.

`tools/verify_mouchette_attached_pipeline.mjs` also replays the first pursuit component from the earlier level-90 equipped case-study vectors. Catalog preparation derives arguments `[78, 3]`; the prefix produces three 4,489 hits for 13,467 modeled HP loss, exactly matching the earlier component; the +25 Strike-card property appears afterward. This cross-check does not repair the case study's missing Arachne realm/team inputs and receives no gameplay or publication credit.
