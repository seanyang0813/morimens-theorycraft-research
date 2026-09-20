import {enqueueCommandRows} from './command-rows.mjs';

const permitted=marker=>`UpperTarget.GetStateLayer(${marker})>0 and UpperTarget.GetStateLayer(66314)==0 and UpperTarget.GetStateLayer(62317)==0`;
// Numeric execution fields shared by Cmd80572/81060; argument scaling is external.
const rows=[
  {id:'1',Type:'BEAddState',Para:80593,Cond:'UpperTarget.GetStateLayer(80575)>=Arg1'},
  {id:'2',Type:'BEAddState',Para:80594,Cond:'UpperTarget.GetStateLayer(80575)<Arg1'},
  {id:'3',Type:'BEChangeAttr.hp',Para:'Arg1*(-3)',Cond:permitted(80593)},
  {id:'4',Type:'BESubStateLayer',Para:'80575,Arg1',Cond:permitted(80593)},
  {id:'5',Type:'BEChangeAttr.hp',Para:'UpperTarget.GetStateLayer(80575)*(-3)',Cond:permitted(80594)},
  {id:'6',Type:'BERemoveState',Para:80575,Cond:permitted(80594)},
  {id:'7',Type:'BERemoveState',Para:80593},
  {id:'8',Type:'BERemoveState',Para:80594},
].map(row=>({...row,Target:'UpperTarget'}));

// Code-derived command composition. Caller supplies state/HP implementations and
// eligibility. A row and all ordinary descendants finish before the next row.
// Attached effects retain the scheduler's root-level placement.
export function enqueueOldEmbersCommand({scheduler,argument,getStateLayer,executeStep,canContinue}){
  if(!Number.isFinite(argument)||argument<0||!Number.isFinite(argument*3)||typeof getStateLayer!=='function'||typeof executeStep!=='function')throw new Error('Explicit finite argument, live state getter and effect executor required');
  const trace=[];
  const emit=(rowId,step)=>{const record={row:Number(rowId),...step};trace.push(record);executeStep(record);return null;};
  const command=enqueueCommandRows({scheduler,rows,canContinue,allowedFunctions:['UpperTarget.GetStateLayer'],
    readVariable:name=>{if(name!=='Arg1')throw new Error(`Unresolved variable ${name}`);return argument;},
    callFunction:(name,args)=>{
      if(name!=='UpperTarget.GetStateLayer'||args.length!==1)throw new Error('Unsupported state query');
      const value=getStateLayer(args[0]);
      if(!Number.isSafeInteger(value)||value<0||value>999999999)throw new Error(`Unresolved state ${args[0]}`);
      return value;
    },
    resolveTargets:selector=>{if(selector!=='UpperTarget')throw new Error('Unsupported target selector');return ['supplied-upper-target'];},
    handlers:{
      BEAddState:({rowId,parameters:p})=>emit(rowId,{type:'addState',stateId:p[0],layers:1}),
      BERemoveState:({rowId,parameters:p})=>emit(rowId,{type:'removeState',stateId:p[0]}),
      BESubStateLayer:({rowId,parameters:p})=>emit(rowId,{type:'subtractState',stateId:p[0],rawAmount:p[1]}),
      'BEChangeAttr.hp':({rowId,parameters:p})=>emit(rowId,{type:'changeHp',rawValue:p[0]}),
    }});
  return {status:'EXPERIMENTAL',finalDamage:null,trace,command,
    evidence:['PC144:OldEmbersScheduledComposition','PC144:OldEmbersEffectSteps','PC144:EffectOrder','PC144:CommandConditions'],
    unresolvedDependencies:['State mutation and HP/event adapters supplied','Eligibility and battle lifecycle supplied','State callback guards, target generation and before/finish phase hooks not executed','Independent gameplay validation']};
}
