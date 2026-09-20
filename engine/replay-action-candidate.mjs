import {calculateSnapshotActiveDamage} from './battle-property-snapshot-damage.mjs';
import {compileNumericCommand} from './command-expressions.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {resolveScalarSkillField} from './skill-field.mjs';

const build='pc-res144-build51';
const roleType={Awaker:1,Monster:2,Player:3};
const supportedTags=new Set(['Card_Strike','Card_Skill','Ulti_Skill','Card_AttachPost']);
const instructionTags=new Set(['Card_Strike','Card_Skill','Card_Defend','Card_Extend']);

function dense(value,label){
  if(Array.isArray(value)){
    if(!Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)).every(Boolean))throw new Error(`${label} must be dense`);
    return [...value];
  }
  if(!value||typeof value!=='object')throw new Error(`${label} must be a dense Lua list`);
  const keys=Object.keys(value).sort((a,b)=>Number(a)-Number(b));
  if(keys.some((key,i)=>key!==String(i+1)))throw new Error(`${label} must use contiguous one-based keys`);
  return keys.map(key=>value[key]);
}
function finiteMap(value,label){
  if(!value||Array.isArray(value)||Object.entries(value).some(([key,item])=>['__proto__','constructor','prototype'].includes(key)||!Number.isFinite(item)))throw new Error(`${label} must be a complete finite property map`);
  return {...value};
}
function exactOne(values,label){if(values.length!==1)throw new Error(`${label} must resolve exactly once`);return values[0];}

// Retrospective replay bridge. It creates a regression candidate only; it never
// treats post-outcome hit/crit fields as prediction inputs or as blind holdout evidence.
export function buildReplayActionCandidate({index,actionIndex,skills,commands,monsters,critRoll=null}){
  if(!index||index.kind!=='MORIMENS_REPLAY_EVENT_INDEX'||index.build!==build||!Number.isSafeInteger(actionIndex)||actionIndex<0||!skills||!commands||!monsters)throw new Error('Explicit PC144 replay index, action and config catalogs required');
  const action=index.actionSnapshots?.[actionIndex];
  if(!action||action.actionIndex!==actionIndex||action.boundaryStatus!=='COMPLETE')throw new Error('Complete indexed card-use boundary required');
  const playedCard=action.cards?.[String(action.cardUid)];
  if(!playedCard||!Number.isSafeInteger(playedCard.tid)||!Number.isSafeInteger(playedCard.ownerUid)||playedCard.camp!==action.camp)throw new Error('Played card identity, owner and camp required');
  const hitSnapshot=exactOne(action.window?.hitSnapshots??[],'Damage-input hit snapshot');
  if(hitSnapshot.boundaryStatus!=='COMPLETE')throw new Error('Complete reconstructed damage-input boundary required');
  const card=hitSnapshot.cards?.[String(action.cardUid)];
  if(!card||card.tid!==playedCard.tid||card.ownerUid!==playedCard.ownerUid||card.camp!==playedCard.camp)throw new Error('Played card identity changed before the hit');
  const caster=hitSnapshot.roles?.[String(card.ownerUid)];
  if(!caster||caster.roleType!==roleType.Awaker||caster.camp!==card.camp)throw new Error('Played card must resolve to its captured Awakener owner');
  const player=exactOne(Object.values(hitSnapshot.roles).filter(row=>row?.roleType===roleType.Player&&row.camp===card.camp),'Same-camp player');
  const selections=action.window?.selectedTargetCommands??[];
  const selection=exactOne(selections,'Recorded target-selection command');
  const selectedUids=dense(selection.data?.uids,'Selected target UIDs');
  const targetUid=exactOne(selectedUids,'Selected target');
  const target=hitSnapshot.roles?.[String(targetUid)];
  if(!target||target.roleType!==roleType.Monster||target.camp===card.camp||!Number.isSafeInteger(target.tid))throw new Error('Single captured enemy monster target required');
  const monster=monsters[String(target.tid)];
  if(!monster||typeof monster.BattleTag!=='string'||!monster.BattleTag)throw new Error('Captured target MonsterConfig BattleTag required');
  const skill=skills[String(card.tid)];
  if(!skill||skill.ID!==card.tid)throw new Error('Played card skill config required');
  const breakSkillLevel=caster.breakSkillLevel??0,potencyLevel=caster.potencyLevel??0;
  for(const value of [breakSkillLevel,potencyLevel])if(!Number.isSafeInteger(value)||value<0)throw new Error('Captured nonnegative Awakener progression required');
  const routeInput={skill,isAwaker:true,breakSkillLevel,potencyLevel,evaluate:expression=>{throw new Error(`Conditional skill routing is unsupported: ${expression}`);}};
  const selectedCommand=resolveScalarSkillField({...routeInput,field:'CmdList'});
  if(!Number.isSafeInteger(selectedCommand.value)||!commands[String(selectedCommand.value)])throw new Error('Resolved exported command required');
  const imported=importCommandRows(commands[String(selectedCommand.value)]),damageRows=imported.rows.filter(row=>row.Type==='BEActiveDamage');
  if(damageRows.length!==1)throw new Error('Exactly one ordinary Active-damage row required');
  const damageIndex=imported.rows.findIndex(row=>row===damageRows[0]);
  if(imported.rows.some((row,i)=>row.Type!=='BEActiveDamage'&&(row.Type!=='BEGainUltiEnergy'||i<damageIndex)))throw new Error('Only post-damage energy rows may accompany the supported hit');
  const row=damageRows[0];
  if(row.Target!=='UpperTarget'||Object.hasOwn(row,'Cond')||Object.keys(row).some(key=>!['id','Type','Target','Para'].includes(key)))throw new Error('Unconditional ordinary damage to UpperTarget required');
  const args=dense(card.cardArgs,'Captured card arguments');
  if(args.some(value=>!Number.isFinite(value)))throw new Error('Captured card arguments must be finite');
  const variables=Object.fromEntries(args.map((value,i)=>[`Arg${i+1}`,value]));
  let plusValues=[];
  if(Object.hasOwn(skill,'ParaPlus')){
    const plus=resolveScalarSkillField({...routeInput,field:'ParaPlus'});
    if(plus.value!==null){
      plusValues=compileNumericCommand(plus.value)((name)=>{
        if(Object.hasOwn(variables,name))return variables[name];
        const [owner,property]=name.split('.');
        const maps={CmdCaster:caster.properties,PlayerRole:player.properties,UpperTarget:target.properties};
        return maps[owner]?.[property];
      }).values;
      plusValues.forEach((value,i)=>variables[`ParaPlus${i+1}`]=value);
    }
  }
  const parameters=compileNumericCommand(row.Para)(name=>variables[name]).values;
  if(parameters.length>4||!Number.isFinite(parameters[0])||Math.ceil(parameters[1]??1)!==1||(parameters[2]??0)!==0)throw new Error('One ordinary zero-subtype Active hit required');
  const skillArgsPlus=parameters.length===4?parameters[3]:0;
  if(!Number.isFinite(skillArgsPlus))throw new Error('Resolved finite ParaPlus value required');
  const tags=dense(skill.Type,'Skill type tags');
  if(!tags.length||tags.some(tag=>!supportedTags.has(tag))||new Set(tags).size!==tags.length)throw new Error('Unique supported skill tags required');
  const targetStateIds=[...new Set((hitSnapshot.activeStates??[]).filter(state=>state?.ownerUid===targetUid&&!state.isDeleted).map(state=>state.stateId))];
  if(targetStateIds.some(id=>!Number.isSafeInteger(id)||id<=0))throw new Error('Captured positive target state IDs required');
  const hits=action.window.hits??[];
  const hit=exactOne(hits,'Action-window hit');
  if(hit.recordIndex!==hitSnapshot.recordIndex||hit.frameIndex!==hitSnapshot.frameIndex)throw new Error('Hit snapshot does not match the action-window hit');
  if(hit.data?.roleUid!==targetUid)throw new Error('Recorded hit target must match selected target');
  const observed=hit.data.beHitConfig??{};
  if(observed.castRoleUid!==undefined&&observed.castRoleUid!==caster.uid)throw new Error('Recorded hit caster does not match card owner');
  if(observed.skillConfigId!==undefined&&observed.skillConfigId!==card.tid)throw new Error('Recorded hit skill does not match played card');
  const scenario={schemaVersion:1,kind:'morimens-battle-property-snapshot-damage',build,snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',baseValue:parameters[0],skillArgsPlus,tags,
    casterProperties:finiteMap(caster.properties,'Caster properties'),playerProperties:finiteMap(player.properties,'Player properties'),targetProperties:finiteMap(target.properties,'Target properties'),cardProperties:finiteMap(card.properties,'Card properties'),
    cardContext:{present:true,instructionCard:tags.some(tag=>instructionTags.has(tag)),stateTriggerAdd:false},targetContext:{critRoll,targetBattleTag:monster.BattleTag,targetStateIds}};
  let calculation=null,calculationBlocker=null;
  try{calculation=calculateSnapshotActiveDamage(scenario);}catch(error){if(error.message==='RNG-dependent critical outcome requires a captured pre-outcome roll')calculationBlocker=error.message;else throw error;}
  const observedCastDamage=Number.isFinite(observed.castDamage)?observed.castDamage:null;
  const comparison=calculation&&observedCastDamage!==null?{metric:'preHitDamage-vs-beHitConfig.castDamage',predicted:calculation.preHitDamage,observed:observedCastDamage,difference:calculation.preHitDamage-observedCastDamage}:null;
  return {schemaVersion:1,kind:'MORIMENS_REPLAY_ACTION_REGRESSION_CANDIDATE',build,status:calculation?'CALCULATED_REGRESSION_CANDIDATE':'PREOUTCOME_INPUT_REQUIRED',actionIndex,identities:{cardUid:card.uid,skillId:card.tid,casterUid:caster.uid,playerUid:player.uid,targetUid,commandId:selectedCommand.value,rowId:row.id},routing:{selectedCommand,importMetadata:imported.metadata,parameters,plusValues,tags},scenario,calculation,calculationBlocker,
    damageInputReconstruction:JSON.parse(JSON.stringify(hitSnapshot.reconstruction)),observedHit:JSON.parse(JSON.stringify(hit)),comparison,unresolvedDependencies:['Retrospective replay evidence cannot become a blind holdout','Action window and identity still require human review for triggered or overlapping actions','Observed hit and post-outcome critical fields are excluded from scenario construction','Target HP and block are reconstructed from explicit BeHit fields because the render record follows their mutations','No connected original card-use, trigger graph, hit resolution or independent gameplay validation']};
}
