import {fieldsFor,hitFields,buildGeneralScenario,calculateGeneral} from './general-calculator.mjs';
import {compareScenarios} from './engine/experiments.mjs';
const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:5});
let baseline=null;
function field(key,label,value,parent,prefix){
  const id=prefix+key,input=document.createElement('input'),caption=document.createElement('label');
  caption.htmlFor=id;caption.textContent=label;input.id=id;input.type='number';input.step='any';input.required=true;
  if(value!==null)input.value=value;else input.placeholder='Required — enter a resolved value';
  parent.append(caption,input);
}
function clear(){
  $('total').textContent='—';$('result-note').textContent='Calculate to update the result for these inputs.';
  $('arithmetic').replaceChildren();$('hp-result').replaceChildren();$('dependencies').replaceChildren();$('snapshot').textContent='No current calculation.';$('error').textContent='';
  $('comparison').replaceChildren();
}
function renderFields(){
  clear();const type=$('damage-type').value;$('damage-fields').replaceChildren();
  const groups=new Map();
  for(const f of fieldsFor(type)){
    if(!groups.has(f.group)){
      const section=document.createElement(f.group.startsWith('Advanced')?'details':'section');
      const heading=document.createElement(section.tagName==='DETAILS'?'summary':'h3');heading.textContent=f.group;section.append(heading);$('damage-fields').append(section);groups.set(f.group,section);
      if(f.group.startsWith('Advanced')){const help=document.createElement('p');help.className='help';help.textContent='Resolved formula slots. Internal names are shown where a verified player-facing mapping is not yet available.';section.append(help);}
    }
    field(f.key,f.label,f.defaultValue,groups.get(f.group),'damage-');
  }
  $('critical-label').hidden=type!=='ACTIVE';$('prevention-label').hidden=type!=='ACTIVE';$('puncture-label').hidden=type==='PURE';
  if(type!=='ACTIVE'){$('critical').checked=false;$('prevention').checked=false;}
  if(type==='PURE')$('puncture').checked=false;
  $('category-help').textContent=type==='ACTIVE'?'The base is the resolved formula argument, not automatically the character’s ATK. Use the trace to inspect scaling.':type==='PURE'?'Pure uses a positive resolved base rounded upward. Its later hit resolution can still include shields, immunity and caps.':'Target modifier slots multiply independently; the dimension modifier is applied at its recovered rounding stage.';
}
for(const [key,label,value] of hitFields)field(key,label,value,$('hp-numbers'),'hit-');
function syncHp(){const enabled=$('resolve-hp').checked;$('hp-fields').hidden=!enabled;for(const input of $('hp-fields').querySelectorAll('input'))input.disabled=!enabled;}
function read(){return {damageType:$('damage-type').value,values:Object.fromEntries(fieldsFor($('damage-type').value).map(f=>[f.key,$('damage-'+f.key).value])),isCrit:$('critical').checked,
  hitEnabled:$('resolve-hp').checked,hitValues:Object.fromEntries(hitFields.map(([k])=>[k,$('hit-'+k).value])),immune:$('immune').checked,puncture:$('puncture').checked,preventEligible:$('prevention').checked};}
$('general-form').addEventListener('submit',event=>{event.preventDefault();clear();try{
  const input=read(),result=calculateGeneral(input),pre=result.experimentalModels[0];
  $('total').textContent=pre?fmt(pre.preHitDamage):'No hit';$('result-note').textContent='Modeled damage before hit resolution. Final gameplay damage remains unverified.';
  for(const step of pre?.trace??[]){const li=document.createElement('li');li.textContent=step.stage+': '+fmt(step.value);$('arithmetic').append(li);}
  const hp=result.experimentalModels.find(m=>m.name==='Ordinary HP subtraction');
  if(hp){const p=document.createElement('p');p.textContent=`Modeled HP lost: ${fmt(hp.modeledHpLost)} · HP remaining: ${fmt(hp.hpAfter)} · Shield remaining: ${fmt(hp.shieldAfter)}`;$('hp-result').append(p);}
  for(const dependency of result.unresolvedDependencies){const li=document.createElement('li');li.textContent=dependency;$('dependencies').append(li);}
  $('snapshot').textContent=JSON.stringify({input:buildGeneralScenario(input),result},null,2);
}catch(error){$('error').textContent=error.message;}});
$('general-form').addEventListener('input',clear);$('damage-type').addEventListener('change',renderFields);
$('resolve-hp').addEventListener('change',syncHp);$('reset').addEventListener('click',()=>{renderFields();$('critical').checked=false;});
renderFields();syncHp();

function showComparison(experiment){
  const result=compareScenarios(experiment);$('comparison').replaceChildren();
  const summary=document.createElement('p'),delta=result.metrics.delta;
  summary.textContent=`B − A: pre-hit ${delta.preHitDamage===null?'not comparable':fmt(delta.preHitDamage)}; modeled HP lost ${delta.modeledHpLost===null?'not available for both setups':fmt(delta.modeledHpLost)}.`;
  const list=document.createElement('ul');
  for(const change of result.inputChanges){const li=document.createElement('li');li.textContent=`${change.path}: ${Object.hasOwn(change,'before')?JSON.stringify(change.before):'(absent)'} → ${Object.hasOwn(change,'after')?JSON.stringify(change.after):'(absent)'}`;list.append(li);}
  if(!result.inputChanges.length){const li=document.createElement('li');li.textContent='Inputs are identical.';list.append(li);}
  const stages=document.createElement('ol');
  for(const stage of result.stageChanges.filter(s=>s.delta!==0)){const li=document.createElement('li');li.textContent=`${stage.stage}: ${fmt(stage.baseline)} → ${fmt(stage.candidate)} (${stage.delta>0?'+':''}${fmt(stage.delta)})`;stages.append(li);}
  const scope=document.createElement('p');scope.className='help';scope.textContent=result.interpretation+' Both results remain experimental.';
  $('comparison').append(summary,list,stages,scope);$('experiment-json').value=JSON.stringify(result.experiment,null,2);$('error').textContent='';
  return result;
}
$('save-baseline').addEventListener('click',()=>{try{const current=buildGeneralScenario(read());compareScenarios({schemaVersion:1,baseline:current,candidate:current});baseline=current;$('baseline-note').textContent=`A saved: ${current.damageType}. Edits now change B only.`;$('compare').disabled=false;$('comparison').replaceChildren();$('error').textContent='';}catch(error){$('error').textContent=error.message;}});
$('compare').addEventListener('click',()=>{try{if(!baseline)throw new Error('Save baseline A first.');showComparison({schemaVersion:1,baseline,candidate:buildGeneralScenario(read())});}catch(error){$('comparison').replaceChildren();$('error').textContent=error.message;}});
$('import-experiment').addEventListener('click',()=>{try{showComparison(JSON.parse($('experiment-json').value));}catch(error){$('comparison').replaceChildren();$('error').textContent=error.message;}});
$('experiment-json').addEventListener('input',()=>{$('comparison').replaceChildren();});
