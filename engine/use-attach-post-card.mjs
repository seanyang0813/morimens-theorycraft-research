import {snapshot} from './experiments.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const table=identity=>({type:'table',identity});
const number=value=>({type:'number',value});
const nil=()=>({type:'nil',value:null});
const command=value=>value===null?nil():table(value);
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);

const effect=(effectType,{castRoleUid=null,cardUid=null,camp=null,targetType=null,cancelable=null,skipPhase=null,cmdServer=null,clientTargetCount=null}={})=>({
  stage:'CreateEffect',
  request:{effectType,castRoleUid,cardUid,camp,targetType,cancelable,skipPhase,cmdServer:command(cmdServer),clientTargetCount}
});

// This is the original UseAttachPostCard construction boundary. Card factory,
// manager and effect execution remain outside this immutable request plan.
export function planUseAttachPostCard(value){
  const input=snapshot(value),keys=['schemaVersion','kind','build','skillId','skillLevel','camp','ownerUid','cardUid','targetType','hasPre','isTriggerBST'];
  if(!exact(input,keys)||input.schemaVersion!==1||input.kind!=='morimens-use-attach-post-card'||!supportedBuilds.has(input.build))throw new Error('Explicit supported-build UseAttachPostCard input required');
  for(const key of ['skillId','skillLevel','camp','ownerUid','cardUid','targetType'])if(!Number.isSafeInteger(input[key]))throw new Error(`${key} must be an explicit safe integer`);
  if(input.skillId<=0||input.skillLevel<=0||input.cardUid<=0||input.ownerUid<=0)throw new Error('Positive skill, level, card and owner identifiers required');
  if(typeof input.hasPre!=='boolean'||typeof input.isTriggerBST!=='boolean')throw new Error('Explicit pre-command and trigger flags required');
  const common={castRoleUid:input.ownerUid,cardUid:input.cardUid};
  const events=[
    {stage:'CreateCardByInfo',arguments:{tid:input.skillId,level:input.skillLevel,deck:'NoneDeck',camp:input.camp,ownerIsInput:true}},
    {stage:'OnAddNewCard',arguments:[table('other'),{type:'string',value:'NoneDeck'},{type:'boolean',value:true},number(input.camp)]},
    {stage:'SetCurUseCard',arguments:[table('card'),number(input.ownerUid)]},
    effect('BEGenerateTargets',{castRoleUid:input.ownerUid,camp:input.camp,targetType:input.targetType,cancelable:true,cmdServer:'mainCommand',clientTargetCount:0}),
    effect('BEBeforeUseCard',{...common,cmdServer:'mainCommand'}),
  ];
  if(input.hasPre)events.push(effect('BECreateSkillPhase',{...common,skipPhase:true,cmdServer:'preCommand'}));
  events.push(effect('BECreateSkillPhase',{...common,cmdServer:'mainCommand'}));
  events.push(effect('BEAfterUseCard',{...common,camp:input.camp}));
  return {schemaVersion:1,status:'SUPPORTED_BY_RUNTIME_TEST',build:input.build,completed:true,returned:true,events,
    mainCommandAttachPostParam:{binding:table('attachPostParam'),isTriggerBST:input.isTriggerBST},
    unresolvedDependencies:['Temporary-card constructor and initialization internals are adapters','Effect requests are constructed but not executed','No callbacks, gameplay observation or independent holdout validation']};
}
