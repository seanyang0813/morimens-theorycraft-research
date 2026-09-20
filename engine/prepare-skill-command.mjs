import {resolveScalarSkillField} from './skill-field.mjs';
import {selectProgressionList} from './skill-list.mjs';
import {buildNumericSkillArguments} from './skill-growth.mjs';

export function prepareSkillCommand({skill,skillLevel,isAwaker,breakSkillLevel,potencyLevel,formulaExpressions,overrides,evaluateCondition,allowedFunctions=[],readVariable,callFunction}){
  const field=name=>resolveScalarSkillField({skill,field:name,isAwaker,breakSkillLevel,potencyLevel,evaluate:evaluateCondition});
  const command=field('CmdList'),parameter=field('Para');
  if(!Number.isSafeInteger(command.value)||command.value<=0)throw new Error('No resolved numeric command ID');
  if(parameter.value===null)throw new Error('No supported parameter expression');
  const levels={breakSkillLevel:isAwaker?breakSkillLevel:0,potencyLevel:isAwaker?potencyLevel:0};
  const formulas=selectProgressionList({value:skill.CoefficientTypelist??null,...levels});
  const coefficients=selectProgressionList({value:skill.OriginalCoefficient??null,...levels});
  const names=formulas.value??[];
  if(formulas.selection&&formulas.value===null)throw new Error('Missing formula-list variant');
  if(names.length&&(!coefficients.value||coefficients.value.length<names.length))throw new Error('Missing coefficient input; original default path not supported yet');
  const argumentsResult=buildNumericSkillArguments({growth:{formulaNames:names,originalCoefficients:names.length?coefficients.value.slice(0,names.length):[],skillLevel,formulaExpressions},parameterExpression:parameter.value,overrides,allowedFunctions,readVariable,callFunction});
  return {status:'PREPARED_COMMAND_UNVERIFIED',commandId:command.value,arguments:argumentsResult.arguments,
    argumentBindings:Object.fromEntries(argumentsResult.arguments.map((value,i)=>['Arg'+(i+1),value])),
    selection:{command,parameter,formulas,coefficients},argumentCalculation:argumentsResult,
    unresolvedDependencies:['Internal progression, attack/state variables and condition outcomes supplied; character/build assembly absent','Selected command still requires handler, target, cost and lifecycle support','Composed field-to-argument pipeline not validated as a connected original execution or gameplay prediction']};
}
