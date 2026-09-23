// Serializable planning inputs, deliberately separate from resolved combat stats.
const supportedClientBuilds=new Set(['pc-res144-build51','pc-res150-build51','pc-res151-build51']);
const optionalMemberFields=['gnosticRank','advancementTalentId','advancementLevel'];
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));

function validateCommon(member,characters,seen){
  if(typeof member.slotId!=='string'||!member.slotId||seen.has(member.slotId))throw new Error('Team slot IDs must be unique');seen.add(member.slotId);
  if(!characters.has(member.characterId))throw new Error('Unknown character ID');
  if(member.level!==null&&(!Number.isSafeInteger(member.level)||member.level<1))throw new Error('Level must be a positive integer or explicitly unknown');
  if(Object.hasOwn(member,'gnosticRank')&&member.gnosticRank!==null&&(!Number.isSafeInteger(member.gnosticRank)||member.gnosticRank<0||member.gnosticRank>5))throw new Error('Gnostic rank must be 0–5 or explicitly unknown');
  if(Object.hasOwn(member,'advancementTalentId')&&member.advancementTalentId!==null&&(!Number.isSafeInteger(member.advancementTalentId)||member.advancementTalentId<=0))throw new Error('Advancement talent ID must be a positive integer or null for unknown');
  if(Object.hasOwn(member,'advancementLevel')&&member.advancementLevel!==null&&(!Number.isSafeInteger(member.advancementLevel)||member.advancementLevel<0||member.advancementLevel>10||!Object.hasOwn(member,'advancementTalentId')||member.advancementTalentId===null))throw new Error('Advancement level requires a selected talent and an integer 0–10, or null for unknown');
}

function validateLegacyMember(member,wheels){
  const required=['slotId','characterId','level','wheelId'],allowed=[...required,'wheelEnhanceLevel',...optionalMemberFields];
  if(!member||required.some(key=>!Object.hasOwn(member,key))||Object.keys(member).some(key=>!allowed.includes(key)))throw new Error('Incomplete or unknown version 1 team fields');
  if(member.wheelId!==null&&!wheels.has(member.wheelId))throw new Error('Unknown Wheel ID');
  if(Object.hasOwn(member,'wheelEnhanceLevel')&&member.wheelEnhanceLevel!==null&&(!Number.isSafeInteger(member.wheelEnhanceLevel)||member.wheelEnhanceLevel<0||member.wheelEnhanceLevel>15||member.wheelId===null))throw new Error('Wheel enhancement requires a selected Wheel and an integer 0–15, or null for unknown');
}

function validateWheelSlots(member,wheels){
  const required=['slotId','characterId','level','wheelSlots'],allowed=[...required,...optionalMemberFields];
  if(!member||required.some(key=>!Object.hasOwn(member,key))||Object.keys(member).some(key=>!allowed.includes(key))||!Array.isArray(member.wheelSlots)||member.wheelSlots.length>2)throw new Error('Version 2 members require zero to two Wheel slots');
  const seen=new Set();
  for(const slot of member.wheelSlots){
    if(!exact(slot,['slotId','wheelId','enhanceLevel','refinementLevel'])||typeof slot.slotId!=='string'||!slot.slotId||seen.has(slot.slotId))throw new Error('Wheel slot IDs must be explicit and unique per character');seen.add(slot.slotId);
    if(slot.wheelId===null){if(slot.enhanceLevel!==null||slot.refinementLevel!==null)throw new Error('Empty Wheel slots require null enhancement and refinement');continue;}
    if(!wheels.has(slot.wheelId))throw new Error('Unknown Wheel ID');
    if(slot.enhanceLevel!==null&&(!Number.isSafeInteger(slot.enhanceLevel)||slot.enhanceLevel<0||slot.enhanceLevel>15))throw new Error('Wheel enhancement must be null or an integer 0–15');
    if(slot.refinementLevel!==null&&(!Number.isSafeInteger(slot.refinementLevel)||slot.refinementLevel<0||slot.refinementLevel>3))throw new Error('Wheel refinement must be null or an integer 0–3');
  }
}

export function buildPlanWheelSlots(schemaVersion,member){
  if(schemaVersion===1)return [{slotId:'legacy-wheel',wheelId:member.wheelId,enhanceLevel:Object.hasOwn(member,'wheelEnhanceLevel')?member.wheelEnhanceLevel:null,refinementLevel:null,sourceSchemaVersion:1}];
  if(schemaVersion===2)return member.wheelSlots.map(slot=>({...slot,sourceSchemaVersion:2}));
  throw new Error('Unsupported build-plan schema version');
}

export function validateBuildPlan(plan,catalog){
  if(!plan||![1,2].includes(plan.schemaVersion)||plan.kind!=='morimens-build-plan'||!Array.isArray(plan.team)||!plan.team.length||Object.keys(plan).some(key=>!['schemaVersion','kind','catalogRevision','team','clientBuild'].includes(key)))throw new Error('Expected a version 1 or 2 build plan with a nonempty team');
  if(Object.hasOwn(plan,'clientBuild')&&plan.clientBuild!==null&&!supportedClientBuilds.has(plan.clientBuild))throw new Error('Unsupported client build');
  if(plan.catalogRevision!==catalog.source.revision)throw new Error('Catalog revision mismatch');
  const characters=new Map(catalog.characters.map(row=>[row.id,row])),wheels=new Map(catalog.wheels.map(row=>[row.id,row])),seen=new Set(),team=[];
  for(const member of plan.team){
    if(plan.schemaVersion===1)validateLegacyMember(member,wheels);else validateWheelSlots(member,wheels);
    validateCommon(member,characters,seen);team.push(JSON.parse(JSON.stringify(member)));
  }
  return {plan:{schemaVersion:plan.schemaVersion,kind:plan.kind,catalogRevision:plan.catalogRevision,...(Object.hasOwn(plan,'clientBuild')?{clientBuild:plan.clientBuild}:{}),team},status:'PLAN_ONLY',finalDamage:null,
    unresolvedDependencies:['Level/progression and team/equipment legality validation','Soulforge, advancement, skills, Wheel level, enhancement and refinement','Equipment-to-stat and triggered-effect reconstruction','Encounter and initial state','Action timeline and legal resource usage','Independent gameplay validation']};
}
