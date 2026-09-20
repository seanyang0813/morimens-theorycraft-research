# Skill argument rounding and snapshots

PC144/build51 code evidence, with 24 isolated original-runtime numeric normalization checks.

BattleCmdServer.GenerateEffectList calls GetSkillArgs, then stores the returned list through cmdParser.UpdateSkillArgs before constructing the effects. GetSkillArgs ceilings ordinary numeric values from __CalcBaseSkillArgs. It then overwrites entries with createCardArgs values; these explicit overrides are not rounded again by this method. Lua numeric zero is a valid override.

BattleCmdParser.GetGlobalValue resolves ArgN from its stored skillArgs list when present. Only absent entries fall back to evaluating configPara. The parser caches compiled expression functions, not necessarily their numeric results; those functions are called again by GetValueByCmd/GetValueListByCmd. However, re-evaluating an expression containing Arg1 can still return the already stored, rounded Arg1.

Consequently BEActiveDamage.Damage2SingleTarget calling GenParams on every hit does not prove that the skill's base ATK expression is recomputed for each hit. Ordinary ArgN values are established at effect-list generation. Direct property expressions and subsequent offensive/crit/target calculations can read later state. Child command generation may establish a new argument list. Do not flatten these distinct timing boundaries into either "everything snapshots" or "everything updates".

`engine/skill-arguments.mjs` handles finite numeric dense lists and explicit dense-prefix overrides only. `tests/skill-arguments.test.mjs` compares it with original GetSkillArgs across 24 cases, including fractional/negative values and fractional/zero overrides. The oracle supplies __CalcBaseSkillArgs output and omits the description branch; it does not validate growth-expression evaluation, arbitrary argument types, sparse overrides, card initialization or scheduler timing.

## Correction to the superseded Mouchette examples

The intermediate SKeyDB example previously passed fractional ATK coefficients directly to the offensive utility. That skipped this ordinary skill-argument ceiling. The baseline script is now corrected to normalize its unoverridden arguments first. It refuses default execution while the revised user setup remains unresolved; an explicit --historical-baseline flag permits inspection of the old noncritical setup only. Those outputs are not answers to the user's revised crit/Soulforge request.

The earlier PDF statement that raw damage arguments always retain decimals until the damage utility is incorrect for this ordinary stored-Arg path. Its totals and presentation remain superseded pending a corrected, fully specified scenario. The utility-level differential tests are unaffected: they test resolved utility inputs, not conversion from character ATK to stored skill arguments.
