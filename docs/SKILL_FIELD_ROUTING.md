# Scalar skill-field routing

`engine/skill-field.mjs` connects conditional and progression selection using the inspected GetSkillConfigTQText routing order:

1. A present temp-prefixed field takes priority and uses conditional selection.
2. Otherwise, a skill marked IsPVP uses conditional selection for CmdList, CmdTarget, Desc, BattleDesc and Name.
3. Other scalar fields use progression selection; non-Awakener roles use zero breakthrough/potency thresholds.

Lua presence is preserved: zero and empty strings are present, while false/nil are absent for temporary override and ordinary-field checks. Supported direct values are finite numbers and strings. Dense conditional lists may be normalized arrays or exported numeric-key pair tables. Sparse lists, nested selected values and other unsupported forms throw rather than being misclassified. A scalar field absent from the supported path remains null.

`tools/skill_field_routing_oracle.py` executes original GetSkillConfigTQText connected to original GetTQText/GetMatchTQ or conditional-list helpers in 64 cases. Skill tables, role/progression getters and expression outcomes are supplied. Tests match selected values and actual expression reads, covering temporary priority, PvP whitelist routing, PvP Para using progression, zero values, false temporary overrides, missing fields and non-Awakener behavior.

The exported-table audit now resolves the main format uncertainty for CmdList. All 621 nested tables carry IsPVP=true; the other 24 table-valued references are scalar progression maps. There are 2,885 direct scalar references and 63 absent references. Temporary fields are already exported (74 tempBattleDesc, 10 tempOverLimitUtlSkillDesc, 4 tempIcon and 11 tempName). `tools/inspect_skill_routing.py` records these counts and the export hash in `research/evidence/skill-routing-audit.json`.

Inspected ResourceCache.GetLine deep-clones the loaded config row and invokes an owner OnVisitNewLine hook once; DTSpier forwards lookups to that cache. The inspected base BattleEngine.OnVisitNewLine is empty. This path does not demonstrate another skill-formatting step. It is not an exhaustive audit of all hooks, subclasses or later mutations. Conditional routing must use the exported flags/fields, not guessed table shapes.

`node tools/resolve_skill_field.mjs research/examples/skill-field-request.json` now resolves one scalar field from the actual local Skill export. The example selects CmdList 57564 for skill 4163 with explicit internal progression 0/3. Requests include skillId, field, isAwaker, breakSkillLevel, potencyLevel and conditionResults. Runtime expressions without explicitly supplied outcomes fail. Output includes the export hash, routing/selection trace and condition reads; this is an agent-facing field lookup, not damage or a complete card.

GetSkillConfigTQList, missing role objects, user-facing progression mapping, character-to-skill selection and complete card execution remain unfinished. No gameplay validation is implied by the static routing audit or CLI lookup.
