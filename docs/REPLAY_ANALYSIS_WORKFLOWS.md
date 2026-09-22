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

`tools/process_private_replay_batch.py` is the resumable archive-preparation step. It selects numbered containers from ignored `research/raw/`, decodes them with explicit server-compatible Latin-1 conventions, reconstructs the chronological index in memory and writes `decoded.json` plus the compact candidate index under ignored `research/observations/`. It skips complete outputs, verifies a partial decoded artifact against the container hash before resuming, writes atomically and supports bounded parallel workers. Full forensic indexes are opt-in for a small selected set because they can be hundreds of megabytes each. `--plan-only` lists selected, pending and already complete batches without reading combat outcomes.

`tools/audit_replay_batch.mjs` accepts either explicit replay specifications or `--batch-root` plus `--container-root` and an inclusive batch range. Directory discovery is numeric, requires each container, decoded artifact and compact index, and avoids Windows command-line limits for large archives. The audit performs retrospective damage checks and combat-domain classification; it must not be described as a blind holdout.

`tools/summarize_decoded_replay.py` creates an identifier-free private sequence summary. Its required `--analysis-track` is one of `budget-scouting`, `cheese-analysis`, `theorycrafting` or `verification`; the value is stored in the artifact. By default it excludes outcome numbers; `--include-outcomes` enables retrospective analysis. `tools/index_decoded_replay.py --strategy-summary-output ...` can emit the same summary during indexing and likewise requires the track. `tools/rank_budget_replays.py` accepts only `budget-scouting` summaries and enforces an identical nonempty stage, wave and difficulty before computing the Pareto frontier.

`tools/inventory_private_replays.py` is the scalable first pass for large replay archives. It streams only each index's top-level `battleDat` object, strips direct player, replay, battle-instance and role-instance identifiers, resolves public battle-template and Awakener names, and computes investment signals. It records structural groups only when server stage, battle template, difficulty ID and template wave all match. A separate Pareto frontier is emitted only for members independently classified `PVE_MONSTER_TARGETS` through one or more `--domain-audit` inputs. The frontier uses the same unweighted investment dimensions as `rank_budget_replays.py`. Output is restricted to the ignored `research/observations` directory. The inventory is always labeled `budget-scouting`; it cannot classify cheese or establish a theorycraft result.

The historical private inventory covers 69 captures and contains 13 same-coordinate structural groups. Target-role-only routing excluded all of them from PvE budget comparison. That result remains preserved in `research/evidence/replay-budget-domain-routing.json`.

The later 102-record tranche supplies a stronger domain boundary: every record carries a replay-embedded `BattleConfig` row whose ID matches `battleDat.battleTid`, whose battle type is `Boss`, and which declares at least one Monster. This routes all 102 records to PvE even though a full battle naturally contains hits against both the Monster and the player entity. Ten exact battle/template-wave/server-difficulty groups contain 9–11 records each. Their unweighted investment Pareto frontiers contain twenty-six candidates, including one four-character roster with a total level of 255 and no character above level 70. The public roster/progression report is `research/evidence/pve-budget-frontiers-round-003.json`. It omits player, replay and dynamic stage-instance identifiers. The server difficulty ID is not translated into a user-facing difficulty label, Wheel enhancement is absent, and frontier membership is budget scouting rather than cheese, formula verification or an optimal-build claim.

Raw containers, decoded records, player names, UIDs, replay keys and instance IDs remain private. Public reports may include aggregated counts, catalog IDs, mechanics and anonymized investment ranges only.

Before routing a new private index into a PvE workflow, run `node tools/classify_replay_combat_domain.mjs --index <private-index.json>`. The preflight reads only complete hit target identities and role types. `PVP_PLAYER_TARGETS` must not enter D-Tide, PvE budget, PvE cheese or PvE theorycraft artifacts; `MIXED_OR_UNKNOWN_TARGETS` requires separate review rather than an inferred domain.

The retrospective damage-regression corpus is a separate verification artifact. Its 428 candidates all come from selected Monster hits inside 19 mixed-domain records; 23 Player-only records contribute zero candidates. The candidate adapter independently requires each chosen target to be a Monster, so those hits remain useful component regressions without turning their whole source records into PvE evidence. They provide no D-Tide budget ranking, cheese classification, forward theorycraft result, blind holdout or publication credit. The identifier-free aggregate is `research/evidence/replay-regression-domain-routing.json`.
