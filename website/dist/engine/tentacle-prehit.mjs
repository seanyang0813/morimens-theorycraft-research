// Resolved SchoolCompPVE.CalcTentacleDmg inputs. No effect, BeHit or HP simulation.
const numericKeys=['tentacleDamage','critDamagePer','beDamagePer','beDamagePer2',
  'beDamagePer3','beTentacleDamagePer','vulnerablePer','beDamagePlus',
  'enemyTypePer','enemyBuffPer','enemyDebuffPer',
  'enemyBlockPer','enemyBarrierPer','paraPlus'];

export function tentaclePreHit(input){
  if(!input||input.build!=='pc-res151-build51'||typeof input.isCrit!=='boolean')
    throw new Error('Expected resource-151 Tentacle input with resolved isCrit');
  const stateKey=Object.hasOwn(input,'enemyStateMultiplier')?'enemyStateMultiplier':'enemyStatePer';
  const keys=['build','isCrit',...numericKeys,stateKey];
  if(keys.some(key=>!Object.hasOwn(input,key))||Object.keys(input).some(key=>!keys.includes(key)))
    throw new Error('Missing or unknown Tentacle input');
  for(const key of [...numericKeys,stateKey])if(!Number.isFinite(input[key]))throw new Error('Invalid numeric input: '+key);
  const targetDamageProduct=['beDamagePer','beDamagePer2','beDamagePer3','beTentacleDamagePer']
    .reduce((value,key)=>value*(1+input[key]/100),1);
  const factors=[
    ['critical',input.isCrit?1+input.critDamagePer/100:1],
    ['target damage properties',targetDamageProduct],
    ['vulnerable',1+input.vulnerablePer/100],
    ['enemy type',1+input.enemyTypePer/100],
    ['enemy buff',1+input.enemyBuffPer/100],
    ['enemy debuff',1+input.enemyDebuffPer/100],
    ['enemy block',1+input.enemyBlockPer/100],
    ['enemy block barrier',1+input.enemyBarrierPer/100],
    ['enemy state',stateKey==='enemyStateMultiplier'?input.enemyStateMultiplier:1+input.enemyStatePer/100]];
  let value=input.tentacleDamage;
  const trace=[{stage:'resolved Tentacle damage',value}];
  for(const [stage,factor] of factors){value*=factor;trace.push({stage,factor,value});}
  value+=input.beDamagePlus+input.paraPlus;
  trace.push({stage:'target flat plus command parameter',value});
  value=Math.max(Math.ceil(value),1);
  if(!Number.isSafeInteger(value))throw new Error('Result exceeds safe integer range');
  trace.push({stage:'ceiling and minimum 1',value});
  return {status:'UNVERIFIED',build:input.build,damageType:'TENTACLE',isCrit:input.isCrit,
    preHitDamage:value,finalDamage:null,trace,
    evidenceFixture:'tests/synthetic/installed-tentacle-prehit.json',
    scope:'Installed SchoolCompPVE.CalcTentacleDmg from resolved inputs, before BeHit',
    unresolvedDependencies:['Upstream BETentacleAttack parameter and repeat/target resolution',
      'Critical-roll reconstruction','Independent gameplay validation','BeHit, events and HP resolution']};
}
