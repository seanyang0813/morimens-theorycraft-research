import {calculateSnapshotActiveDamage} from './battle-property-snapshot-damage.mjs';
import {compileNumericCommand,compileCommandCondition} from './command-expressions.mjs';
import {importCommandRows} from './import-command-rows.mjs';
import {resolveScalarSkillField} from './skill-field.mjs';
import {getLiveStateLayer} from './live-state-lookup.mjs';

const protocolBuild='pc-res144-build51';
const supportedCombatBuilds=new Set(['pc-res144-build51','pc-res150-build51']);
const roleType={Awaker:1,Monster:2,Player:3};
const supportedTags=new Set(['Card_Strike','Card_Skill','Ulti_Skill','Card_AttachPost']);
const instructionTags=new Set(['Card_Strike','Card_Skill','Card_Defend','Card_Extend']);
const presentationTargets=new Set(['CmdTarget','EnemyFieldCenter']);
const scalarEnemySelectors=new Set(['MaxHpEnemy','MinHpEnemy','MaxHpAndBlockEnemy','MinHpAndBlockEnemy']);
const supportedTargets=new Set(['UpperTarget','FrontEnemy','RandomEnemy','AllEnemy',...scalarEnemySelectors,'TempMainTarget','AllEnemyWithoutMainTarget']);

function dense(value,label){
  if(Array.isArray(value)){
    if(!Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)).every(Boolean))throw new Error(`${label} must be dense`);
    return [...value];
  }
  if(!value||typeof value!=='object')throw new Error(`${label} must be a dense Lua list`);
  const keys=Object.keys(value).filter(key=>key!=='n').sort((a,b)=>Number(a)-Number(b));
  if(keys.some((key,i)=>key!==String(i+1)))throw new Error(`${label} must use contiguous one-based keys`);
  if(Object.hasOwn(value,'n')&&(!Number.isSafeInteger(value.n)||value.n!==keys.length+1))throw new Error(`${label}.n must be the one-past-end Lua cursor`);
  return keys.map(key=>value[key]);
}
function finiteMap(value,label){
  if(!value||Array.isArray(value)||Object.entries(value).some(([key,item])=>['__proto__','constructor','prototype'].includes(key)||!Number.isFinite(item)))throw new Error(`${label} must be a complete finite property map`);
  return {...value};
}
function exactOne(values,label){if(values.length!==1)throw new Error(`${label} must resolve exactly once`);return values[0];}
function chronological(a,b){return (a.recordIndex-b.recordIndex)||(a.frameIndex-b.frameIndex);}
function livingEnemies(snapshot,casterCamp,{includeBlock=false}={}){
  const enemies=Object.values(snapshot.roles??{}).filter(role=>role?.roleType===roleType.Monster&&role.camp!==casterCamp&&Number.isFinite(role.properties?.hp)&&role.properties.hp>0);
  if(!enemies.length||enemies.some(role=>includeBlock&&!Number.isFinite(role.properties?.block)))throw new Error('Complete living enemy properties required for selector validation');
  return enemies;
}
function resolveScalarEnemySelector(snapshot,casterCamp,selector){
  if(!scalarEnemySelectors.has(selector))throw new Error(`Unsupported scalar enemy selector ${selector}`);
  const includeBlock=selector.includes('AndBlock'),maximum=selector.startsWith('Max'),enemies=livingEnemies(snapshot,casterCamp,{includeBlock});
  const value=role=>role.properties.hp+(includeBlock?role.properties.block:0);
  const selected=enemies.reduce((best,role)=>maximum?(value(best)<value(role)?role:best):(value(best)>value(role)?role:best));
  return {selector,candidateOrder:enemies.map(role=>({uid:role.uid,value:value(role)})),selectedUid:selected.uid,tiePolicy:'first role in captured registry order'};
}

// Retrospective replay bridge. It creates a regression candidate only; it never
// treats post-outcome hit/crit fields as prediction inputs or as blind holdout evidence.
export function buildReplayActionCandidate({index,actionIndex,hitIndex=null,skills,commands,monsters,awakeners,critRoll=null,preOutcome=false,combatBuild=protocolBuild}){
  if(!index||index.kind!=='MORIMENS_REPLAY_EVENT_INDEX'||index.build!==protocolBuild||!supportedCombatBuilds.has(combatBuild)||!Number.isSafeInteger(actionIndex)||actionIndex<0||!skills||!commands||!monsters||!awakeners)throw new Error('Explicit supported replay protocol index, combat build, action and config catalogs required');
  const action=index.actionSnapshots?.[actionIndex];
  if(!action||action.actionIndex!==actionIndex||action.boundaryStatus!=='COMPLETE')throw new Error('Complete indexed card-use boundary required');
  const playedCard=action.cards?.[String(action.cardUid)];
  if(!playedCard||!Number.isSafeInteger(playedCard.tid)||!Number.isSafeInteger(playedCard.ownerUid)||playedCard.camp!==action.camp)throw new Error('Played card identity, owner and camp required');
  const hitSnapshots=action.window?.hitSnapshots??[];
  if(hitIndex!==null&&(!Number.isSafeInteger(hitIndex)||hitIndex<0))throw new Error('Hit index must be a nonnegative integer');
  const hitSnapshot=hitIndex===null?exactOne(hitSnapshots,'Damage-input hit snapshot'):exactOne(hitSnapshots.filter(item=>item.hitIndex===hitIndex),'Requested damage-input hit snapshot');
  if(hitSnapshot.boundaryStatus!=='COMPLETE')throw new Error('Complete reconstructed damage-input boundary required');
  const card=hitSnapshot.cards?.[String(action.cardUid)];
  if(!card||card.tid!==playedCard.tid||card.ownerUid!==playedCard.ownerUid||card.camp!==playedCard.camp)throw new Error('Played card identity changed before the hit');
  const caster=hitSnapshot.roles?.[String(card.ownerUid)];
  if(!caster||caster.roleType!==roleType.Awaker||caster.camp!==card.camp)throw new Error('Played card must resolve to its captured Awakener owner');
  const player=exactOne(Object.values(hitSnapshot.roles).filter(row=>row?.roleType===roleType.Player&&row.camp===card.camp),'Same-camp player');
  const hits=action.window.hits??[],hit=exactOne(hits.filter(item=>item.recordIndex===hitSnapshot.recordIndex&&item.frameIndex===hitSnapshot.frameIndex),'Hit matching the damage-input snapshot');
  if(hit.recordIndex!==hitSnapshot.recordIndex||hit.frameIndex!==hitSnapshot.frameIndex)throw new Error('Hit snapshot does not match the action-window hit');
  const targetUid=hit.data?.roleUid;
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
  if(!damageRows.length)throw new Error('At least one ordinary Active row required');
  const competingDamageRows=imported.rows.filter(row=>row.Type!=='BEActiveDamage'&&/Damage/.test(row.Type));
  if(damageRows.some(row=>Object.keys(row).some(key=>!['id','Type','Target','Para','Cond','VFX','DelayTime','PerformTarget'].includes(key))||(Object.hasOwn(row,'PerformTarget')&&!presentationTargets.has(row.PerformTarget))))throw new Error('Unsupported Active-damage row field');
  const args=dense(card.cardArgs,'Captured card arguments');
  if(args.some(value=>!Number.isFinite(value)))throw new Error('Captured card arguments must be finite');
  const variables=Object.fromEntries(args.map((value,i)=>[`Arg${i+1}`,value]));
  const stateRegistry=new Map();
  for(const state of hitSnapshot.activeStates??[]){
    if(!Number.isSafeInteger(state?.ownerUid)||!Number.isSafeInteger(state?.stateId)||!Number.isFinite(state?.layer))throw new Error('Complete live state owner, ID and layer required');
    const list=stateRegistry.get(state.ownerUid)??[];list.push({stateId:state.stateId,layer:state.layer,isDeleted:Boolean(state.isDeleted)});stateRegistry.set(state.ownerUid,list);
  }
  const functionOwners={'CmdCaster.GetStateLayer':caster.uid,'PlayerRole.GetStateLayer':player.uid,'UpperTarget.GetStateLayer':target.uid,'OwnerCard.GetStateLayer':card.uid,'CurCard.GetStateLayer':card.uid};
  const prop=name=>Number.isFinite(caster.properties?.[name])?caster.properties[name]:0;
  const maxUltiEnergy=Math.floor((prop('ulti_energy_max')*(1+prop('ulti_energy_cost_per')/100)+prop('ulti_energy_cost_flat'))*(1+prop('ulti_energy_max_per')/100)+0.5);
  const doubleEnergy=caster.doubleUltiEnergy!==undefined&&caster.doubleUltiEnergy!==null&&caster.doubleUltiEnergy!==false;
  const superUltimate=prop('ulti_skill_level_up')>0||(doubleEnergy&&prop('ulti_energy')>=maxUltiEnergy);
  const awakerSchoolCounts={};
  for(const role of Object.values(hitSnapshot.roles)){
    if(role?.roleType!==roleType.Awaker)continue;
    const config=awakeners[String(role.tid)];
    if(!config||config.ID!==role.tid||!Number.isSafeInteger(config.School))throw new Error('Captured Awakener school configuration required');
    awakerSchoolCounts[config.School]=(awakerSchoolCounts[config.School]??0)+1;
  }
  const allowedFunctions=[...Object.keys(functionOwners),'CmdCaster.GetPotencyLevel','CmdCaster.GetBreakSkillLevel','GetAwakerCountBySchool','IsSuperUtlSkill','math.ceil','math.floor'];
  const callFunction=(name,values)=>{
    if(Object.hasOwn(functionOwners,name)){
      if(values.length!==1||!Number.isSafeInteger(values[0]))throw new Error(`${name} requires one integer state ID`);
      return getLiveStateLayer({registry:stateRegistry,ownerUid:functionOwners[name],stateId:values[0]});
    }
    if(name==='CmdCaster.GetPotencyLevel'){if(values.length)throw new Error('GetPotencyLevel takes no arguments');return potencyLevel;}
    if(name==='CmdCaster.GetBreakSkillLevel'){if(values.length)throw new Error('GetBreakSkillLevel takes no arguments');return breakSkillLevel;}
    if(name==='GetAwakerCountBySchool'){if(values.length!==1||!Number.isSafeInteger(values[0]))throw new Error('GetAwakerCountBySchool takes one integer school ID');return awakerSchoolCounts[values[0]]??0;}
    if(name==='IsSuperUtlSkill'){if(values.length)throw new Error('IsSuperUtlSkill takes no arguments');return superUltimate?1:0;}
    if(name==='math.ceil'||name==='math.floor'){if(values.length!==1)throw new Error(`${name} requires one argument`);return name==='math.ceil'?Math.ceil(values[0]):Math.floor(values[0]);}
    throw new Error(`Unsupported replay expression function ${name}`);
  };
  const readVariable=name=>{
    if(Object.hasOwn(variables,name))return variables[name];
    const separator=name.indexOf('.');
    if(separator>0){
      const owner=name.slice(0,separator),property=name.slice(separator+1),maps={CmdCaster:caster.properties,PlayerRole:player.properties,UpperTarget:target.properties,OwnerCard:card.properties,CurCard:card.properties};
      if(Object.hasOwn(maps,owner))return maps[owner]?.[property];
    }
    return undefined;
  };
  let plusValues=[];
  if(Object.hasOwn(skill,'ParaPlus')){
    const plus=resolveScalarSkillField({...routeInput,field:'ParaPlus'});
    if(plus.value!==null){
      plusValues=compileNumericCommand(plus.value,{allowedFunctions,allowLogicalNumeric:true})(readVariable,callFunction).values;
      plusValues.forEach((value,i)=>variables[`ParaPlus${i+1}`]=value);
    }
  }
  const competingDamageSelection=competingDamageRows.map(row=>{
    if(!Object.hasOwn(row,'Cond'))throw new Error('Unconditional competing damage effect is unsupported');
    return {row,condition:compileCommandCondition(row.Cond,{allowedFunctions})(readVariable,callFunction)};
  });
  if(competingDamageSelection.some(item=>item.condition.passed))throw new Error('Eligible competing damage effect is unsupported');
  const tempMainRows=imported.rows.filter(row=>row.Type==='BESetTempMainTarget');
  const usesTempMainTarget=damageRows.some(row=>['TempMainTarget','AllEnemyWithoutMainTarget'].includes(row.Target));
  let tempMainTargetValidation=null;
  if(usesTempMainTarget){
    const setup=exactOne(tempMainRows,'Stored main-target setup row');
    if(!scalarEnemySelectors.has(setup.Target)||Object.keys(setup).some(key=>!['id','Type','Target'].includes(key)))throw new Error('Supported stored main-target setup required');
    const setupPosition=imported.rows.findIndex(item=>item.id===setup.id);
    if(damageRows.some(item=>imported.rows.findIndex(candidate=>candidate.id===item.id)<=setupPosition))throw new Error('Stored main target must be established before ordinary damage rows');
    const directPairs=hitSnapshots.map(snapshot=>({snapshot,hit:exactOne(hits.filter(item=>item.recordIndex===snapshot.recordIndex&&item.frameIndex===snapshot.frameIndex),'Hit matching an action snapshot')})).filter(pair=>pair.hit.data?.beHitConfig?.castRoleUid===caster.uid&&pair.hit.data?.beHitConfig?.skillConfigId===card.tid).sort((a,b)=>chronological(a.snapshot,b.snapshot));
    if(!directPairs.length||directPairs[0].snapshot!==[...hitSnapshots].sort(chronological)[0])throw new Error('Stored main-target selection requires the first action-window hit to have explicit played-skill identity');
    if(directPairs.some(pair=>pair.snapshot.boundaryStatus!=='COMPLETE'))throw new Error('Complete played-skill hit boundaries required for stored main-target selection');
    const selectorValidation=resolveScalarEnemySelector(directPairs[0].snapshot,caster.camp,setup.Target);
    const selectedAtSetup=selectorValidation.candidateOrder.some(item=>item.uid===targetUid);
    if(!selectedAtSetup)throw new Error('Recorded hit target was not a living enemy at stored main-target selection');
    tempMainTargetValidation={setupRowId:setup.id,setupSelector:setup.Target,selectionSnapshotHitIndex:directPairs[0].snapshot.hitIndex,...selectorValidation};
  }else if(tempMainRows.length)throw new Error('Unused stored main-target setup is unsupported');
  const targetMatches=row=>{
    if(row.Target==='TempMainTarget')return targetUid===tempMainTargetValidation?.selectedUid;
    if(row.Target==='AllEnemyWithoutMainTarget')return targetUid!==tempMainTargetValidation?.selectedUid;
    return true;
  };
  const rowSelection=damageRows.map(row=>({row,condition:Object.hasOwn(row,'Cond')?compileCommandCondition(row.Cond,{allowedFunctions})(readVariable,callFunction):null,targetMatched:targetMatches(row)}));
  const eligibleRows=rowSelection.filter(item=>(item.condition===null||item.condition.passed)&&item.targetMatched);
  const selected=exactOne(eligibleRows,'Eligible ordinary Active-damage row'),row=selected.row;
  if(!supportedTargets.has(row.Target))throw new Error('Supported replay target selector required');
  const selections=action.window?.selectedTargetCommands??[];
  if(selections.length>1)throw new Error('At most one recorded target-selection command is supported');
  let targetBindingSource='recorded-hit';
  if(selections.length){
    const selectedUids=dense(selections[0].data?.uids,'Selected target UIDs');
    if(selectedUids.length!==1||selectedUids[0]!==targetUid)throw new Error('Recorded selected target must match the hit target');
    targetBindingSource='selected-target-command-and-recorded-hit';
  }else if(row.Target==='UpperTarget')throw new Error('UpperTarget requires a recorded target-selection command');
  let selectorValidation=null;
  if(scalarEnemySelectors.has(row.Target)){
    selectorValidation=resolveScalarEnemySelector(hitSnapshot,caster.camp,row.Target);
    if(selectorValidation.selectedUid!==targetUid)throw new Error('Recorded hit target does not match reconstructed HP selector');
    targetBindingSource='reconstructed-selector-and-recorded-hit';
  }else if(usesTempMainTarget){
    selectorValidation=tempMainTargetValidation;targetBindingSource='reconstructed-stored-main-target-and-recorded-hit';
  }
  const parameters=compileNumericCommand(row.Para,{allowedFunctions,allowLogicalNumeric:true})(readVariable,callFunction).values;
  const repetitionCount=Math.ceil(parameters[1]??1);
  if(parameters.length>4||!Number.isFinite(parameters[0])||!Number.isSafeInteger(repetitionCount)||repetitionCount<1||(parameters[2]??0)!==0)throw new Error('Positive-repeat zero-subtype Active hit required');
  let directHitOrdinal=1,directExecutionOrdinal=1,observedDirectHits=preOutcome?null:1;
  if(repetitionCount>1){
    if(livingEnemies(hitSnapshot,caster.camp).length!==1)throw new Error('Repeated-hit replay validation currently requires one living enemy');
    if(!preOutcome){
      const directHitSnapshots=hitSnapshots.filter(snapshot=>{
        const matching=hits.find(item=>item.recordIndex===snapshot.recordIndex&&item.frameIndex===snapshot.frameIndex);
        return matching?.data?.beHitConfig?.castRoleUid===caster.uid&&matching.data.beHitConfig.skillConfigId===card.tid;
      }).sort(chronological);
      if(!directHitSnapshots.length||directHitSnapshots.length%repetitionCount!==0)throw new Error('Recorded direct-hit count must be a positive multiple of command repetition count');
      const directIndex=directHitSnapshots.indexOf(hitSnapshot);
      if(directIndex<0)throw new Error('Selected hit must belong to the repeated direct-hit sequence');
      observedDirectHits=directHitSnapshots.length;directHitOrdinal=directIndex%repetitionCount+1;directExecutionOrdinal=Math.floor(directIndex/repetitionCount)+1;
    }
  }
  const skillArgsPlus=parameters.length===4?parameters[3]:0;
  if(!Number.isFinite(skillArgsPlus))throw new Error('Resolved finite ParaPlus value required');
  const tags=dense(skill.Type,'Skill type tags');
  if(!tags.length||tags.some(tag=>!supportedTags.has(tag))||new Set(tags).size!==tags.length)throw new Error('Unique supported skill tags required');
  const targetStateIds=[...new Set((hitSnapshot.activeStates??[]).filter(state=>state?.ownerUid===targetUid&&!state.isDeleted).map(state=>state.stateId))];
  if(targetStateIds.some(id=>!Number.isSafeInteger(id)||id<=0))throw new Error('Captured positive target state IDs required');
  if(combatBuild==='pc-res150-build51'&&targetStateIds.length)throw new Error('Resource-150 replay candidates with target states are outside the cross-build-supported scope');
  const observed=hit.data.beHitConfig??{};
  if(preOutcome&&['castDamage','isCrit','oldHp','blockLose','realDamage','hpLose'].some(key=>Object.hasOwn(observed,key)))throw new Error('Pre-outcome candidate must not contain observed damage, critical, HP or block fields');
  if(observed.castRoleUid!==caster.uid)throw new Error('Recorded hit caster identity must match card owner');
  if(observed.skillConfigId!==card.tid)throw new Error('Recorded hit skill identity must match played card');
  const scenario={schemaVersion:1,kind:'morimens-battle-property-snapshot-damage',build:combatBuild,snapshotStage:'battle-property-server-live',snapshotCompleteness:'complete-map',baseValue:parameters[0],skillArgsPlus,tags,
    casterProperties:finiteMap(caster.properties,'Caster properties'),playerProperties:finiteMap(player.properties,'Player properties'),targetProperties:finiteMap(target.properties,'Target properties'),cardProperties:finiteMap(card.properties,'Card properties'),
    cardContext:{present:true,instructionCard:tags.some(tag=>instructionTags.has(tag)),stateTriggerAdd:false},targetContext:{critRoll,targetBattleTag:monster.BattleTag,targetStateIds}};
  let calculation=null,calculationBlocker=null;
  try{calculation=calculateSnapshotActiveDamage(scenario);}catch(error){if(error.message==='RNG-dependent critical outcome requires a captured pre-outcome roll')calculationBlocker=error.message;else throw error;}
  const observedCastDamage=!preOutcome&&Number.isFinite(observed.castDamage)?observed.castDamage:null;
  const comparison=calculation&&observedCastDamage!==null?{metric:'preHitDamage-vs-beHitConfig.castDamage',predicted:calculation.preHitDamage,observed:observedCastDamage,difference:calculation.preHitDamage-observedCastDamage}:null;
  return {schemaVersion:1,kind:preOutcome?'MORIMENS_REPLAY_PREOUTCOME_CANDIDATE':'MORIMENS_REPLAY_ACTION_REGRESSION_CANDIDATE',build:combatBuild,protocolBuild,status:calculation?'CALCULATED_REGRESSION_CANDIDATE':'PREOUTCOME_INPUT_REQUIRED',actionIndex,hitIndex:hitSnapshot.hitIndex,identities:{cardUid:card.uid,skillId:card.tid,casterUid:caster.uid,playerUid:player.uid,targetUid,commandId:selectedCommand.value,rowId:row.id},routing:{selectedCommand,commandSourceShape:imported.sourceShape,importMetadata:imported.metadata,rowSelection:rowSelection.map(item=>({rowId:item.row.id,target:item.row.Target,condition:item.condition,targetMatched:item.targetMatched})),competingDamageSelection:competingDamageSelection.map(item=>({rowId:item.row.id,type:item.row.Type,target:item.row.Target,condition:item.condition})),awakerSchoolCounts,targetBindingSource:preOutcome?'identity-only-preoutcome':targetBindingSource,selectorValidation,superUltimateResolution:{isSuperUltimate:superUltimate,doubleUltiEnergy:doubleEnergy,maximumEnergy:maxUltiEnergy,currentEnergy:prop('ulti_energy'),levelUp:prop('ulti_skill_level_up')},parameters,plusValues,tags},scenario,calculation,calculationBlocker,
    damageInputReconstruction:preOutcome?null:JSON.parse(JSON.stringify(hitSnapshot.reconstruction)),observedHit:preOutcome?null:JSON.parse(JSON.stringify(hit)),comparison,repetition:{perExecution:repetitionCount,hitOrdinal:directHitOrdinal,executionOrdinal:directExecutionOrdinal,observedDirectHits},unresolvedDependencies:preOutcome?['Prediction is limited to a deterministic direct hit with frozen target/caster/skill identity','Pre-hit snapshots and catalog rows require provenance review','Recorded engine-code version remains unresolved']:['Retrospective replay evidence cannot become a blind holdout','Action window and identity still require human review for triggered or overlapping actions','Observed hit and post-outcome critical fields are excluded from scenario construction','Target HP and block are reconstructed from explicit BeHit fields because the render record follows their mutations','Multiple executions sharing a card and skill identity require trigger-graph review','No connected original card-use, trigger graph, hit resolution or independent gameplay validation']};
}
