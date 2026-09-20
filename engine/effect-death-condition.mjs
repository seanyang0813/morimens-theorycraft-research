// One internal predicate only. TryDoEffect separately requires caster existence.
export function effectDeathCondition(v){
  const flags=['ignoreDead','pve','fromSkill','fromState','casterExists','stateExists','stateOwnerExists'];
  const players=['casterPlayer','statePlayer'];
  if(!v||flags.some(k=>typeof v[k]!=='boolean')||players.some(k=>!['missing','alive','dead'].includes(v[k]))||Object.keys(v).some(k=>![...flags,...players].includes(k)))throw new Error('Explicit effect death context required');
  const reject=reason=>({allowed:false,reason});
  if(v.ignoreDead)return {allowed:true,reason:null};
  if(v.pve){
    if(v.fromSkill&&(!v.casterExists||v.casterPlayer!=='alive'))return reject('PVE:skill caster is dead');
    if(v.fromState&&(!v.stateExists||!v.stateOwnerExists||v.statePlayer!=='alive'))return reject('PVE:state owner is dead');
  }else if(!v.casterExists)return reject('PVP: no CmdCaster');
  return {allowed:true,reason:null};
}
