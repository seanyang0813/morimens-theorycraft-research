import {snapshot} from './experiments.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {compileNumericCommand,compileCommandCondition} from './command-expressions.mjs';
import {runRoleStateCommand} from './role-state-command.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const map=value=>value&&typeof value==='object'&&!Array.isArray(value);
const stateTypes=new Set(['BEAddState','BESubStateLayer','BERemoveState']);

// Resolve a state-only suffix with explicit pre-row state queries. Queries may
// not read a state changed earlier in the suffix, and positive queried states
// may not also be mutated until initial-state registry support is connected.
export function runConditionalRoleStateSuffix(value){
  const input=snapshot(value),keys=['schemaVersion','kind','build','otherEvents','command','variables','stateQueries','stateQueryTargets','targetBindings','roles','definitions'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-conditional-role-state-suffix'||input.build!=='pc-res144-build51'||input.otherEvents!=='assumed-absent')throw new Error('Explicit resource-144 conditional role-state suffix required');
  if(!map(input.variables)||Object.values(input.variables).some(value=>!Number.isFinite(value))||!map(input.stateQueries)||!map(input.stateQueryTargets))throw new Error('Explicit finite variables and state-query maps required');
  const allowedFunctions=Object.keys(input.stateQueries);
  if(!exact(input.stateQueryTargets,allowedFunctions)||allowedFunctions.some(name=>!map(input.stateQueries[name])||typeof input.stateQueryTargets[name]!=='string'||!Object.hasOwn(input.targetBindings??{},input.stateQueryTargets[name])||Object.entries(input.stateQueries[name]).some(([id,result])=>!Number.isSafeInteger(Number(id))||!Number.isFinite(result))))throw new Error('Each state query requires an explicit bound target and finite state layers');
  const imported=importCommandRows(input.command),mutatedByCommand=new Set();
  for(const row of imported.rows){
    if(!stateTypes.has(row.Type)||!Object.hasOwn(input.targetBindings,row.Target))throw new Error('State-only rows with explicit target bindings required');
    const values=compileNumericCommand(String(row.Para))(name=>input.variables[name]).values;
    if(!Number.isSafeInteger(values[0]))throw new Error('State row must resolve an integer state ID');
    mutatedByCommand.add(`${row.Target}:${values[0]}`);
  }
  for(const [name,values] of Object.entries(input.stateQueries))for(const [id,layer] of Object.entries(values))if(layer!==0&&mutatedByCommand.has(`${input.stateQueryTargets[name]}:${id}`))throw new Error('Positive queried state also mutated; initial-state registry support required');
  const mutated=new Set(),conditionTrace=[],selected=[];
  for(const row of imported.rows){
    let passed=true,evaluation=null;
    if(Object.hasOwn(row,'Cond')){
      evaluation=compileCommandCondition(String(row.Cond),{allowedFunctions})(name=>input.variables[name],(name,args)=>{
        if(args.length!==1||!Number.isSafeInteger(args[0])||!Object.hasOwn(input.stateQueries[name]??{},String(args[0])))throw new Error('Unresolved suffix state query');
        const key=`${input.stateQueryTargets[name]}:${args[0]}`;
        if(mutated.has(key))throw new Error('Condition reads state mutated earlier in suffix');
        return input.stateQueries[name][String(args[0])];
      });
      passed=evaluation.passed;
    }
    conditionTrace.push({rowId:row.id,condition:row.Cond??null,passed,evaluation});
    if(!passed)continue;
    const values=compileNumericCommand(String(row.Para))(name=>input.variables[name]).values;
    const {id,Cond,...behavior}=row;selected.push({sourceRowId:id,behavior});mutated.add(`${row.Target}:${values[0]}`);
  }
  if(selected.length===0)return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:true,conditionTrace,selectedRowIds:[],execution:null,roles:snapshot(input.roles),states:[],finalDamage:null,unresolvedDependencies:['All suffix rows were gated by explicit static pre-row state queries','No initial-state registry, triggers, callbacks, automatic targeting, gameplay or independent holdout validation']};
  const command={data_list:Object.fromEntries(selected.map((row,index)=>[String(index+1),row.behavior]))};
  const execution=runRoleStateCommand({schemaVersion:1,kind:'morimens-role-state-command',build:input.build,otherEvents:input.otherEvents,command,variables:input.variables,targetBindings:input.targetBindings,roles:input.roles,definitions:input.definitions});
  const trace=execution.trace.map((row,index)=>({...row,rowId:selected[index].sourceRowId,adapterRowId:row.rowId}));
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:execution.completed,conditionTrace,selectedRowIds:selected.map(row=>row.sourceRowId),execution:{...execution,trace},roles:execution.roles,states:execution.states,finalDamage:null,
    unresolvedDependencies:[...execution.unresolvedDependencies,'Condition queries are explicit pre-row snapshots and fail if an earlier suffix row mutates the queried state','Positive queried states that are also mutated require unsupported initial-state registry construction','No trigger callbacks, automatic target acquisition, gameplay or independent holdout validation']};
}
