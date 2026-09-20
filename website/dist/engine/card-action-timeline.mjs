import {snapshot} from './experiments.mjs';
import {runCardResourceTimeline} from './card-resource-timeline.mjs';
import {resolvePveCardResources} from './card-use-resources.mjs';
import {runResearchTimeline} from './research-timeline.mjs';
import {runActiveCommandExperiment} from './active-command-experiment.mjs';

// Composes resource checks with supplied hits or supported numeric active commands.
export function runCardActionTimeline(value){
  const input=snapshot(value);
  const keys=['schemaVersion','kind','build','interveningEffects','initialEnergy','target','steps','oldEmbersLayers'];
  if(!input||input.kind!=='morimens-card-action-timeline'||Object.keys(input).some(k=>!keys.includes(k)))throw new Error('Explicit card action timeline required');
  const reactive=input.interveningEffects==='old-embers-only-assumed';
  if(!reactive&&input.interveningEffects!=='assumed-absent')throw new Error('Explicit supported intervening effects required');
  if(!reactive&&Object.hasOwn(input,'oldEmbersLayers'))throw new Error('Old Embers layers require the Old Embers scope');
  if(!Array.isArray(input.steps))throw new Error('Action steps required');
  const resourceSteps=input.steps.map(step=>{
    if(!step||Object.keys(step).some(k=>!['id','cardInstanceId','costInput','conditions','hits','command'].includes(k)))throw new Error('Unsupported action fields');
    if(Object.hasOwn(step,'hits')===Object.hasOwn(step,'command'))throw new Error('Each action requires exactly one of hits or command');
    if(Object.hasOwn(step,'command')&&(reactive||!step.command||Object.keys(step.command).some(key=>!['rows','variables','offense','targetModifiers','repeatModifiers','immune'].includes(key))))throw new Error('Command action requires no intervening effects and cannot reset shared state');
    const {hits,command,...resource}=step;return resource;
  });
  runCardResourceTimeline({schemaVersion:input.schemaVersion,kind:'morimens-card-resource-timeline',build:input.build,interveningEffects:'assumed-absent',initialEnergy:input.initialEnergy,steps:resourceSteps});
  const hitInput=(step,target,layers)=>({schemaVersion:input.schemaVersion,build:input.build,interveningEffects:input.interveningEffects,target,steps:step.hits,...(reactive?{oldEmbersLayers:layers}:{})});
  const execute=(step,target,layers)=>Object.hasOwn(step,'command')?
    runActiveCommandExperiment({...step.command,schemaVersion:input.schemaVersion,kind:'morimens-active-command-experiment',build:input.build,interveningEffects:input.interveningEffects,targetState:target}):
    runResearchTimeline(hitInput(step,target,layers));
  const hitIds=new Set();
  for(const step of input.steps){
    execute(step,input.target,input.oldEmbersLayers);
    for(const hit of step.hits??[]){if(hitIds.has(hit.id))throw new Error('Hit IDs must be unique across actions');hitIds.add(hit.id);}
  }
  let energy=input.initialEnergy,target={...input.target},layers=input.oldEmbersLayers,stop=null,acceptedActions=0;
  const trace=[],dependencies=new Set();
  for(const step of input.steps){
    if(target.hp<=0){stop={beforeActionId:step.id,phase:'before-payment',reason:'Death handling required'};break;}
    const before={energy,target:{...target},...(reactive?{oldEmbersLayers:layers}:{})};
    const resources=resolvePveCardResources({costInput:{...step.costInput,energy},conditions:step.conditions});
    resources.unresolvedDependencies.forEach(x=>dependencies.add(x));
    energy=resources.energyAfter;
    const row={actionId:step.id,cardInstanceId:step.cardInstanceId,before,resources,hits:null,command:null};trace.push(row);
    if(!resources.check.allowed){row.after={...before};stop={actionId:step.id,phase:'play-check',gate:resources.check.gate,reasonCode:resources.check.reasonCode};break;}
    acceptedActions++;
    const hits=execute(step,target,layers);if(Object.hasOwn(step,'command'))row.command=hits;else row.hits=hits;
    hits.unresolvedDependencies.forEach(x=>dependencies.add(x));
    target={...hits.targetAfter};if(reactive)layers=hits.oldEmbersLayersAfter;
    row.after={energy,target:{...target},...(reactive?{oldEmbersLayers:layers}:{})};
    if(!hits.completed){stop={actionId:step.id,phase:'effects',detail:hits.stop};break;}
  }
  return {schemaVersion:1,status:'EXPERIMENTAL',build:input.build,finalDamage:null,
    scope:'Supplied card costs/conditions with resolved hits or numeric active commands; component composition, not original card-command execution',
    completed:stop===null,stop,acceptedActions,unattemptedActions:input.steps.length-trace.length,
    initialEnergy:input.initialEnergy,energyAfter:energy,initialTarget:{...input.target},targetAfter:target,
    ...(reactive?{oldEmbersLayersAfter:layers}:{}),modeledHpLost:input.target.hp-target.hp,trace,
    unresolvedDependencies:[...dependencies,'Resolved modifiers and hit/command inputs are supplied; no automatic skill lookup or cost-dependent damage binding','No refunds, draws, retention, changing card conditions or turn transitions; distinct supplied card instances only','Combined payment-to-effects ordering has not been checked against a connected original execution or independent gameplay']};
}
