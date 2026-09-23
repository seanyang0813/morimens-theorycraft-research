// Installed SchoolCompPVE.CalcTentacleDmg, ordinary PvE.
// Five Awaker categories are averaged; eligible state-property contributions
// are summed by property name across Awakeners, then names multiply.
const averaged=['enemyTypePer','enemyBuffPer','enemyDebuffPer','enemyBlockPer','enemyBarrierPer'];
const rowKeys=[...averaged,'stateBonuses'];
const exact=(value,expected)=>value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).length===expected.length&&expected.every(key=>Object.hasOwn(value,key));

export function aggregateTentacleAwakerBonuses(input){
  if(!exact(input,['build','awakers'])||input.build!=='pc-res151-build51'||
      !Array.isArray(input.awakers)||input.awakers.length<1||input.awakers.length>4)
    throw new Error('Exact installed Tentacle input with one to four ordered Awakeners required');
  for(const row of input.awakers){
    if(!exact(row,rowKeys)||averaged.some(key=>!Number.isFinite(row[key]))||
        !row.stateBonuses||Array.isArray(row.stateBonuses)||Object.getPrototypeOf(row.stateBonuses)!==Object.prototype||
        Object.entries(row.stateBonuses).some(([key,value])=>!key||['__proto__','constructor','prototype'].includes(key)||!Number.isFinite(value)))
      throw new Error('Exact finite resolved Tentacle bonuses required for every Awaker');
  }
  const values=Object.fromEntries(averaged.map(key=>[key,
    input.awakers.reduce((sum,row)=>sum+row[key],0)/input.awakers.length]));
  const stateTotals={};
  for(const awaker of input.awakers)for(const [key,value] of Object.entries(awaker.stateBonuses))
    stateTotals[key]=(stateTotals[key]??0)+value;
  let enemyStateMultiplier=1;
  for(const value of Object.values(stateTotals))enemyStateMultiplier*=1+value/100;
  return {build:input.build,values,enemyStateMultiplier,stateTotals,
    trace:[...averaged.map(key=>({property:key,rule:'arithmetic average across Awakeners',value:values[key]})),
      {property:'enemyStateMultiplier',rule:'sum per eligible state property across Awakeners; multiply distinct state properties',stateTotals,value:enemyStateMultiplier}],
    evidenceFixture:'tests/synthetic/installed-tentacle-multi-awaker.json',
    scope:'One to four Awakeners with already resolved per-Awaker target bonuses and state-property names; before Tentacle pre-hit formula',
    unresolvedDependencies:['Per-Awaker target-category and state eligibility','State-property identity and property acquisition','Independent gameplay validation']};
}
