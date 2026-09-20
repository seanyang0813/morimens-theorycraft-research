// SKeyDB-sourced baseline; conditional sequence, not a gameplay fixture.
import {readFileSync,writeFileSync} from 'node:fs';
import {showDamage,neutralShowInputs} from '../engine/show-damage.mjs';
import {activeTargetDamage,targetKeys} from '../engine/active-target.mjs';
import {normalizeSkillArguments} from '../engine/skill-arguments.mjs';
if(!process.argv.includes('--historical-baseline'))throw new Error('The revised user scenario has unresolved inputs. Use --historical-baseline only to inspect the superseded noncritical reference setup.');
const read=n=>JSON.parse(readFileSync('research/external/skeydb/'+n,'utf8'));
const catalog=read('awakeners.json').records;
const coeff=(name,arg)=>Number(read(name).descriptionArgs[arg].values[5])/100;
const coefficients={arachne:coeff('skill.arachne.strike.json','Arg1'),blast:coeff('skill.mouchette.mortal-blast.json','Arg1'),exaltFlat:coeff('skill.mouchette.shining-tornado.json','Arg3'),follow:Number(read('derived.mouchette.dramatic-encounter.json').descriptionArgs.Arg1.value)/100};
const target=Object.fromEntries(targetKeys.map(k=>[k,k==='isCrit'?false:k==='enemyStateDmgMultiplier'?1:0]));
const stat=(name,level)=>{const c=catalog.find(c=>c.name===name);return Math.ceil((c.primaryScalingBase+level+c.defaultPrimaryStatBonusLevel)*c.statScaling.ATK-1e-9)};
function baseline(level,alternating=true){
 const attackM=stat('Mouchette',level),attackA=stat('Arachne',level),flat=Math.ceil(attackM*coefficients.exaltFlat);
 const hit=(raw,k)=>{const normalizedArgument=normalizeSkillArguments([raw],[])[0];const inputs={...neutralShowInputs(normalizedArgument),strikecard_damage_plus:flat,skillTypeInsideDmgPer:1+k*.25};const offensive=showDamage(inputs);const targetResult=activeTargetDamage(offensive.showDamage,target);return {raw,normalizedArgument,inputs,offensive,targetResult,damage:targetResult.preHitDamage}};
 let k=0,uses=0,followups=0;const rounds=[];
 for(let round=1;round<=5;round++){
  const a=alternating?hit(attackA*coefficients.arachne,0):null;if(a)uses++;
  const b=hit(attackM*coefficients.blast,k);uses++;
  const f=uses%2===0&&followups<4?hit(attackM*coefficients.follow,k):null;
  rounds.push({round,layersBefore:k,arachne:a,blast:b,follow:f,aTotal:a?.damage??0,bTotal:2*b.damage,fTotal:f?3*f.damage:0,total:(a?.damage??0)+2*b.damage+(f?3*f.damage:0)});
  if(f){k++;followups++}
 }
 const sum=key=>rounds.reduce((v,r)=>v+r[key],0);
 return {level,attackM,attackA,flat,rounds,arachne:sum('aTotal'),blast:sum('bTotal'),follow:sum('fTotal'),total:sum('total')};
}
const report={status:'SKEYDB_BASELINE_CONDITIONAL_NOT_GAMEPLAY_VERIFIED',sourceCommit:'a2ff07765b2e0c78af827577f881054dbe224d8d',coefficients,assumptions:{skillLevel:6,gnosticBonusLevels:10,mouchetteEnlighten:'E2',roused:true,exaltBuffAlreadyActive:true,exaltDamageIncluded:false,arachneRoused:false,startingSTR:0,equipment:'none',seasonalBonuses:false,crit:'all hits noncritical; not expected RNG damage',startingFollowupProgress:0,startingLayers:0,cap:4,enemyCount:1,cardSupply:'five Mortal Blast casts supplied; generated Strikes played next pair, last copy unplayed'},levels:[70,90].map(level=>({pairs:baseline(level),blastOnly:baseline(level,false)}))};
writeFileSync('output/pdf/mortal-blast-example-calculation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report.levels.map(x=>({level:x.pairs.level,attackM:x.pairs.attackM,attackA:x.pairs.attackA,flat:x.pairs.flat,pairs:x.pairs.total,blastOnly:x.blastOnly.total,rounds:x.pairs.rounds.map(r=>r.total)}))));
