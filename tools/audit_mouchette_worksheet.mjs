import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {calculateCombo} from '../website/dist/combo.mjs';
const bytes=readFileSync('website/dist/scenario.json'),scenario=JSON.parse(bytes);
const C=x=>Math.max(Math.ceil(x-0.00001),1);
let checks=0;
for(const mastery of [0,72,144,999,1000,5000])for(const shuttle of ['unused','used']){
  const r=calculateCombo(scenario,{mastery,amplification:150,shuttle});
  const p=Math.ceil(15*(1+mastery*.0005)),b=Math.ceil(25*(1+mastery*.0005));
  for(let i=0;i<5;i++){
    const row=r.rounds[i],w=Math.min(2*i+1,8),q=Math.min(2*i+2,8),factor=1+.02*p;
    assert.equal(row.aHit.preHitDamage,Math.ceil(2.5*C(739.5*(1+.02*(i===0&&shuttle==='unused'?b:0)+.02*p))));checks++;
    assert.equal(row.blast.preHitDamage,Math.ceil(3.75*C((908.25+65*w)*(1+.25*i)*factor)));checks++;
    if(i<4){assert.equal(row.pursuit.preHitDamage,Math.ceil(3.75*C((1066.2+65*q)*(1+.25*i)*factor)));checks++;}
  }
}
const primaryBytes=readFileSync('research/evidence/mouchette-case-study-primary.json');
const report={status:'CONDITIONAL_WORKSHEET_EQUATIONS_MATCH',scope:'Equation cross-check against existing authored combo implementation on synthetic mastery vectors plus pinned general-resolver primary inputs; not gameplay or full original sequence validation',checks,masteryResolved:false,finalDamage:null,scenarioSha256:createHash('sha256').update(bytes).digest('hex'),primaryBuildSha256:createHash('sha256').update(primaryBytes).digest('hex')};
writeFileSync('research/evidence/mouchette-worksheet-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
