# Primary stat cross-source audit

Run `python tools/audit_catalog_primary_stats.py` to regenerate `research/evidence/catalog-primary-stat-audit.json`. The report hashes the saved catalog, original client bytecode reader, and exported client configuration inputs. This is a restricted formula parser and Python floating-point evaluation, not original Lua execution or gameplay validation.

The recovered `AwakerDataUtils.GetAwakerBaseAttrValue` reads a character configuration, chooses an upgrade formula by level plus a quality-dependent offset, supplies `talent_attr_lv` from `GetTalentAttrLv`, and evaluates that formula. Non-primary attributes follow a different branch. `GetTalentAttrLv` looks through two talent effect slots for `Talent_Attr_Lv` and reads its first effect value.

Catalog `ingameId` plus the explicit asset suffix `_AF` uniquely matches 60 of 61 character entries. Jenkin has seven matching client configurations; the audit leaves that identity unresolved rather than selecting one. Each uniquely matched character has one attribute-talent configuration, retained in the report with the rank-to-bonus mapping. Identity matching alone does not verify live availability or server compatibility.

For the 60 unique matches, the audit evaluates CON/ATK/DEF at every level 1–90 and explicit bonus levels 0/2/4/6/8/10: 97,200 comparisons. All formulas fit the restricted parser. There are 120 one-point differences from the catalog's epsilon-adjusted formula. For example, Aigis CON at level 14 with +10 attribute levels evaluates to `55.00000000000001` with the parsed client's operation order, so plain ceil yields 56; the catalog gives 55.

These differences require the original compiled formula and runtime to determine actual client output. Algebraic equivalence does not guarantee floating-point rounding equivalence. The catalog resolver retains its documented source behavior and now lists this discrepancy as unresolved. Do not replace it with the parsed result or claim either is gameplay-validated without further evidence.

## Original compiled formula follow-up

`tools/primary_stat_oracle.py` now executes the copied original FuncTable closures through the copied xlua runtime, supplying explicit base/extra/talent values and original Lua math. All 120 candidate discrepancies are confirmed, alongside 240 adjacent-level controls (360 cases total), saved in `tests/synthetic/original-primary-stats.json`. This upgrades the rounding discrepancy from parsed-formula evidence to original compiled expression evidence; it does not validate complete character lookup or gameplay.

`engine/client-primary-stats.mjs` reproduces the original operation order with explicit base, extra, upgradeLevel (including quality offset), talentBonusLevels and build. It uses plain ceil without epsilon and passes all 360 original-expression cases. The catalog resolver remains source-faithful and separately labeled; neither silently replaces the other.

## Connected lookup follow-up

`tools/primary_stat_lookup_oracle.py` executes original GetAwakerBaseAttrValue, GetUpgradeConfig, PreMakeUpgradeConfig and GetTalentAttrLv using original configuration tables and compiled formula closures. The constant getter reads exported original values; the GetFunc adapter selects original closures; enum initialization uses an identity adapter. Callback errors and nonnumeric results stop generation.

The saved evidence contains 2,700 cases: 60 uniquely matched characters × levels 1/14/24/70/90 × ranks 0/1/5 × three primary stats. `engine/client-build-stats.mjs` now accepts character identity, level, Gnostic rank and explicit PC build, resolves the numeric inputs and reproduces every case. `tools/prepare_client_build_data.py` emits minimal numeric mappings into `research/evidence/client-build-data.json`. Jenkin remains unresolved. No default Gnostic rank is inferred.

The connected lookup supports primary base stats only. Soulforge, full battle properties and independent observed values remain separate validation tasks; these outputs are not final equipped stats. The website planner now exposes this resolver with explicit client-build and progression choices and an expandable trace. Browser QA remains pending.
