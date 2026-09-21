# Replay analysis workflows

The replay pipeline supports four related but distinct jobs. Reports must name the job they perform and must not use one label as evidence for another.

## Budget-comp scouting

Compare successful records from the same D-Tide stage, wave and difficulty. Extract factual investment signals: character levels, Potential/Exalt levels (`potencyLevel` in the payload), break and skill ranks, and resolved battle properties. Find the Pareto frontier instead of inventing a weighted cost score. A low-investment clear is a candidate for study; it is not automatically a cheese strategy.

Replay role data does not identify Wheel enhancement directly. If the leaderboard detail view or another provenance-bearing source supplies it, store it as a separate observation rather than inferring it from final stats.

## Cheese analysis

Look for unusual sequencing, repeated state transitions, resource loops, damage-cap routing, survival resets or other mechanics that explain a result. A cheese claim needs a trace of the relevant cards, states and outcomes. Popularity, low level or a high leaderboard position is not enough.

## Theorycrafting

Use reconstructed rules to simulate builds and action sequences, including combinations absent from observed records. Every output must label unsupported branches and list the inputs that were supplied rather than recovered.

## Verification

Freeze a prediction from pre-outcome evidence, commit it, then reveal the matching recorded outcome. Retrospective exact checks are useful regression evidence but do not replace this chronology.

## Private tools

`tools/summarize_decoded_replay.py` creates an identifier-free private sequence summary. Its required `--analysis-track` is one of `budget-scouting`, `cheese-analysis`, `theorycrafting` or `verification`; the value is stored in the artifact. By default it excludes outcome numbers; `--include-outcomes` enables retrospective analysis. `tools/index_decoded_replay.py --strategy-summary-output ...` can emit the same summary during indexing and likewise requires the track. `tools/rank_budget_replays.py` accepts only `budget-scouting` summaries and enforces an identical nonempty stage, wave and difficulty before computing the Pareto frontier.

Raw containers, decoded records, player names, UIDs, replay keys and instance IDs remain private. Public reports may include aggregated counts, catalog IDs, mechanics and anonymized investment ranges only.
