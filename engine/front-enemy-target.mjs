export function selectFrontEnemy({casterCamp,lockedUid,tauntUid,roles}){
  if(![1,2].includes(casterCamp)||![lockedUid,tauntUid].every(v=>v===null||Number.isSafeInteger(v))||!Array.isArray(roles))throw new Error('Explicit two-camp targeting context required');
  const ids=new Set();
  for(const r of roles){
    if(!r||!Number.isSafeInteger(r.uid)||ids.has(r.uid)||![1,2].includes(r.camp)||typeof r.hasHpBar!=='boolean'||typeof r.dead!=='boolean'||!Number.isFinite(r.position)||!Number.isFinite(r.sneak))throw new Error('Complete unique role records required');
    ids.add(r.uid);
  }
  const locked=roles.find(r=>r.uid===lockedUid);if(locked)return {targets:[locked.uid],reason:'locked'};
  const taunt=roles.find(r=>r.uid===tauntUid);if(taunt)return {targets:[taunt.uid],reason:'taunt'};
  const eligible=roles.filter(r=>r.sneak===0&&r.camp===3-casterCamp&&r.hasHpBar&&!r.dead);
  const positions=new Set();
  for(const r of eligible){const p=Math.abs(r.position);if(positions.has(p))throw new Error('Equal absolute positions require original Lua tie-order handling');positions.add(p);}
  eligible.sort((a,b)=>Math.abs(a.position)-Math.abs(b.position));
  return {targets:eligible.length?[eligible[0].uid]:[],reason:eligible.length?'position':'no-target'};
}
