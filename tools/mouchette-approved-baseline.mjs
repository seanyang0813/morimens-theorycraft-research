import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {calculateDamage,build} from '../engine/calculate-damage.mjs';
import {cardCasterKeys,cardPropertyKeys,playerSetupKeys} from '../engine/card-offensive-setup.mjs';
import {targetKeys} from '../engine/active-target.mjs';
const files={};
function read(name){const path='research/external/skeydb/'+name,bytes=readFileSync(path);files[path]=createHash('sha256').update(bytes).digest('hex');return JSON.parse(bytes);}
const m=read('awakener-0033.json'),a=read('awakener-0056.json');
const gn=read('talent.mouchette.gnostic-potential.json'),sf=read('talent.mouchette.soulforge-aptitude.json');
const skill=read('skill.mouchette.mortal-blast.json'),exalt=read('skill.mouchette.shining-tornado.json'),strike=read('skill.arachne.strike.json'),follow=read('derived.mouchette.dramatic-encounter.json');
const linear=(arg,level)=>Number(arg.base)+(level-1)*Number(arg.gainPerLevel);
const bonusLevels=linear(gn.descriptionArgs.Arg1,5),sfPercent=linear(sf.descriptionArgs.Arg1,10);
const stat=(record,bonus=0)=>Math.ceil(Math.ceil((record.primaryScalingBase+90+bonusLevels)*record.statScaling.ATK-1e-9)*(1+bonus/100)-1e-9);
const attackM=stat(m,sfPercent),attackA=stat(a),flat=Math.ceil(attackM*Number(exalt.descriptionArgs.Arg3.values[5])/100);
const basePercent=Number(sf.descriptionArgs.Arg3.values[9]),bossPercent=Number(sf.descriptionArgs.Arg5.values[9]);
const zero=keys=>Object.fromEntries(keys.map(k=>[k,0]));
function hit(owner,layers,kind){
  const actor=owner==='Mouchette',coefficient=kind==='follow'?Number(follow.descriptionArgs.Arg1.value):Number((actor?skill:strike).descriptionArgs.Arg1.values[5]);
  const raw=(actor?attackM:attackA)*coefficient/100;
  const caster={...zero(cardCasterKeys),strikecard_damage_plus:flat,o_damage_per_strikecard:basePercent,i_damage_per_strikecard:actor?25*layers:0};
  const target={...zero(targetKeys),isCrit:true,awakerCritDamage:150,enemyStateDmgMultiplier:1,enemyTypeDmgPer:actor?bossPercent:0};
  const tags=kind==='follow'?['Card_Strike','Card_AttachPost']:actor?['Card_Skill','Card_Strike']:['Card_Strike'];
  const input={mode:'experimental',build,damageType:'ACTIVE',skillArgumentSnapshot:{raw:[raw],overrides:[],argumentIndex:1},offenseSetup:{build,caster,player:zero(playerSetupKeys),card:zero(cardPropertyKeys),tags,instructionCard:true,stateTriggerAdd:false,dimensionFixPer:0,skillArgsPlus:0},target};
  const output=calculateDamage(input);
  return {owner,kind,layers,coefficient,raw,argument:output.skillArgumentSnapshot.value,utilityInputs:output.offenseSetup.resolvedUtilityInputs,target,showDamage:output.offensiveUtility.showDamage,preHitDamage:output.experimentalModels[0].preHitDamage,trace:output.experimentalModels[0].trace};
}
const rounds=[];
for(let i=0;i<5;i++){
  const aHit=hit('Arachne',0,'strike'),blast=hit('Mouchette',i,'blast'),pursuit=i<4?hit('Mouchette',i,'follow'):null;
  const arachneTotal=aHit.preHitDamage,blastTotal=blast.preHitDamage*2,pursuitTotal=pursuit?pursuit.preHitDamage*3:0;
  rounds.push({round:i+1,aHit,blast,pursuit,arachneTotal,blastTotal,pursuitTotal,total:arachneTotal+blastTotal+pursuitTotal});
}
const sum=key=>rounds.reduce((n,r)=>n+r[key],0);
const report={status:'APPROVED_BASELINE_CONDITIONAL_PRE_HIT_NOT_GAMEPLAY_VERIFIED',build,sourceCommit:'a2ff07765b2e0c78af827577f881054dbe224d8d',setup:{level:90,skillLevel:6,gnosticLevel:5,mouchetteEnlighten:2,mouchetteSoulforge:10,mouchetteRoused:true,arachneRoused:false,critRate:100,critDamageStat:150,STR:0,mode:'Astral Reign',target:'one Dominator; no additional modifiers',sequence:'[Arachne Strike -> Mortal Blast] x5 after Rouse and Exalt',startingPursuitProgress:0,startingInsideStrikeLayers:0,cardSupply:'five Mortal Blasts and five Strikes explicitly supplied',exaltOpeningDamageIncluded:false},attackM,attackA,flat,basePercent,bossPercent,rounds,totals:{arachne:sum('arachneTotal'),blast:sum('blastTotal'),pursuit:sum('pursuitTotal'),mouchette:sum('blastTotal')+sum('pursuitTotal'),combined:sum('total')},sourceHashes:files,limitations:['Conditional pre-hit calculation, not independent gameplay validation','Target must survive all attacks for the complete sequence','No additional relic, equipment, target mitigation, cap or triggered damage','Full event queue is not executed; configured follow-up order is used']};
writeFileSync('output/pdf/mouchette-approved-baseline-calculation.json',JSON.stringify(report,null,2));
writeFileSync('research/evidence/mortal-blast-user-scenario.json',JSON.stringify({status:report.status,approval:'User replied Use that baseline to the fully specified setup question',setup:report.setup,report:'output/pdf/mouchette-approved-baseline-calculation.json'},null,2));
console.log(JSON.stringify({attackM,attackA,flat,totals:report.totals,rounds:rounds.map(r=>({round:r.round,perMHit:r.blast.preHitDamage,show:r.blast.showDamage,total:r.total}))},null,2));
