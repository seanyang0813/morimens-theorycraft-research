import {snapshot} from './experiments.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {runActiveCommandExperiment} from './active-command-experiment.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const supportedFields=new Set(['id','Type','Target','Para','Cond','BaseSortID','VFX','DelayTime']);

// Execute only the leading ordinary Active-damage rows. Stop at the first row
// requiring another handler so command order is never silently changed.
export function runCommandDamagePrefix(value){
  const input=snapshot(value),keys=['schemaVersion','kind','build','command','targetBinding','variables','offense','targetModifiers','targetState','repeatModifiers','immune','presentationPolicy'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-command-damage-prefix'||input.build!=='pc-res144-build51'||input.presentationPolicy!=='record-only')throw new Error('Explicit resource-144 command damage-prefix input required');
  if(!exact(input.targetBinding,['expression','resolution'])||input.targetBinding.resolution!=='supplied-single-target'||typeof input.targetBinding.expression!=='string'||!input.targetBinding.expression)throw new Error('Explicit supplied target binding required');
  const imported=importCommandRows(input.command),prefix=[],presentation=[],sortIds=new Map(imported.metadata.map(row=>[row.rowId,row.BaseSortID]));
  let stop=null;
  for(const row of imported.rows){
    if(Object.keys(row).some(field=>!supportedFields.has(field))){stop={beforeRowId:row.id,reason:'Unsupported row field'};break;}
    if(row.Type!=='BEActiveDamage'){stop={beforeRowId:row.id,type:row.Type??null,reason:'Unsupported effect handler'};break;}
    if(row.Target!==input.targetBinding.expression){stop={beforeRowId:row.id,type:row.Type,target:row.Target??null,reason:'Target binding mismatch'};break;}
    const {BaseSortID,VFX,DelayTime,...behavior}=row;
    presentation.push({rowId:row.id,baseSortId:BaseSortID??sortIds.get(row.id)??null,vfx:VFX??null,delayTime:DelayTime??null});
    prefix.push({...behavior,Target:'UpperTarget'});
  }
  const execution=prefix.length?runActiveCommandExperiment({schemaVersion:1,kind:'morimens-active-command-experiment',build:input.build,interveningEffects:'assumed-absent',rows:prefix,variables:input.variables,offense:input.offense,targetModifiers:input.targetModifiers,targetState:input.targetState,repeatModifiers:input.repeatModifiers,immune:input.immune}):null;
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,completed:stop===null&&execution?.completed===true,stop:stop??execution?.stop??null,importMetadata:imported.metadata,totalRows:imported.rows.length,executedPrefixRows:prefix.length,presentation,execution,targetAfter:execution?.targetAfter??{...input.targetState},modeledHpLost:execution?.modeledHpLost??0,finalDamage:null,
    unresolvedDependencies:[...(execution?.unresolvedDependencies??[]),'Stops at the first unsupported row without executing or skipping it','Presentation metadata is recorded but not executed','Supplied single-target binding replaces the exported selector','No state/resource handlers, callbacks, death handling, gameplay or independent holdout validation']};
}
