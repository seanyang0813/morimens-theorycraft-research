import {compileNumericCommand} from './command-expressions.mjs';
import {normalizeSkillArguments} from './skill-arguments.mjs';
export function resolveSkillGrowth({formulaNames,originalCoefficients,skillLevel,formulaExpressions}){
  if(!Number.isSafeInteger(skillLevel)||skillLevel<1||!Array.isArray(formulaNames)||!Array.isArray(originalCoefficients)||formulaNames.length!==originalCoefficients.length||!formulaExpressions)throw new Error('Explicit skill level, formulas and one original coefficient per formula required');
  const trace=[],members={},values=[];
  for(let i=0;i<formulaNames.length;i++){
    const name=formulaNames[i],coefficient=originalCoefficients[i];
    if(typeof name!=='string'||!Object.hasOwn(formulaExpressions,name)||typeof formulaExpressions[name]!=='string'||!Number.isFinite(coefficient))throw new Error('Unresolved growth formula or coefficient');
    members.GrowArgValue=coefficient;
    const evaluation=compileNumericCommand(formulaExpressions[name])(variable=>variable==='SkillLevel'?skillLevel:Object.hasOwn(members,variable)?members[variable]:undefined);
    if(evaluation.values.length!==1)throw new Error('Growth formula must return one numeric value');
    members['GrowArgValue'+(i+1)]=evaluation.values[0];values.push(evaluation.values[0]);
    trace.push({index:i+1,name,coefficient,expression:formulaExpressions[name],evaluation});
  }
  return {status:'EXPERIMENTAL',values,members,trace};
}
export function buildNumericSkillArguments({growth,parameterExpression,overrides,allowedFunctions=[],readVariable,callFunction}){
  const resolved=resolveSkillGrowth(growth);
  const parameters=compileNumericCommand(parameterExpression,{allowedFunctions})(name=>{
    if(name==='SkillLevel')return growth.skillLevel;
    if(Object.hasOwn(resolved.members,name))return resolved.members[name];
    if(typeof readVariable!=='function')throw new Error('Unresolved skill variable '+name);
    return readVariable(name);
  },callFunction);
  const args=normalizeSkillArguments(parameters.values,overrides);
  return {status:'EXPERIMENTAL',arguments:args,growth:resolved,parameters,
    unresolvedDependencies:['Coefficient lists and internal skill level supplied to this component; ownership not reconstructed','Expression/parser environment bindings supplied; full original skill-to-command execution not reproduced','Numeric expression form only; no parameter-list table, missing coefficient default, descriptions or gameplay validation']};
}
