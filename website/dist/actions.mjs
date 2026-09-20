export function startActions({runCardActionTimeline,syntheticCardActionExample,runDamageEnergyCommand,syntheticDamageEnergyExample,runtimeFingerprint},doc=document){
  const el=id=>doc.getElementById(id);
  function run(){
    el('error').textContent='';el('results').hidden=true;el('rows').replaceChildren();el('result-json').textContent='';el('dependencies').replaceChildren();
    try{
      const input=JSON.parse(el('action-input').value),mixed=input.kind==='morimens-damage-energy-command';
      const result=mixed?runDamageEnergyCommand(input):runCardActionTimeline(input);
      el('energy-heading').textContent=mixed?'Ultimate energy':'Card energy';
      if(mixed){
        if(result.status==='UNSUPPORTED_COMMAND'){
          el('summary').textContent='Unsupported command: no calculation performed.';el('stop').textContent='Every row must be supported before the command can run.';
          for(const row of result.support.rows){const tr=doc.createElement('tr');for(const text of [row.id,'—','—','—',row.blockers.map(b=>b.code+(b.field?': '+b.field:b.value?': '+b.value:'')).join('; ')||'Supported row']){const td=doc.createElement('td');td.textContent=text;tr.append(td);}el('rows').append(tr);}
        }else{
          el('summary').textContent=`${result.completed?'Command completed':'Command stopped'} · Modeled HP lost: ${result.modeledHpLost} · Ultimate energy: ${result.casterEnergyAfter}`;
          el('stop').textContent=result.stop?JSON.stringify(result.stop):'No stop within this supported scope.';
          let energy=input.energy.target.energy,target={...input.attackBase.targetState};
          for(const action of result.actions){
            const beforeEnergy=energy,beforeTarget=target;
            if(action.type==='damage')target=action.result.targetAfter;else energy=action.result.targetsAfter[0].energy;
            const tr=doc.createElement('tr');for(const text of [action.rowId,`${beforeEnergy} → ${energy}`,`${beforeTarget.hp} → ${target.hp}`,`${beforeTarget.block} → ${target.block}`,action.type==='energy'?'Energy gain':action.result.completed?'Damage':'Partial damage']){const td=doc.createElement('td');td.textContent=text;tr.append(td);}el('rows').append(tr);
          }
        }
      }else{
      el('summary').textContent=`${result.completed?'Sequence completed':'Sequence stopped'} Â· Modeled HP lost: ${result.modeledHpLost} Â· Energy left: ${result.energyAfter} Â· Accepted actions: ${result.acceptedActions}`;
      el('stop').textContent=result.stop?JSON.stringify(result.stop):'No stop within this supported scope.';
      for(const row of result.trace){
        const tr=doc.createElement('tr'),after=row.after;
        const outcome=!row.resources.check.allowed?'Rejected: '+row.resources.check.gate:(row.command??row.hits)?.completed?'Executed':'Partial effects';
        for(const text of [row.actionId,`${row.before.energy} â†’ ${after.energy}`,`${row.before.target.hp} â†’ ${after.target.hp}`,`${row.before.target.block} â†’ ${after.target.block}`,outcome]){const td=doc.createElement('td');td.textContent=text;tr.append(td);}
        el('rows').append(tr);
      }
      }
      for(const item of result.unresolvedDependencies??result.support?.limitations??[]){const li=doc.createElement('li');li.textContent=item;el('dependencies').append(li);}
      el('result-json').textContent=JSON.stringify({runtimeFingerprint,input,result},null,2);el('results').hidden=false;
    }catch(error){el('error').textContent=error.message;}
  }
  el('run').onclick=run;
  el('example').onclick=()=>{el('action-input').value=JSON.stringify(syntheticCardActionExample(),null,2);run();};
  el('mixed-example').onclick=()=>{el('action-input').value=JSON.stringify(syntheticDamageEnergyExample(),null,2);run();};
  el('reverse').onclick=()=>{
    try{const input=JSON.parse(el('action-input').value);if(input.kind==='morimens-damage-energy-command'){const rows=Object.values(input.command.data_list).reverse();input.command.data_list=Object.fromEntries(rows.map((row,i)=>[String(i+1),row]));}else{if(!Array.isArray(input.steps))throw new Error('Action steps required');input.steps.reverse();}el('action-input').value=JSON.stringify(input,null,2);run();}
    catch(error){el('results').hidden=true;el('result-json').textContent='';el('error').textContent=error.message;}
  };
}
