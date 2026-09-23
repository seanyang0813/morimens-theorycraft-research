# PC resource 153 update boundary

On 2026-09-23, Morimens required a restart to download resource 153 / build 51. This ended the previous resource-151 process. Its private replay inventory and public pre-battle baseline cannot prove provenance for any later fight.

The [installed-build report](../research/evidence/pc-res144-to-res153-combat-build.json) binds the new manifest and bundle hashes. The [151-to-153 code comparison](../research/evidence/pc-res151-to-res153-combat-carryforward.json) finds all 15 tracked combat Lua TextAssets byte-identical, despite a changed `gamescript.ab` bundle hash. This is a selected-module result, not a whole-client equality claim.

The [private-export catalog comparison](../research/evidence/pc-res151-to-res153-config-catalogs.json) covers the five tables consumed by the narrow replay adapter. BattleApi is Lua-semantically equivalent. The other tables have these differences after one-based-list and empty-table normalization:

| Table | Added rows | Changed shared rows |
|---|---:|---:|
| Skill | 0 | 25 |
| Cmd | 1 | 5 |
| State | 1 | 22 |
| BattleApi | 0 | 0 |
| Constant | 3 | 0 |

The changed Skill, Cmd and State rows require scoped routing and effect review. The three new Constant keys relate to a new Abyss Challenge version; this is only a key-name classification, not a proof that no combat path reads them. A [reproducible value-free audit](../research/evidence/pc-res153-mouchette-arachne-selected-rows.json) finds the selected Mouchette skills 122483, 122484 and 123159, Arachne Strike skill 126484, their selected command rows 122499, 123160, 133367, 134282, 134385 and 134386, and the selected states 122504, 123703, 124656, 123165, 123307, 134383, 134382, 70350 and 133368 unchanged under the same normalization. Regenerate it with `python tools/audit_res153_selected_rows.py` while the ignored private exports are present. That protects only these named rows, not their entire nested dependency graphs, enemy states or a complete Mouchette rotation.

The local website and agent API remain research previews pinned to their explicitly supported older builds. Do not label an old replay as resource 153 because it was viewed after the update. Do not freeze a resource-153 gameplay prediction using the resource-151 compatibility report. Before a resource-153 holdout, trace the changed catalog rows reachable by the chosen action, refresh current-build state classification, compose a new bounded adapter compatibility report, then capture and commit a new same-process pre-battle baseline. An exact deterministic prediction must still be committed before revealing the recorded outcome.

No gameplay validation or publication credit is gained by this version comparison. The public website publication gate remains **NOT_READY**.

## Current-session character-trial diagnostic

A new resource-153 process was started after the update, and its private replay-reference inventory was committed [before the Karab character trial](../research/evidence/holdout-res153-karab-trial-baseline-20260923.json). The baseline contained zero replay references. A same-process memory delta taken while the trial was still in round two also contained zero references after scanning 3,304,443,904 readable bytes. This is a negative **mid-battle** observation only: it does not establish whether a completed or won character trial writes a replay. No card was successfully played through computer control, and no damage observation, replay prediction, or holdout is claimed. The trial's Fixed-damage tooltip is an input hint, not an observed damage result.
