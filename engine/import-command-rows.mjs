import {snapshot} from './experiments.mjs';
// Preserve contiguous Lua ipairs order; keep export ordering metadata separately.
export function importCommandRows(command){
  if(!command?.data_list||typeof command.data_list!=='object')throw new Error('Exported command data_list required');
  const replayArray=Array.isArray(command.data_list);
  const entries=replayArray?command.data_list.map((row,index)=>[String(index+1),row]):Object.entries(command.data_list).sort(([a],[b])=>Number(a)-Number(b));
  if(entries.some(([key],i)=>key!==String(i+1)))throw new Error('Contiguous one-based command rows required; sparse Lua lists need explicit handling');
  const metadata=[];
  const rows=entries.map(([id,row])=>{
    if(!row||typeof row!=='object'||Array.isArray(row)||Object.hasOwn(row,'id'))throw new Error('Valid exported row without synthetic identity required');
    const {BaseSortID,...behavior}=row;
    if(Object.hasOwn(row,'BaseSortID')){
      if(!Number.isFinite(BaseSortID))throw new Error('Numeric BaseSortID metadata required');
      metadata.push({rowId:id,BaseSortID});
    }
    return {id,...snapshot(behavior)};
  });
  return {rows,metadata,ordering:'contiguous-one-based-ipairs',sourceShape:replayArray?'decoded-replay-array':'exported-one-based-object',scope:'Export/replay adapter only; no effect fields except retained BaseSortID metadata are removed'};
}
