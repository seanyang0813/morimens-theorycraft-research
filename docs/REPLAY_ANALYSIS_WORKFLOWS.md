# Replay analysis workflows

The replay pipeline supports four separate jobs. The wider project also has a fifth, non-replay track for mechanics reconstruction; see `ANALYSIS_TRACKS.md`. These tracks may reuse parsers and sanitized source records, but they do not share conclusions. Every report has exactly one analysis track, and evidence gathered for one track must not be presented as a result from another track. Generated strategy summaries carry a machine-readable `claimBoundary` with the track's purpose, allowed claims, forbidden claims and the only permitted handoff to another track.

A promising budget clear can start a new cheese investigation or theorycraft experiment, but that follow-up must be a separate artifact with its own question and evidence. A cheese trace can suggest a model rule, but it does not verify that rule. A theorycraft result becomes verification evidence only through the frozen-prediction chronology below.

Mechanics reconstruction uses recovered client code, catalog data and bounded
runtime fixtures to establish what a rule does. A replay may motivate that work,
but the mechanics report remains separate from cheese classification and from any
forward theorycraft result.

## Budget-comp scouting

Compare successful records from the same D-Tide stage, wave and difficulty. Extract factual investment signals: character levels, Potential/Exalt levels (`potencyLevel` in the payload), break and skill ranks, and resolved battle properties. Find the Pareto frontier instead of inventing a weighted cost score. A low-investment clear is a candidate for study; it is not automatically a cheese strategy.

Replay role data does not identify Wheel enhancement directly. If the leaderboard detail view or another provenance-bearing source supplies it, store it as a separate observation rather than inferring it from final stats.

## Cheese analysis

Look for unusual sequencing, repeated state transitions, resource loops, damage-cap routing, survival resets or other mechanics that explain a result. A cheese claim needs a trace of the relevant cards, states and outcomes. Popularity, low level or a high leaderboard position is not enough.

Cheese analysis is an observational investigation. It can produce a mechanic hypothesis. It cannot produce an optimal-build claim, a forward damage result or formula verification. If the hypothesis is useful for build design, create a separate theorycraft artifact that cites it and lists any unsupported rule.

## Theorycrafting

Use reconstructed rules to simulate builds and action sequences, including combinations absent from observed records. Every output must label unsupported branches and list the inputs that were supplied rather than recovered.

Theorycrafting asks what a specified build or sequence should do under the model. It does not classify a replay as cheese and does not inherit verification status from a replay that inspired the experiment.

## Verification

Freeze a prediction from pre-outcome evidence, commit it, then reveal the matching recorded outcome. Retrospective exact checks are useful regression evidence but do not replace this chronology.

## Private tools

`tools/summarize_decoded_replay.py` creates an identifier-free private sequence summary. Its required `--analysis-track` is one of `budget-scouting`, `cheese-analysis`, `theorycrafting` or `verification`; the value is stored in the artifact. By default it excludes outcome numbers; `--include-outcomes` enables retrospective analysis. `tools/index_decoded_replay.py --strategy-summary-output ...` can emit the same summary during indexing and likewise requires the track. `tools/rank_budget_replays.py` accepts only `budget-scouting` summaries and enforces an identical nonempty stage, wave and difficulty before computing the Pareto frontier.

Raw containers, decoded records, player names, UIDs, replay keys and instance IDs remain private. Public reports may include aggregated counts, catalog IDs, mechanics and anonymized investment ranges only.
