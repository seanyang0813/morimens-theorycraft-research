# Guaranteed-critical capture paths

The installed PC resource-151 catalog contains eight states with `ExistProperty.certain_crit = 1`. A source-data audit finds five character skills whose description explicitly says the damage is guaranteed to crit. The identifier-free, reproducible catalog is [`guaranteed-crit-routes-res151.json`](../research/evidence/guaranteed-crit-routes-res151.json); regenerate it with:

```powershell
python tools/audit_guaranteed_crit_routes.py --modules research/observations/current-res151-build51/modules --output research/evidence/guaranteed-crit-routes-res151.json
```

| Character and skill | Command path | Use for a strict blind hit |
| --- | --- | --- |
| Xu, 入骨相思 (125371) | Command 125467 applies state 126539 to the caster, runs one direct `BEActiveDamage`, then removes that state. | Best source-backed candidate for the current ordinary Active adapter, once the character and a clearable PvE stage are available. |
| Pickman, 蚀骨色彩 (98990) | Command 98994 applies state 126539, invokes a nested command, then removes it. | Nested execution needs adapter coverage first. |
| Pontos, 纵魇掠袭 (142847) | Command 142848 applies state 126539 and invokes nested commands. | Nested/repeated execution needs adapter coverage first. |
| Castor, 翱翔夙愿 (89776) | Command 89789 applies persistent state 90082; this Exalt command itself has no direct damage. | A subsequent Castor damage hit could be deterministic if the state and all pre-hit properties are captured. |
| Erosion Rotan, 断界之剑 (146015) | Command 146025 has one direct damage row; a separate generated-card route can apply state 146077. | Requires proving that generated card and state are present immediately before the hit. |

The live account inspected on 2026-09-23 has 奥尔拉 as its sole unlocked Hyperdimension character, so it cannot use Castor's Exalt for this capture. In the inspected Deep Sea roster, the three unlocked characters are 凯刻斯, 希莱斯特 and 戈利亚; neither Pontos nor Miryam was available there. Xu and Pickman were displayed as locked in the Blood roster. This is a temporary account availability observation, not a claim about all game modes or trial characters. Erosion Rotan's availability was not checked. Player identifiers and roster screenshots are not published.

The catalog is a routing aid, not a damage prediction. It does not prove that any listed skill can be used in a stage on this account, that a first-command listing covers its entire effect graph, or that the calculator handles that graph. Universal relic or state-trigger routes may also force critical hits; these require their own availability and timing proof. If no deterministic route is accessible, the replay seed alone cannot resolve a chance-critical hit: the native PRNG and all intervening draws remain unknown. See [Critical Hit Resolution](CRITICAL_HIT_RESOLUTION.md).

A valid holdout still needs the normal sequence: commit a fresh same-process baseline before battle, finish one controlled PvE battle, load its new record, bind the recorded build and pre-hit properties, freeze one exact prediction before seeing the outcome, then reveal and compare. See [Live Replay Holdout Capture](LIVE_HOLDOUT_CAPTURE.md).
