export function startTimeline({runResearchTimeline,compareTimelines,runtimeFingerprint}){
const $=id=>document.getElementById(id),format=n=>n.toLocaleString('en-US',{maximumFractionDigits:5});
let current=null,pinned=null;
function element(tag,text){const e=document.createElement(tag);e.textContent=text;return e;}
function attempt(fn){try{fn();$('error').textContent='';}catch(error){current=null;$('results').hidden=true;$('error').textContent=error.message;}}
function show(input){
  const result=runResearchTimeline(input);current={input:JSON.parse(JSON.stringify(input)),result};
  $('timeline-input').value=JSON.stringify(input,null,2);$('results').hidden=false;
  $('summary').textContent=`Modeled HP lost: ${format(result.modeledHpLost)}. Executed ${result.executedSteps} of ${input.steps.length} hits.${result.stop?' Stopped: '+result.stop.reason:''}`;
  $('rows').replaceChildren();$('traces').replaceChildren();
  const byId=new Map(result.trace.map(t=>[t.stepId,t]));
  for(const [index,step] of input.steps.entries()){
    const trace=byId.get(step.id),row=document.createElement('tr');row.append(element('td',step.id));
    row.append(element('td',trace?`${format(trace.before.hp)} → ${format(trace.after.hp)}`:'Not executed'),element('td',trace?`${format(trace.before.block)} → ${format(trace.after.block)}`:'—'),element('td',trace?format(trace.before.hp-trace.after.hp):'—'));
    const controls=document.createElement('td');
    for(const [label,offset] of [['Earlier',-1],['Later',1]]){const button=element('button',label);button.disabled=index+offset<0||index+offset>=input.steps.length;button.setAttribute('aria-label',`Move ${step.id} ${label.toLowerCase()}`);button.onclick=()=>attempt(()=>{const changed=JSON.parse(JSON.stringify(current.input));[changed.steps[index],changed.steps[index+offset]]=[changed.steps[index+offset],changed.steps[index]];show(changed);});controls.append(button);}
    row.append(controls);$('rows').append(row);
    if(trace){
      const details=document.createElement('details');details.append(element('summary',`${step.id}: inputs, arithmetic and hit payload`));
      if(trace.hit){
        details.append(element('p',`Direct hit HP loss: ${format(trace.hit.modeledHpLost)}. Generated HP loss: ${format(trace.hit.after.hp-trace.after.hp)}. Old Embers layers: ${trace.oldEmbersBefore} → ${trace.oldEmbersAfter}.`));
        details.append(element('p',trace.activation?.activated?'Old Embers activation accepted.':trace.oldEmbersBefore===0?'Old Embers absent: no layers remain.':'No Old Embers activation was resolved; inspect the hit type and any stop reason.'));
        const effects=document.createElement('ol');
        for(const generated of trace.generatedEffects)effects.append(element('li',`${generated.id} (caused by ${generated.parentStepId}): ${generated.effect.type}; HP ${format(generated.before.hp)} → ${format(generated.after.hp)}; Old Embers ${generated.before.layers[80575]} → ${generated.after.layers[80575]}.`));
        details.append(effects);
      }
      details.append(element('pre',JSON.stringify({input:step,...trace},null,2)));$('traces').append(details);
    }
  }
  $('dependencies').replaceChildren(...result.unresolvedDependencies.map(s=>element('li',s)));
  $('result-json').textContent=JSON.stringify(result,null,2);
  $('comparison').textContent='';
  $('comparison-details').replaceChildren();$('comparison-input').value='';
  if(pinned){
    const comparison=compareTimelines({schemaVersion:1,kind:'morimens-timeline-comparison',baseline:pinned.input,candidate:input},{runtimeFingerprint});
    $('comparison-input').value=JSON.stringify(comparison.experiment,null,2);
    if(comparison.inputChanges.length)$('comparison').textContent='Pinned A has different hit inputs or target assumptions. The comparison includes these changes as well as any changed order.';
    else{
      $('comparison').textContent=`Compared with pinned A: ${comparison.completeComparison?'HP loss change '+format(comparison.modeledHpLostDelta):'Full-sequence change unresolved because execution stopped'}. Both orders use scope: ${input.interveningEffects}.`;
    }
    const list=document.createElement('ul');
    for(const step of comparison.alignedSteps)list.append(element('li',`${step.id}: position ${step.baselinePosition??'absent'} → ${step.candidatePosition??'absent'}; HP loss change ${step.delta?format(step.delta.hpLost):'unresolved (absent or unexecuted)'}.`));
    $('comparison-details').append(list,element('p',comparison.interpretation),element('pre',JSON.stringify(comparison.inputChanges,null,2)));
  }
}
$('run').onclick=()=>attempt(()=>show(JSON.parse($('timeline-input').value)));
$('pin').onclick=()=>attempt(()=>{if(!current)throw new Error('Calculate a timeline first.');pinned=JSON.parse(JSON.stringify(current));show(current.input);});
$('load-comparison').onclick=()=>attempt(()=>{
  const comparison=compareTimelines(JSON.parse($('comparison-input').value),{runtimeFingerprint});
  pinned={input:comparison.experiment.baseline,result:comparison.baseline};show(comparison.experiment.candidate);
});
$('example').onclick=()=>attempt(()=>{
  const build='pc-res144-build51';
  const hit=(id,amount,puncture)=>({id,immune:false,puncture,scenario:{build,mode:'experimental',damageType:'FIXED',effect:{build,category:'FIXED',targetDead:false,baseDamage:amount,dimensionFixPer:0,fixed1:0,fixed2:0,fixed3:0,fixed4:0,fixed5:0}}});
  pinned=null;show({schemaVersion:1,build,interveningEffects:'assumed-absent',target:{hp:1000,block:100},steps:[hit('synthetic-puncture',100,true),hit('synthetic-ordinary',50,false)]});
});
$('embers-example').onclick=()=>attempt(()=>{
  $('example').onclick();
  const input=JSON.parse(JSON.stringify(current.input));input.interveningEffects='old-embers-only-assumed';input.oldEmbersLayers=100;
  for(const step of input.steps){step.puncture=false;step.scenario.effect.baseDamage=10;}
  input.steps[0].id='synthetic-fixed-1';input.steps[1].id='synthetic-fixed-2';show(input);
});
}
