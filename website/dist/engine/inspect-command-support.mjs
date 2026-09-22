import {importCommandRows} from './import-command-rows.mjs';
import {compileNumericCommand,compileCommandCondition} from './command-expressions.mjs';

// Conservative compatibility inspection; never removes unsupported effects.
export function inspectCommandSupport({command,allowedFunctions=[],profile='ordinary-active-UpperTarget',targetExpression='UpperTarget'}){
  if(!['ordinary-active-UpperTarget','damage-and-energy','terminal-self-state','role-state-setup'].includes(profile))throw new Error('Unknown command support profile');
  if(!command||!command.data_list||typeof command.data_list!=='object')throw new Error('Exported command data_list required');
  const imported=importCommandRows(command);
  const terminal=profile==='terminal-self-state',setup=profile==='role-state-setup';
  const firstStateIndex=terminal?imported.rows.findIndex(row=>row.Type==='BEAddState'):-1;
  const validStateSuffix=!terminal||(firstStateIndex>0&&imported.rows.slice(firstStateIndex).every(row=>row.Type==='BEAddState'));
  const rows=imported.rows.map(({id,...row},index)=>{
    const blockers=[];
    if(!row||typeof row!=='object'||Array.isArray(row))return {id,blockers:[{code:'INVALID_ROW'}]};
    const state=(terminal&&index>=firstStateIndex&&row.Type==='BEAddState')||(setup&&['BEAddState','BESubStateLayer','BERemoveState'].includes(row.Type));
    const presentation=setup&&row.Type==='BEMonsterBubble';
    const energy=(profile==='damage-and-energy'||terminal)&&row.Type==='BEGainUltiEnergy';
    const damage=row.Type==='BEActiveDamage';
    if(!damage&&!energy&&!state&&!presentation)blockers.push({code:'EFFECT_HANDLER',value:row.Type??null});
    if(terminal&&!validStateSuffix)blockers.push({code:'TERMINAL_STATE_SUFFIX'});
    const expectedTargets=setup?[targetExpression]:state&&terminal?['CmdCaster',targetExpression]:[state||energy?'CmdCaster':terminal?targetExpression:'UpperTarget'];
    if(!expectedTargets.includes(row.Target))blockers.push({code:'TARGET_BINDING',value:row.Target??null});
    if((state||presentation)&&Object.hasOwn(row,'Cond'))blockers.push({code:setup?'SETUP_ROW_CONDITION':'TERMINAL_STATE_CONDITION'});
    if(Object.hasOwn(row,'VFX'))blockers.push({code:'PRESENTATION_RNG',detail:'Original PlayEffectSfx may call battleEngine.rand for player targets; explicit target context and RNG handling required'});
    // Metadata and presentation fields also need an explicit adapter policy.
    for(const field of Object.keys(row))if(!(setup?['Type','Target','Para','DelayTime']:['Type','Target','Para','Cond']).includes(field))blockers.push({code:'ROW_FIELD',field});
    for(const [field,compile] of [['Para',compileNumericCommand],['Cond',compileCommandCondition]]){
      if(field==='Cond'&&!Object.hasOwn(row,field))continue;
      if(setup&&presentation&&field==='Para'){
        const pieces=String(row[field]).split(',');if(pieces.length<1||pieces.length>2||!pieces[0])blockers.push({code:'EXPRESSION',field,detail:'Monster bubble requires tip and optional display time'});else if(pieces.length===2)try{compileNumericCommand(pieces[1],{allowedFunctions});}catch(error){blockers.push({code:'EXPRESSION',field,detail:error.message});}
      }else try{compile(row[field],{allowedFunctions});}catch(error){blockers.push({code:'EXPRESSION',field,detail:error.message});}
    }
    return {id,type:row.Type??null,target:row.Target??null,blockers};
  });
  return {status:'STATIC_COMPATIBILITY_INSPECTION',profile,importMetadata:imported.metadata,normalizedRows:imported.rows,rowCount:rows.length,rows,
    structurallyCompatible:rows.length>0&&rows.every(r=>r.blockers.length===0),executable:false,
    remainingRuntimeChecks:setup?['Numeric bindings','Explicit role registry, catalog state definitions and live properties','State immunity, limits, trigger listeners and automatic clear events','Original row construction and scheduling']:['Numeric bindings and condition outcomes','Damage subtype and ParaPlus restrictions','Resolved offense, target modifiers, immunity and repetition inputs',terminal?'Terminal state definition, layer request, immunity and live property snapshots':'Costs, lifecycle, state changes and trigger listeners','Original row construction and ordering'],
    limitations:['Checks current authored experiment compatibility, not correctness of the game command','No row is dropped; compilation does not evaluate expressions or prove runtime support','Not a gameplay prediction or full skill execution']};
}
