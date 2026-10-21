import {loadVerifiedRuntime} from './verified-runtime.mjs';
let analyzeCommunityTeams,searchCommunityPortfolios,communityBuildPlan,minimumBlockForPressure,searchSimulationThreshold,runDamageWorksheet;
const $=id=>document.getElementById(id);
const node=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
const link=(text,url)=>{const a=node('a',text);a.href=url;return a;};
const download=(name,value)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}));const a=link('',url);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
let data,builds,pressure,fixture,lastSimulation=null,worksheetExamples,lastWorksheet=null;
const selected=new Set();
const names=ids=>ids.map(id=>data.teams.find(row=>row.id===id).name).join(' + ');
function showSelection(){
  $('portfolio-results').replaceChildren();
  const plan=analyzeCommunityTeams(data,[...selected]);
  $('portfolio-status').textContent=plan.conflicts.length ? plan.conflicts.map(row=>`${row.name} shared by ${names(row.teamIds)}`).join(' · ') : `${selected.size} selected templates; no named character or Posse conflicts. Other shared equipment and game rules still need review.`;
}
function cards(){
  $('team-cards').replaceChildren();const query=$('team-filter').value.toLowerCase().trim();
  for(const team of data.teams){
    if(query&&!JSON.stringify(team).toLowerCase().includes(query))continue;
    const card=node('article',undefined,'team-card');card.append(node('h3',team.name));
    const label=node('label',undefined,'check'),box=node('input');box.type='checkbox';box.checked=selected.has(team.id);box.addEventListener('change',()=>{if(box.checked)selected.add(team.id);else selected.delete(team.id);showSelection();});label.append(box,node('span','Include in portfolio'));card.append(label);
    card.append(node('p',team.members.map(row=>row.name).join(' · ')),node('p',`Posse: ${team.posse}`,'muted'),node('p',team.placement.text,'muted'),node('p',team.rationale.text));
    const sources=node('p',undefined,'source');sources.append(link('Why this setup ↗',team.rationale.url),document.createTextNode(' · '),link(`Source ${team.imageSource.anchor}`,data.source.url));card.append(sources);
    const details=node('details');details.append(node('summary','Investment, dependencies & substitutions'));const list=node('ul');
    for(const tier of team.tiers)list.append(node('li',`${tier.text} [${tier.cell}]`));
    if(!team.tiers.length)list.append(node('li','Investment breakpoints unknown; the source does not provide them.'));
    for(const row of [...team.restrictions,...team.notes,...team.alternatives])list.append(node('li',`${row.text}${row.cell?` [${row.cell}]`:''}`));
    details.append(list);card.append(details);
    const button=node('button','Open this lineup in build planner','secondary');button.type='button';button.addEventListener('click',()=>{try{sessionStorage.setItem('morimens-community-plan',JSON.stringify(communityBuildPlan(data,team.id,builds)));location.href='builds.html#community-plan';}catch(e){$('error').textContent=e.message;}});card.append(button);$('team-cards').append(card);
  }
}
$('team-filter').addEventListener('input',()=>{if(data)cards();});
$('portfolio-search').addEventListener('click',()=>{try{const result=searchCommunityPortfolios(data,[...selected]);$('portfolio-status').textContent=`${result.evaluatedSubsets} subsets evaluated. Maximum ${result.maximumTeams} templates without named character/Posse overlap. This does not assign waves or rank team strength.`;$('portfolio-results').replaceChildren(...result.portfolios.map(ids=>node('li',ids.length?names(ids):'No teams selected.')));$('error').textContent='';}catch(e){$('error').textContent=e.message;}});
$('run-threshold').addEventListener('click',()=>{
  lastSimulation=null;$('export-simulation').disabled=true;$('damage-results').replaceChildren();$('damage-status').textContent='';
  try{const input=JSON.parse($('simulation-input').value);input.thresholdHpLost=Number($('damage-threshold').value);const result=searchSimulationThreshold(input);lastSimulation=result;
    for(const row of result.candidates){const tr=node('tr');tr.append(node('td',row.id),node('td',row.bestOrder?.join(' → ')??'No eligible terminal order'),node('td',row.modeledHpLost?.toLocaleString()??'Unavailable'),node('td',row.passed?'PASS in model':'FAIL in model',row.passed?'pass':'fail'));$('damage-results').append(tr);}
    $('damage-status').textContent=`${result.evaluatedPermutations} permutations checked; ${result.passingCandidateIds.length}/${result.candidates.length} supplied candidates pass ${result.thresholdHpLost.toLocaleString()} modeled HP loss. ${JSON.stringify(input.candidates)===JSON.stringify(fixture.candidates)?'Synthetic example.':'Custom explicit inputs.'} No gameplay clear established.`;$('export-simulation').disabled=false;$('error').textContent='';
  }catch(e){$('error').textContent=e.message;$('damage-status').textContent='Calculation stopped; no threshold result.';}
});
$('reset-fixture').addEventListener('click',()=>{if(fixture){$('simulation-input').value=JSON.stringify(fixture,null,2);$('damage-threshold').value=fixture.thresholdHpLost;$('damage-status').textContent='Synthetic example restored. Run search to refresh results.';$('damage-results').replaceChildren();lastSimulation=null;$('export-simulation').disabled=true;}});
$('export-simulation').addEventListener('click',()=>{if(lastSimulation)download('morimens-threshold-result.json',lastSimulation);});
for(const id of ['damage-threshold','simulation-input'])$(id).addEventListener('input',()=>{lastSimulation=null;$('export-simulation').disabled=true;$('damage-results').replaceChildren();$('damage-status').textContent='Inputs changed. Run the search to refresh results.';});
for(const id of ['max-hp','starting-hp','healing','horizon'])$(id).addEventListener('input',()=>{$('survival-details').hidden=true;$('survival-status').textContent='Inputs changed. Run the threshold search to refresh results.';});
$('hypothetical').addEventListener('click',()=>{$('max-hp').value=3000;$('starting-hp').value=3000;$('healing').value=200;$('horizon').value=8;$('survival-details').hidden=true;$('survival-status').textContent='Hypothetical values loaded; these are not a calculated character build. Run the threshold search.';});
$('run-survival').addEventListener('click',()=>{
  $('survival-details').hidden=true;
  try{for(const id of ['max-hp','starting-hp','healing'])if($(id).value==='')throw new Error('Supply maximum HP, starting HP and effective healing explicitly.');const result=minimumBlockForPressure(pressure,{candidateMaxHp:Number($('max-hp').value),candidateStartingHp:Number($('starting-hp').value),healingPerTurn:Number($('healing').value),horizon:Number($('horizon').value)});
    $('survival-status').textContent=`Minimum fresh Block per turn: ${result.minimumBlockPerTurn.toLocaleString()} through turn ${$('horizon').value}. ${result.minimumBlockPerTurn?'One less fails.':'No Block needed for this supplied fixed-pressure case.'} Lowest surviving HP: ${result.thresholdPass.minimumHp}. Candidate card output and clear remain unresolved.`;$('survival-trace').textContent=JSON.stringify(result,null,2);$('survival-details').hidden=false;$('error').textContent='';
  }catch(e){$('error').textContent=e.message;$('survival-status').textContent='No candidate result. Required inputs must be explicit positive/integer values.';}
});
function invalidateWorksheet(){lastWorksheet=null;$('worksheet-export').disabled=true;$('worksheet-grids').replaceChildren();$('worksheet-result').textContent='';$('worksheet-status').textContent='Inputs changed; calculate to refresh the grid.';}
function loadWorksheetExample(){const input=worksheetExamples[$('worksheet-example').value];$('worksheet-input').value=JSON.stringify(input,null,2);$('worksheet-rows').value=input.rowAxis.values.join(', ');$('worksheet-columns').value=input.columnAxis.values.join(', ');$('worksheet-probability').value=input.setups[0].criticalProbability===null?'':input.setups[0].criticalProbability*100;$('worksheet-threshold').value=input.threshold.value;$('worksheet-metric').value=input.threshold.metric;$('worksheet-source').textContent=input.setups[0].source+' · Cost: '+input.setups[0].cost;invalidateWorksheet();}
$('worksheet-example').addEventListener('change',()=>{if(worksheetExamples)loadWorksheetExample();});
for(const id of ['worksheet-rows','worksheet-columns','worksheet-probability','worksheet-threshold','worksheet-metric','worksheet-input'])$(id).addEventListener('input',invalidateWorksheet);
$('run-worksheet').addEventListener('click',()=>{
  invalidateWorksheet();
  try{
    const input=JSON.parse($('worksheet-input').value),parse=value=>{const parts=value.split(',');if(parts.some(x=>!x.trim()))throw new Error('Every axis value must be explicit.');return parts.map(Number);};
    input.rowAxis.values=parse($('worksheet-rows').value);input.columnAxis.values=parse($('worksheet-columns').value);input.threshold={metric:$('worksheet-metric').value,value:Number($('worksheet-threshold').value)};
    // The probability control applies to the first setup; further setups retain explicit JSON values.
    input.setups[0].criticalProbability=$('worksheet-probability').value===''?null:Number($('worksheet-probability').value)/100;
    const result=runDamageWorksheet(input),metric=input.threshold.metric;lastWorksheet=result;
    for(const setup of result.setups){
      const wrap=node('div',undefined,'table-scroll'),table=node('table'),caption=node('caption',setup.label+' · '+metric+' pre-hit damage'),head=node('thead'),header=node('tr');header.append(node('th',input.rowAxis.label+' / '+input.columnAxis.label));
      for(const v of input.columnAxis.values)header.append(node('th',String(v)));head.append(header);table.append(caption,head);const body=node('tbody');
      for(const v of input.rowAxis.values){const tr=node('tr');tr.append(node('th',String(v)));for(const c of input.columnAxis.values){const cell=setup.grid.find(r=>r.rowValue===v&&r.columnValue===c);const text=cell[metric]===null?'Unknown':cell[metric].toLocaleString(undefined,{maximumFractionDigits:3});tr.append(node('td',text+(cell.passes===null?'':cell.passes?' · pass':' · fail'),cell.passes===true?'pass':cell.passes===false?'fail':''));}body.append(tr);}table.append(body);wrap.append(table);$('worksheet-grids').append(wrap);
    }
    $('worksheet-status').textContent=`${result.evaluatedCells} cells evaluated. Each expected value includes both branches; unknown probability stays unknown. Pre-hit arithmetic only; no full skill/rotation or gameplay clear.`;$('worksheet-result').textContent=JSON.stringify(result,null,2);$('worksheet-export').disabled=false;$('error').textContent='';
  }catch(e){$('error').textContent=e.message;$('worksheet-status').textContent='Worksheet stopped; no valid result.';}
});
$('worksheet-export').addEventListener('click',()=>{if(lastWorksheet)download('morimens-damage-worksheet.json',lastWorksheet);});
try{
  ({analyzeCommunityTeams,searchCommunityPortfolios,communityBuildPlan,minimumBlockForPressure,searchSimulationThreshold,runDamageWorksheet}=await loadVerifiedRuntime());
  const paths=['community-teams.json','build-catalog.json','community-enemy-pressure.json','community-wheel-threshold.json'];
  const loaded=await Promise.all(paths.map(async path=>{const response=await fetch(path);if(!response.ok)throw new Error(`Could not load ${path}`);return response.json();}));
  [data,builds,pressure,fixture]=loaded;
  const exampleNames=['rotan','active','tentacle'];worksheetExamples=Object.fromEntries(await Promise.all(exampleNames.map(async name=>{const response=await fetch(`damage-worksheet-${name==='rotan'?'visible-rotan':name}.json`);if(!response.ok)throw new Error('Could not load worksheet example');return [name,await response.json()];})));loadWorksheetExample();
  for(const team of data.teams)selected.add(team.id);cards();showSelection();$('simulation-input').value=JSON.stringify(fixture,null,2);
  for(const id of ['portfolio-search','run-threshold','run-survival','run-worksheet'])$(id).disabled=false;
}catch(e){$('error').textContent=e.message;}
