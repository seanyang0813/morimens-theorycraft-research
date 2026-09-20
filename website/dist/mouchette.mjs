import {calculateCombo} from './combo.mjs';
const $=id=>document.getElementById(id),fmt=n=>n.toLocaleString('en-US',{maximumFractionDigits:5});
let report;
function render(input){
  if(!report)throw new Error('Scenario is still loading.');
  const result=calculateCombo(report,input);
  $('total').textContent=fmt(result.conditionalPreHitTotal);
  $('layers').textContent=`Prism ${result.prismLayers} · Shuttle Beacon ${result.shuttleBeaconLayers}`;
  $('result-note').textContent='Conditional total before target mitigation and HP resolution. Final HP lost remains unverified.';
  $('rows').replaceChildren();$('traces').replaceChildren();
  for(const row of result.rounds){
    const tr=document.createElement('tr');
    for(const value of [row.round,row.arachneTotal,row.blast.preHitDamage,row.pursuit?.preHitDamage??'—',row.total]){const td=document.createElement('td');td.textContent=typeof value==='number'?fmt(value):value;tr.append(td);}
    $('rows').append(tr);
    for(const [label,hit] of [['Arachne Strike',row.aHit],['Mortal Blast',row.blast],['Mouchette pursuit',row.pursuit]])if(hit){
      const section=document.createElement('section');section.className='trace';
      const heading=document.createElement('h3');heading.textContent=`Pair ${row.round} · ${label} · per hit`;
      const list=document.createElement('ol');
      for(const step of hit.trace){const item=document.createElement('li');item.textContent=`${step.stage}: ${fmt(step.value)}`;list.append(item);}
      section.append(heading,list);$('traces').append(section);
    }
  }
  $('error').textContent='';return {status:result.status,conditionalPreHitTotal:result.conditionalPreHitTotal,finalDamage:null,prismLayers:result.prismLayers,beaconLayers:result.shuttleBeaconLayers};
}
$('setup').addEventListener('submit',event=>{event.preventDefault();try{if(!$('mastery').value.trim())throw new Error('Realm Mastery is required.');render({mastery:Number($('mastery').value),amplification:Number($('amp').value),shuttle:$('shuttle').value});}catch(error){$('error').textContent=error.message;}});
// Invalidate an old result as soon as its visible inputs change.
$('setup').addEventListener('input',()=>{$('total').textContent='—';$('layers').textContent='';$('result-note').textContent='Inputs changed. Calculate to update the breakdown.';$('rows').replaceChildren();$('traces').replaceChildren();});
try{const response=await fetch('scenario.json');if(!response.ok)throw new Error('Could not load scenario.');report=await response.json();$('calculate').disabled=false;}catch(error){$('error').textContent=error.message;}
const context=document.modelContext;
if(context?.registerTool){const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});try{Promise.resolve(context.registerTool({name:'calculate_mouchette_combo',description:'Calculate and display the conditional five-pair damage breakdown from explicit final stats. This is not verified final HP loss.',inputSchema:{type:'object',properties:{mastery:{type:'integer',minimum:0},amplification:{type:'number',minimum:0},shuttle:{type:'string',enum:['unused','used']}},required:['mastery','amplification','shuttle'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||Object.keys(input).some(k=>!['mastery','amplification','shuttle'].includes(k)))throw new Error('Invalid inputs.');const result=render(input);$('mastery').value=input.mastery;$('amp').value=input.amplification;$('shuttle').value=input.shuttle;return result;}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}
