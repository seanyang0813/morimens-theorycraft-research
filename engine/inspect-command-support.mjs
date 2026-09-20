import {importCommandRows} from './import-command-rows.mjs';
import {compileNumericCommand,compileCommandCondition} from './command-expressions.mjs';

// Conservative compatibility inspection; never removes unsupported effects.
export function inspectCommandSupport({command,allowedFunctions=[],profile='ordinary-active-UpperTarget',targetExpression='UpperTarget'}){
  if(!['ordinary-active-UpperTarget','damage-and-energy','terminal-self-state'].includes(profile))throw new Error('Unknown command support profile');
  if(!command||!command.data_list||typeof command.data_list!=='object'||Array.isArray(command.data_list))throw new Error('Exported command data_list required');
  const imported=importCommandRows(command);
  const terminal=profile==='terminal-self-state';
  const rows=imported.rows.map(({id,...row},index)=>{
    const blockers=[];
    if(!row||typeof row!=='object'||Array.isArray(row))return {id,blockers:[{code:'INVALID_ROW'}]};
    const last=index===imported.rows.length-1;
    const state=terminal&&last&&row.Type==='BEAddState';
    const energy=(profile==='damage-and-energy'||terminal)&&row.Type==='BEGainUltiEnergy';
    const damage=row.Type==='BEActiveDamage';
    if(!damage&&!energy&&!state)blockers.push({code:'EFFECT_HANDLER',value:row.Type??null});
    if(terminal&&!last&&row.Type==='BEAddState')blockers.push({code:'TERMINAL_STATE_ORDER'});
    if(terminal&&last&&!state)blockers.push({code:'TERMINAL_STATE_REQUIRED'});
    const expectedTarget=state||energy?'CmdCaster':terminal?targetExpression:'UpperTarget';
    if(row.Target!==expectedTarget)blockers.push({code:'TARGET_BINDING',value:row.Target??null});
    if(state&&Object.hasOwn(row,'Cond'))blockers.push({code:'TERMINAL_STATE_CONDITION'});
    if(Object.hasOwn(row,'VFX'))blockers.push({code:'PRESENTATION_RNG',detail:'Original PlayEffectSfx may call battleEngine.rand for player targets; explicit target context and RNG handling required'});
    // Metadata and presentation fields also need an explicit adapter policy.
    for(const field of Object.keys(row))if(!['Type','Target','Para','Cond'].includes(field))blockers.push({code:'ROW_FIELD',field});
    for(const [field,compile] of [['Para',compileNumericCommand],['Cond',compileCommandCondition]]){
      if(field==='Cond'&&!Object.hasOwn(row,field))continue;
      try{compile(row[field],{allowedFunctions});}catch(error){blockers.push({code:'EXPRESSION',field,detail:error.message});}
    }
    return {id,type:row.Type??null,target:row.Target??null,blockers};
  });
  return {status:'STATIC_COMPATIBILITY_INSPECTION',profile,importMetadata:imported.metadata,normalizedRows:imported.rows,rowCount:rows.length,rows,
    structurallyCompatible:rows.length>0&&rows.every(r=>r.blockers.length===0),executable:false,
    remainingRuntimeChecks:['Numeric bindings and condition outcomes','Damage subtype and ParaPlus restrictions','Resolved offense, target modifiers, immunity and repetition inputs',terminal?'Terminal state definition, layer request, immunity and live property snapshots':'Costs, lifecycle, state changes and trigger listeners','Original row construction and ordering'],
    limitations:['Checks current authored experiment compatibility, not correctness of the game command','No row is dropped; compilation does not evaluate expressions or prove runtime support','Not a gameplay prediction or full skill execution']};
}
