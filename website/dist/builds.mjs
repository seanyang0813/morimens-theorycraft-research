import {validateBuildPlan} from './engine/build-plan.mjs';
import {resolveWheelMainstat} from './engine/wheel-stats.mjs';
import {resolveClientBuildPrimary,resolveClientAdvancementPrimary} from './engine/client-build-stats.mjs';
import {assembleKnownBuildComponents} from './engine/build-component-assembly.mjs';
const $=id=>document.getElementById(id);let catalog,clientData,clientBuild,team=[],nextId=1;
function invalidate(){$('plan-status').textContent='Plan changed. Export to update the saved JSON.';$('error').textContent='';}
function select(rows,value,onChange,label){const s=document.createElement('select'),empty=document.createElement('option');empty.value='';empty.textContent=label;s.append(empty);for(const row of rows){const o=document.createElement('option');o.value=row.id;o.textContent=`${row.name} · ${row.realm}`;s.append(o);}s.value=value??'';s.addEventListener('change',()=>{onChange(s.value||null);invalidate();});return s;}
function labelled(text,input,id){const label=document.createElement('label');label.htmlFor=id;label.textContent=text;input.id=id;return [label,input];}
function render(){
  $('team').replaceChildren();
  for(const [i,member] of team.entries()){
    const section=document.createElement('section'),h=document.createElement('h2');h.textContent=`Slot ${i+1}`;section.className='build-slot';section.append(h);
    section.append(...labelled('Character',select(catalog.characters,member.characterId,v=>{member.characterId=v;member.gnosticRank=null;member.advancementTalentId=null;member.advancementLevel=null;render();},'Choose character'),member.slotId+'-character'));
    const primary=document.createElement('p'),details=document.createElement('details'),summary=document.createElement('summary'),trace=document.createElement('pre');primary.className='help';primary.setAttribute('aria-live','polite');summary.textContent='Primary-stat arithmetic and evidence';details.append(summary,trace);
    function updatePrimary(){
      trace.textContent='';details.hidden=true;
      if(!clientBuild||!member.characterId||member.level==null||member.gnosticRank==null){primary.textContent='Choose client rules, character, level and Gnostic rank to calculate primary base stats.';return;}
      try{const hasAdvancement=member.advancementTalentId!=null&&member.advancementLevel!=null;const r=hasAdvancement?resolveClientAdvancementPrimary({build:clientBuild,characterId:member.characterId,level:member.level,gnosticRank:member.gnosticRank,advancementTalentId:member.advancementTalentId,advancementLevel:member.advancementLevel},clientData):resolveClientBuildPrimary({build:clientBuild,characterId:member.characterId,level:member.level,gnosticRank:member.gnosticRank},clientData);primary.textContent=`${hasAdvancement?'Primary stats after selected advancement':'Primary base stats before advancement'}: CON ${r.stats.CON} · ATK ${r.stats.ATK} · DEF ${r.stats.DEF}. Equipment and battle effects are excluded.`;trace.textContent=JSON.stringify(r,null,2);details.hidden=false;}catch(e){primary.textContent=e.message;}
    }
    const level=document.createElement('input');level.type='number';level.min='1';level.step='1';level.value=member.level??'';level.placeholder='Unknown';level.addEventListener('input',()=>{member.level=level.value===''?null:Number(level.value);updatePrimary();invalidate();});section.append(...labelled('Character level',level,member.slotId+'-level'));
    const gnostic=document.createElement('select'),blank=document.createElement('option');blank.value='';blank.textContent='Unknown Gnostic rank';gnostic.append(blank);
    for(let n=0;n<=5;n++){const option=document.createElement('option');option.value=String(n);option.textContent=String(n);gnostic.append(option);}
    gnostic.value=member.gnosticRank??'';gnostic.addEventListener('change',()=>{member.gnosticRank=gnostic.value===''?null:Number(gnostic.value);updatePrimary();invalidate();});section.append(...labelled('Gnostic Potential rank',gnostic,member.slotId+'-gnostic'),primary,details);updatePrimary();
    const clientCharacter=clientData?.characters.find(row=>row.characterId===member.characterId),talents=clientCharacter?.advancementTalents??[];
    const talentSelect=document.createElement('select'),talentUnknown=document.createElement('option');talentUnknown.value='';talentUnknown.textContent='Unknown advancement talent';talentSelect.append(talentUnknown);
    for(const talent of talents){const option=document.createElement('option');option.value=String(talent.clientTalentId);option.textContent=`Talent ${talent.clientTalentId} · ${talent.season}`;talentSelect.append(option);}
    talentSelect.value=member.advancementTalentId??'';talentSelect.addEventListener('change',()=>{member.advancementTalentId=talentSelect.value===''?null:Number(talentSelect.value);member.advancementLevel=null;render();invalidate();});section.append(...labelled('Season / Soulforge advancement talent',talentSelect,member.slotId+'-advancement-talent'));
    const selectedTalent=talents.find(row=>row.clientTalentId===member.advancementTalentId),advancementLevel=document.createElement('select'),levelUnknown=document.createElement('option');levelUnknown.value='';levelUnknown.textContent='Unknown advancement level';advancementLevel.append(levelUnknown);
    if(selectedTalent)for(let n=0;n<=selectedTalent.maximumLevel;n++){const option=document.createElement('option');option.value=String(n);option.textContent=String(n);advancementLevel.append(option);}
    advancementLevel.value=member.advancementLevel??'';advancementLevel.disabled=!selectedTalent;advancementLevel.addEventListener('change',()=>{member.advancementLevel=advancementLevel.value===''?null:Number(advancementLevel.value);updatePrimary();invalidate();});section.append(...labelled('Advancement level',advancementLevel,member.slotId+'-advancement-level'));
    section.append(...labelled('Wheel',select(catalog.wheels,member.wheelId,v=>{member.wheelId=v;member.wheelEnhanceLevel=null;render();},'Unspecified — not assumed unequipped'),member.slotId+'-wheel'));
    const upgrade=document.createElement('select'),unknown=document.createElement('option');unknown.value='';unknown.textContent='Unknown enhancement';upgrade.append(unknown);
    for(let n=0;n<=15;n++){const o=document.createElement('option');o.value=String(n);o.textContent=n<=3?`E${n}`:`E3 + ${n-3}`;upgrade.append(o);}
    upgrade.value=member.wheelEnhanceLevel??'';upgrade.disabled=member.wheelId===null;
    const preview=document.createElement('p');preview.className='help';preview.setAttribute('aria-live','polite');
    function updatePreview(){
      if(member.wheelId===null||member.wheelEnhanceLevel==null){preview.textContent='Choose a Wheel and explicit enhancement to preview its catalog main stat.';return;}
      try{const r=resolveWheelMainstat({catalogRevision:catalog.source.revision,wheelId:member.wheelId,enhanceLevel:member.wheelEnhanceLevel},catalog);preview.textContent=`Catalog main stat: ${r.stat} +${r.value}${r.unit==='percent'?'%':''}. ${r.trace.baseValue} + ${r.trace.growthSteps} × ${r.trace.perLevel} = ${r.value}. Passive effects and equipment legality remain unresolved.`;}catch(e){preview.textContent=e.message;}
    }
    upgrade.addEventListener('change',()=>{member.wheelEnhanceLevel=upgrade.value===''?null:Number(upgrade.value);updatePreview();invalidate();});
    section.append(...labelled('Wheel enhancement',upgrade,member.slotId+'-enhance'),preview);updatePreview();
    const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Remove slot';remove.addEventListener('click',()=>{team=team.filter(m=>m!==member);render();invalidate();});section.append(remove);$('team').append(section);
  }
}
function current(){return {schemaVersion:1,kind:'morimens-build-plan',catalogRevision:catalog.source.revision,...(clientBuild===undefined?{}:{clientBuild}),team};}
$('client-build').addEventListener('change',()=>{clientBuild=$('client-build').value||null;if(catalog){render();invalidate();}});
$('add').addEventListener('click',()=>{while(team.some(m=>m.slotId==='slot-'+nextId))nextId++;team.push({slotId:'slot-'+nextId++,characterId:null,level:null,gnosticRank:null,advancementTalentId:null,advancementLevel:null,wheelId:null,wheelEnhanceLevel:null});render();invalidate();});
$('save').addEventListener('click',()=>{try{const r=validateBuildPlan(current(),catalog);$('plan').value=JSON.stringify(r.plan,null,2);$('plan-status').textContent='Plan exported. Primary base stats and Wheel main stats have separate previews; final battle stats and sequence damage remain unresolved.';$('error').textContent='';}catch(e){$('error').textContent=e.message;}});
$('assemble').addEventListener('click',()=>{try{const r=assembleKnownBuildComponents(current(),catalog,clientData);$('assembly').textContent=JSON.stringify(r,null,2);$('assembly-status').textContent=r.assemblyStatus==='KNOWN_COMPONENTS_RESOLVED'?'Known character and Wheel components resolved. This is still not a complete battle-property snapshot.':`${r.issues.length} required build input${r.issues.length===1?' is':'s are'} still unknown.`;$('error').textContent='';}catch(e){$('error').textContent=e.message;}});
$('load').addEventListener('click',()=>{try{const r=validateBuildPlan(JSON.parse($('plan').value),catalog);team=r.plan.team;clientBuild=r.plan.clientBuild;$('client-build').value=clientBuild??'';render();$('plan-status').textContent='Plan loaded. No combat assumptions were filled in.';$('error').textContent='';}catch(e){$('error').textContent=e.message;}});
try{const responses=await Promise.all([fetch('build-catalog.json'),fetch('client-build-data.json')]);if(responses.some(r=>!r.ok))throw new Error('Could not load build data');[catalog,clientData]=await Promise.all(responses.map(r=>r.json()));for(const id of ['add','save','load','assemble'])$(id).disabled=false;$('add').click();}catch(e){$('error').textContent=e.message;}
