// Raw selector results; expression constructor/getter initialization is separate.
export function selectBasicCommandTargets({selector,casterUid,lastEffectUid,upperTargets,getRole,getPlayer,getCasterCamp,getEffect}){
  const reads=[];
  const uid=v=>v===null||Number.isSafeInteger(v);
  const list=v=>v===null||Array.isArray(v);
  const fn=(f,name)=>{if(typeof f!=='function')throw new Error(`Explicit ${name} adapter required`);};
  let targets;
  if(selector==='UpperTarget'){
    if(!list(upperTargets))throw new Error('Explicit upper target list or null required');
    targets=upperTargets;
  }else if(selector==='CmdCaster'){
    if(!uid(casterUid))throw new Error('Explicit caster UID required');fn(getRole,'role lookup');
    reads.push(['GetRoleByUid',casterUid]);const role=getRole(casterUid);if(role===undefined)throw new Error('Unresolved caster lookup');targets=role===null?[]:[role];
  }else if(selector==='PlayerRole'){
    fn(getCasterCamp,'caster camp');fn(getPlayer,'player lookup');reads.push(['GetCasterCamp']);const camp=getCasterCamp();
    if(camp===undefined||camp===null)throw new Error('Unresolved caster camp');
    reads.push(['GetPlayer',camp]);const player=getPlayer(camp);if(player===undefined)throw new Error('Unresolved player lookup');targets=player===null?[]:[player];
  }else if(selector==='LastTarget'){
    if(!uid(lastEffectUid))throw new Error('Explicit last effect UID required');fn(getEffect,'effect lookup');
    reads.push(['GetObj',lastEffectUid]);const effect=getEffect(lastEffectUid);if(effect===undefined)throw new Error('Unresolved last effect lookup');
    targets=effect?.targets??[];if(!Array.isArray(targets))throw new Error('Explicit last effect target list required');
  }else throw new Error('Unsupported basic selector');
  return {targets,reads};
}
