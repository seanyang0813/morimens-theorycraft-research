export const MONSTER_SKILL_CHANGE_TYPE=Object.freeze({Substitute:0,Insert:1});

function integer(value,name,min=0){
  if(!Number.isSafeInteger(value)||value<min)throw new Error(`Explicit safe integer required: ${name}`);
}

function checkIntent(value,name){
  if(value!==null)integer(value,name,1);
}

// Narrow translation of MonsterBehaviorComp.ChangeSkill followed by the state
// fields set directly by SetIntention. Command construction and preview damage
// are reported as effects because they require the full battle data/runtime.
export function applyMonsterSkillChange(state,skillId,changeType){
  if(!state||typeof state!=='object'||Array.isArray(state))throw new Error('Explicit monster intent state required');
  const stateKeys=['intention','intentionRun','tempSkillList','hasIntentionCommand'];
  if(Object.keys(state).length!==stateKeys.length||!stateKeys.every(key=>Object.hasOwn(state,key)))throw new Error('Exact monster intent state fields required');
  integer(skillId,'skillId',1);integer(changeType,'changeType');
  if(!Object.values(MONSTER_SKILL_CHANGE_TYPE).includes(changeType))throw new Error('Unsupported monster skill change type');
  checkIntent(state.intention,'intention');
  if(typeof state.intentionRun!=='boolean')throw new Error('Explicit intentionRun boolean required');
  if(typeof state.hasIntentionCommand!=='boolean')throw new Error('Explicit hasIntentionCommand boolean required');
  if(!Array.isArray(state.tempSkillList)||Array.from({length:state.tempSkillList.length},(_,i)=>!Object.hasOwn(state.tempSkillList,i)).some(Boolean))throw new Error('Dense tempSkillList required');
  const tempSkillList=state.tempSkillList.map((entry,index)=>{
    if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).length!==2||!Object.hasOwn(entry,'intention')||!Object.hasOwn(entry,'changeType'))throw new Error(`Exact intent queue entry required at ${index}`);
    checkIntent(entry.intention,`tempSkillList[${index}].intention`);integer(entry.changeType,`tempSkillList[${index}].changeType`);
    return {...entry};
  });
  if(changeType===MONSTER_SKILL_CHANGE_TYPE.Substitute)tempSkillList.length=0;
  else if(!state.intentionRun&&state.intention!==null)tempSkillList.push({intention:state.intention,changeType});
  return {
    state:{...state,tempSkillList,lastIntention:state.intention,intention:skillId,intentionRun:false},
    effects:[
      ...(state.hasIntentionCommand?[{type:'disposePreviousIntentionCommand'}]:[]),
      {type:'emitIntentionChanged',skillId},
      {type:'constructIntentionCommand',skillId},
      {type:'refreshIntentionDamagePreview',skillId}
    ]
  };
}
