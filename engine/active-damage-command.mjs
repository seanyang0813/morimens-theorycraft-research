const finite=(value,label)=>{if(!Number.isFinite(value))throw new Error(`${label} must be finite`);return value;};
function parameters(values){
  if(!Array.isArray(values)||values.length<1||values.length>4||!Array.from({length:values.length},(_,i)=>i).every(i=>Object.hasOwn(values,i)&&(values[i]===null||Number.isFinite(values[i])))||!Number.isFinite(values[0]))throw new Error('Ordinary numeric active parameters required');
  return [...values];
}
export function initializeActiveDamage({repeat,plus,per}){
  if(repeat!==null)finite(repeat,'Repeat');finite(plus,'Additional repetitions');finite(per,'Repeat percent');
  const baseTimes=Math.ceil(repeat??1),afterAddition=baseTimes+plus;
  const totalEffectTimes=Math.max(1,Math.ceil(afterAddition*(1+per/100)));
  if(!Number.isSafeInteger(totalEffectTimes))throw new Error('Repeat count exceeds supported integer range');
  return {baseTimes,afterAddition,totalEffectTimes};
}

export function initializeActiveDamageForBuild({build,repeat,plus,per}){
  if(build==='pc-res144-build51')return initializeActiveDamage({repeat,plus,per});
  if(build!=='pc-res150-build51')throw new Error('Unsupported Active-damage build');
  if(repeat!==null)finite(repeat,'Repeat');finite(plus,'Additional repetitions');finite(per,'Repeat percent');
  const baseTimes=Math.max(1,Math.ceil(repeat??1)),afterAddition=baseTimes+plus;
  const totalEffectTimes=Math.max(1,Math.ceil(afterAddition*(1+per/100)));
  if(!Number.isSafeInteger(totalEffectTimes))throw new Error('Repeat count exceeds supported integer range');
  return {baseTimes,afterAddition,totalEffectTimes};
}

export function routeActiveDamageRepetition(input){
  const keys=['ownerPresent','ownerMonster','ownerDead','skipPhase','total','left','delay','singleTarget','targets','regeneratedTargets'];
  if(!input||keys.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!keys.includes(k)))throw new Error('Exact Active routing input required');
  for(const key of ['ownerPresent','ownerMonster','ownerDead','skipPhase','singleTarget'])if(typeof input[key]!=='boolean')throw new Error('Active routing flags must be boolean');
  for(const key of ['total','left','delay'])finite(input[key],key);
  const checkTargets=(rows,name)=>{if(!Array.isArray(rows)||rows.some(row=>!row||!Number.isFinite(row.uid)||typeof row.dead!=='boolean'||Object.keys(row).some(k=>!['uid','dead'].includes(k))))throw new Error(`Invalid ${name}`);};
  checkTargets(input.targets,'targets');checkTargets(input.regeneratedTargets,'regeneratedTargets');
  const events=[];
  if(!input.ownerPresent||(input.ownerMonster&&input.ownerDead))return {returned:false,leftAfter:input.left,events};
  events.push({delay:input.skipPhase||input.total===input.left?0:input.delay});
  let targets=input.targets;
  if(input.singleTarget&&targets.length===1&&targets[0].dead){events.push('GenerateTargetsExp');targets=input.regeneratedTargets;}
  for(const target of targets)events.push({createFor:target.uid});
  return {returned:true,leftAfter:input.left-1,events};
}

// One supplied target; no retargeting, state-add variant, delays or lifecycle.
export function enqueueActiveDamage({scheduler,initialParameters,plus,per,isTargetDead,readParameters,resolveDamage,readCrit,applyHit,build='pc-res144-build51'}){
  const initial=parameters(initialParameters);
  for(const fn of [isTargetDead,readParameters,resolveDamage,readCrit,applyHit])if(typeof fn!=='function')throw new Error('Explicit live active-damage adapters required');
  if(!scheduler||typeof scheduler.enqueue!=='function')throw new Error('Effect scheduler required');
  const initialization=initializeActiveDamageForBuild({build,repeat:initial[1]??null,plus,per});
  const report={status:'EXPERIMENTAL',initialization,paraPlus:initial[3]??null,damageSubType:initial[2]??0,trace:[],stop:null,
    unresolvedDependencies:['Supplied expression, target, damage, crit and hit adapters','No automatic retargeting, state-add variant, delay or complete lifecycle','Component composition, not connected original execution or gameplay validation']};
  scheduler.enqueue(()=>{
    if(report.stop)return;
    scheduler.enqueue(()=>{
      const dead=isTargetDead();if(typeof dead!=='boolean')throw new Error('Explicit target death decision required');
      if(dead){report.stop='Target death requires resolution or retargeting';return;}
      const params=parameters(readParameters());
      const resolved=finite(resolveDamage(params[0],report.paraPlus),'Resolved damage');
      const isCrit=readCrit();if(typeof isCrit!=='boolean')throw new Error('Explicit crit result required');
      const attack={damageVal:Math.max(0,resolved),isCrit,damageSubType:report.damageSubType};
      const result=applyHit(attack);
      report.trace.push({hitIndex:report.trace.length+1,parameters:params,attack,result});
    });
  },{repetitions:initialization.totalEffectTimes});
  return report;
}
