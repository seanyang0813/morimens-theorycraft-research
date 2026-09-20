import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {showDamage} from '../engine/show-damage.mjs';
import {activeTargetDamage} from '../engine/active-target.mjs';
const base=JSON.parse(readFileSync('output/pdf/mouchette-approved-baseline-calculation.json'));
const wheelBytes=readFileSync('research/external/skeydb/wheel-0029.json'),wheel=JSON.parse(wheelBytes);
const pursuitBasePercent=Number(wheel.descriptionArgs.StateArg1.values.at(-1));
const flatPerStrike=Math.ceil(base.attackM*Number(wheel.descriptionArgs.StateArg2.values.at(-1))/100);
const states=JSON.parse(readFileSync('research/extracted/config/State.json'));
const cap=states['123518'].MaxLayer;
if(states['124066'].ExistProperty.strikecard_damage_plus!=='ChangedLayer')throw new Error('Wheel flat property evidence changed');
let stacks=0;
function hit(original){
  if(!original)return null;
  const m=original.owner==='Mouchette';
  const utilityInputs={...original.utilityInputs,basicDamagePer:150};
  if(m){utilityInputs.strikecard_damage_plus+=stacks*flatPerStrike;if(original.kind==='follow')utilityInputs.skillTypeOutsideDmgPer*=1+pursuitBasePercent/100;}
  const utility=showDamage(utilityInputs),target=activeTargetDamage(utility.showDamage,original.target);
  return {...original,wheelStacks:stacks,wheelFlat:m?stacks*flatPerStrike:0,utilityInputs,showDamage:utility.showDamage,preHitDamage:target.preHitDamage,trace:[...utility.trace,...target.trace]};
}
const rounds=base.rounds.map(row=>{
  const aHit=hit(row.aHit);stacks=Math.min(cap,stacks+1);
  const blast=hit(row.blast);stacks=Math.min(cap,stacks+1);
  const pursuit=hit(row.pursuit);
  const arachneTotal=aHit.preHitDamage,blastTotal=2*blast.preHitDamage,pursuitTotal=pursuit?3*pursuit.preHitDamage:0;
  return {round:row.round,aHit,blast,pursuit,arachneTotal,blastTotal,pursuitTotal,total:arachneTotal+blastTotal+pursuitTotal};
});
const sum=key=>rounds.reduce((n,r)=>n+r[key],0);
const report={...base,status:'EQUIPPED_CONDITIONAL_PRE_HIT_NOT_GAMEPLAY_VERIFIED',setup:{...base.setup,teamDamageAmplificationPercent:150,mouchetteWheel:'Doomsday Rampage, maximum effect values',critInterpretation:'100% rate and 150% Crit DMG remain supplied final stats, including equipment/talent contributions',startingWheelStacks:0},wheel:{id:wheel.id,name:wheel.name,pursuitBasePercent,flatPerStrike,cap,sourceHash:createHash('sha256').update(wheelBytes).digest('hex')},rounds,totals:{arachne:sum('arachneTotal'),blast:sum('blastTotal'),pursuit:sum('pursuitTotal'),mouchette:sum('blastTotal')+sum('pursuitTotal'),combined:sum('total')}};
delete report.arithmeticVerification;
report.status='INCOMPLETE_TEAM_REALM_RECONSTRUCTION';
report.scopeWarning='Arithmetic reference only: intrinsic Arachne Prism and Dimension Shuttle are omitted. Not a complete equipped-team prediction.';
report.limitations.push(report.scopeWarning);
report.limitations.push('Wheel stacks use after-play order; attached pursuit runs after both after-card listener command branches','Wheel main stat is Death Resistance; specified final crit values are held fixed, not increased again');
writeFileSync('output/pdf/mouchette-equipped-baseline-calculation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({wheel:report.wheel,totals:report.totals,rounds:rounds.map(r=>({round:r.round,blastWheelStacks:r.blast.wheelStacks,pursuitWheelStacks:r.pursuit?.wheelStacks,blastPerHit:r.blast.preHitDamage,pursuitPerHit:r.pursuit?.preHitDamage,total:r.total}))},null,2));
