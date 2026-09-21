// Serializable planning inputs, deliberately separate from resolved combat stats.
const supportedClientBuilds=new Set(['pc-res144-build51','pc-res150-build51']);
export function validateBuildPlan(plan,catalog){
  if(!plan||plan.schemaVersion!==1||plan.kind!=='morimens-build-plan'||!Array.isArray(plan.team)||!plan.team.length||Object.keys(plan).some(k=>!['schemaVersion','kind','catalogRevision','team','clientBuild'].includes(k)))throw new Error('Expected a version 1 build plan with a nonempty team');
  if(Object.hasOwn(plan,'clientBuild')&&plan.clientBuild!==null&&!supportedClientBuilds.has(plan.clientBuild))throw new Error('Unsupported client build');
  if(plan.catalogRevision!==catalog.source.revision)throw new Error('Catalog revision mismatch');
  const characters=new Map(catalog.characters.map(c=>[c.id,c])),wheels=new Map(catalog.wheels.map(w=>[w.id,w]));
  const seen=new Set(),team=[];
  for(const member of plan.team){
    const keys=['slotId','characterId','level','wheelId'];
    if(!member||keys.some(k=>!Object.hasOwn(member,k))||Object.keys(member).some(k=>![...keys,'wheelEnhanceLevel','gnosticRank','advancementTalentId','advancementLevel'].includes(k)))throw new Error('Incomplete or unknown team fields');
    if(Object.hasOwn(member,'gnosticRank')&&member.gnosticRank!==null&&(!Number.isSafeInteger(member.gnosticRank)||member.gnosticRank<0||member.gnosticRank>5))throw new Error('Gnostic rank must be 0–5 or explicitly unknown');
    if(typeof member.slotId!=='string'||!member.slotId||seen.has(member.slotId))throw new Error('Team slot IDs must be unique');seen.add(member.slotId);
    if(!characters.has(member.characterId))throw new Error('Unknown character ID');
    if(member.level!==null&&(!Number.isSafeInteger(member.level)||member.level<1))throw new Error('Level must be a positive integer or explicitly unknown');
    if(member.wheelId!==null&&!wheels.has(member.wheelId))throw new Error('Unknown Wheel ID');
    if(Object.hasOwn(member,'wheelEnhanceLevel')&&member.wheelEnhanceLevel!==null&&(!Number.isSafeInteger(member.wheelEnhanceLevel)||member.wheelEnhanceLevel<0||member.wheelEnhanceLevel>15||member.wheelId===null))throw new Error('Wheel enhancement requires a selected Wheel and an integer 0–15, or null for unknown');
    if(Object.hasOwn(member,'advancementTalentId')&&member.advancementTalentId!==null&&(!Number.isSafeInteger(member.advancementTalentId)||member.advancementTalentId<=0))throw new Error('Advancement talent ID must be a positive integer or null for unknown');
    if(Object.hasOwn(member,'advancementLevel')&&member.advancementLevel!==null&&(!Number.isSafeInteger(member.advancementLevel)||member.advancementLevel<0||member.advancementLevel>10||!Object.hasOwn(member,'advancementTalentId')||member.advancementTalentId===null))throw new Error('Advancement level requires a selected talent and an integer 0–10, or null for unknown');
    team.push({...member});
  }
  return {plan:{schemaVersion:1,kind:plan.kind,catalogRevision:plan.catalogRevision,...(Object.hasOwn(plan,'clientBuild')?{clientBuild:plan.clientBuild}:{}),team},status:'PLAN_ONLY',finalDamage:null,
    unresolvedDependencies:['Level/progression and team/equipment legality validation','Soulforge, advancement, skills, Wheel level and enhancement','Equipment-to-stat and triggered-effect reconstruction','Encounter and initial state','Action timeline and legal resource usage','Independent gameplay validation']};
}
