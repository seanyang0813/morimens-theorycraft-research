const $=id=>document.getElementById(id);
const node=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
let catalog;
function render(){
  const query=$('rule-search').value.trim().toLowerCase(),level=$('rule-level').value;
  const rows=catalog.entries.filter(row=>(level==='all'||(row.status==='SUPPORTED_BY_RUNTIME_TEST')===(level==='runtime'))&&JSON.stringify(row).toLowerCase().includes(query));
  $('rule-list').replaceChildren();$('rule-count').textContent=`${rows.length} of ${catalog.entries.length} researched rules. These are not completion counts.`;
  for(const row of rows){
    const section=document.createElement('section');section.className='trace';section.id=row.id;
    const title=node('h2',row.id),link=node('a','Link to this rule');link.href='#'+encodeURIComponent(row.id);
    section.append(title,link,node('p',row.claim),node('p','Evidence level: '+row.status.replaceAll('_',' ').toLowerCase()),node('p','Independent gameplay validation: '+(row.gameplayValidation===true?'recorded; inspect supporting scope':'not established')));
    if(row.scope)section.append(node('p','Checked scope: '+row.scope));
    if(row.limitations)section.append(node('p','Limitations: '+row.limitations));
    const details=document.createElement('details');details.append(node('summary','Source fingerprints and checks'));
    details.append(node('pre',JSON.stringify({sources:row.sources,checks:row.checks},null,2)));section.append(details);$('rule-list').append(section);
  }
}
try{
  const response=await fetch('rules.json',{cache:'no-store'});if(!response.ok)throw new Error('Unable to load rule evidence');catalog=await response.json();
  if(catalog.schemaVersion!==1||!Array.isArray(catalog.entries))throw new Error('Unsupported evidence catalog');
  $('rule-search').addEventListener('input',render);$('rule-level').addEventListener('change',render);render();
  if(location.hash){const id=decodeURIComponent(location.hash.slice(1));document.getElementById(id)?.scrollIntoView();}
}catch(error){$('error').textContent=error.message;}
