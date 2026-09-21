# Current-catalog retrospective gameplay consistency

Three anonymously labeled replays have embedded `Cmd` and `Skill` catalogs that exactly match resource 150 and contain current-exclusive rows with no baseline-exclusive or unmatched rows. Direct recalculation through the bounded resource-150 adapter covers 79 complete hit snapshots and finds 13 Active-hit candidates. All 13 observed results match one independently calculated critical or noncritical branch, with zero branch mismatches.

This is real-game retrospective consistency evidence calculated with the resource-150 model and tied to the resource-150 data catalog. It does not identify the engine bytecode version that executed the historical battles, reconstruct the random draw, or provide frozen prediction chronology. Its status is therefore `RETROSPECTIVE_CURRENT_CATALOG_ENGINE_VERSION_UNCONFIRMED`, and it receives no holdout or publication-gate credit.

`tools/audit_replay_batch.mjs --combat-build pc-res150-build51` performs the private recalculation, and `tools/build_current_catalog_gameplay_consistency.py` joins its anonymous counts to `replay-catalog-build-attribution.json`. The public output contains anonymous batch labels and counts only. It belongs to the verification track; it is not a cheese, budget-scouting or theorycraft conclusion.
