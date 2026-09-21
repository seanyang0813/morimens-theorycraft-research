# Current-catalog retrospective gameplay consistency

Two anonymously labeled replays in the strict retrospective batch audit have embedded `Cmd` and `Skill` catalogs that exactly match resource 150 and contain current-exclusive rows with no baseline-exclusive or unmatched rows. Together they provide 79 complete hit snapshots and 13 Active-hit candidates. All 13 observed results match one independently calculated critical or noncritical branch, with zero branch mismatches.

This is real-game retrospective consistency evidence tied to the resource-150 data catalog. It does not identify the engine bytecode version that executed either battle, reconstruct the random draw, or provide frozen prediction chronology. Its status is therefore `RETROSPECTIVE_CURRENT_CATALOG_ENGINE_VERSION_UNCONFIRMED`, and it receives no holdout or publication-gate credit.

`tools/build_current_catalog_gameplay_consistency.py` rebuilds the public report solely by joining `replay-batch-recovery.json` and `replay-catalog-build-attribution.json`. The output contains anonymous batch labels and counts only. It belongs to the verification track; it is not a cheese, budget-scouting or theorycraft conclusion.
