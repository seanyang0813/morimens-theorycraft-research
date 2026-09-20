import {compileNumericCommand,compileCommandCondition} from './command-expressions.mjs';

// Numeric ordinary-row composition. Effect implementations and targets are explicit adapters.
export function enqueueCommandRows({scheduler,rows,allowedFunctions=[],readVariable,callFunction,resolveTargets,handlers,canContinue}){
  if(!scheduler||typeof scheduler.enqueue!=='function'||!Array.isArray(rows)||rows.length===0||typeof resolveTargets!=='function'||typeof canContinue!=='function'||!handlers)throw new Error('Explicit command rows, scheduler and execution adapters required');
  const ids=new Set();
  const compiled=rows.map(row=>{
    if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||typeof row.Type!=='string'||typeof row.Target!=='string'||Object.keys(row).some(key=>!['id','Type','Target','Para','Cond'].includes(key)))throw new Error('Unique row identities and supported row fields required');
    ids.add(row.id);
    if(!Object.hasOwn(handlers,row.Type)||typeof handlers[row.Type]!=='function')throw new Error(`Unsupported effect handler ${row.Type}`);
    return {row:{...row},handler:handlers[row.Type],parameters:compileNumericCommand(row.Para,{allowedFunctions}),condition:Object.hasOwn(row,'Cond')?compileCommandCondition(row.Cond,{allowedFunctions}):null};
  });
  const report={status:'EXPERIMENTAL',finalDamage:null,completed:false,stop:null,trace:[],
    unresolvedDependencies:['Explicit target resolution, effect handlers and continuation decisions','No original command construction, delays, interruption, yielding or full lifecycle','Component composition, not connected original command execution or gameplay validation']};
  let index=0;
  function advance(){
    if(index===compiled.length){report.completed=true;return;}
    const item=compiled[index++],{row}=item;
    const continuing=canContinue();if(typeof continuing!=='boolean')throw new Error('Explicit boolean continuation decision required');
    if(!continuing){report.stop={beforeRowId:row.id,reason:'Continuation requires lifecycle resolution'};return;}
    const condition=item.condition?.(readVariable,callFunction)??null;
    const trace={rowId:row.id,type:row.Type,condition,executed:false,parameterEvaluations:[]};report.trace.push(trace);
    if(condition&&!condition.passed){scheduler.enqueue(advance);return;}
    scheduler.enqueue(()=>{
      const allowed=canContinue();if(typeof allowed!=='boolean')throw new Error('Explicit boolean continuation decision required');
      if(!allowed){report.stop={beforeRowId:row.id,reason:'Continuation requires lifecycle resolution'};return;}
      const targets=resolveTargets(row.Target,row.id);if(!Array.isArray(targets))throw new Error('Explicit target array required');
      const readParameters=()=>{const result=item.parameters(readVariable,callFunction);trace.parameterEvaluations.push(result);return result.values;};
      const parameters=readParameters();trace.executed=true;
      trace.result=item.handler({rowId:row.id,type:row.Type,targets,parameters,readParameters,scheduler});
    });
    // Ordinary descendants finish before evaluating the following row.
    scheduler.enqueue(()=>{if(!report.stop)advance();});
  }
  scheduler.enqueue(advance);return report;
}
