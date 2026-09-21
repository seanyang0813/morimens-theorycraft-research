export function startActions({runCardActionTimeline,syntheticCardActionExample,runDamageEnergyCommand,runTerminalStateCommand,runOrderedStateCommand,syntheticDamageEnergyExample,runtimeFingerprint},doc=document){
  const el=id=>doc.getElementById(id);
  function run(){
    el('error').textContent='';el('results').hidden=true;el('rows').replaceChildren();el('result-json').textContent='';el('dependencies').replaceChildren();
    try{
      const input=JSON.parse(el('action-input').value),mixed=input.kind==='morimens-damage-energy-command',terminal=input.kind==='morimens-terminal-state-command',ordered=input.kind==='morimens-ordered-state-command',command=mixed||terminal||ordered;
      const result=ordered?runOrderedStateCommand(input):terminal?runTerminalStateCommand(input):mixed?runDamageEnergyCommand(input):runCardActionTimeline(input);
      el('energy-heading').textContent=ordered?'Energy':command?'Ultimate energy':'Card energy';
      if(command){
        if(ordered){
          const stateRows=result.rowPlan.filter(row=>row.type==='applyState');
          el('summary').textContent=`${result.completed?'Command completed':'Command stopped'} · Modeled HP lost: ${result.modeledHpLost}${result.casterEnergyAfter==null?'':` · Ultimate energy: ${result.casterEnergyAfter}`}${result.actorBlockAfter==null?'':` · Caster Block: ${result.actorBlockAfter}`}${result.actorHpAfter==null?'':` · Caster HP: ${result.actorHpAfter}`} · States ${stateRows.map(row=>`${row.evaluation.values[0]} +${row.evaluation.values[1]??1}`).join(', ')}`;
          el('stop').textContent=result.stop?JSON.stringify(result.stop):'No stop within this supported scope.';
          let target={...input.attackBase.targetState},energy=input.energy?.target?.energy??null;
          for(const [index,entry] of result.calculation.trace.entries()){
            const plan=result.rowPlan[index],before={...target};
            if(['attack','passiveAttack','effectAttack'].includes(entry.type))target={...entry.result.targetAfter};
            if(entry.type==='gainBlock'&&entry.owner==='target')target={...target,block:entry.result.blockAfter};
            if(entry.type==='heal'&&entry.owner==='target')target={...target,hp:entry.result.hpAfter};
            const beforeEnergy=energy;if(entry.type==='gainUltiEnergy')energy=entry.result.targetsAfter[0].energy;
            const stateId=plan.evaluation?.values[0],layer=plan.evaluation?.values[1]??1;
            const outcome=entry.type==='attack'?(entry.result.completed?'Active damage':'Partial Active damage'):entry.type==='passiveAttack'?(entry.result.completed?'Passive damage':'Partial Passive damage'):entry.type==='effectAttack'?(entry.result.completed?`${entry.category} damage`:`Partial ${entry.category} damage`):entry.type==='gainUltiEnergy'?'Energy gain':entry.type==='gainBlock'?`${entry.owner==='actor'?'Caster':'Target'} Block +${entry.result.actualBlockGained}`:entry.type==='heal'?entry.result.skipped?`${entry.owner==='actor'?'Caster':'Target'} Heal skipped`:`${entry.owner==='actor'?'Caster':'Target'} Heal ${entry.result.realHeal>=0?'+':''}${entry.result.realHeal}`:entry.type==='removeState'?`State ${stateId} removed`:entry.type==='subtractState'?`State ${stateId} subtract ${layer}`:`State ${stateId} requested at layer ${layer}`;
            const tr=doc.createElement('tr');for(const text of [plan.rowId,energy===null?'—':`${beforeEnergy} → ${energy}`,`${before.hp} → ${target.hp}`,`${before.block} → ${target.block}`,outcome]){const td=doc.createElement('td');td.textContent=text;tr.append(td);}el('rows').append(tr);
          }
        }else{
        const executed=terminal?result.prefix:result;
        if(result.status==='UNSUPPORTED_COMMAND'){
          el('summary').textContent='Unsupported command: no calculation performed.';el('stop').textContent='Every row must be supported before the command can run.';
          for(const row of (result.support??executed?.support)?.rows??[]){const tr=doc.createElement('tr');for(const text of [row.id,'—','—','—',row.blockers.map(b=>b.code+(b.field?': '+b.field:b.value?': '+b.value:'')).join('; ')||'Supported row']){const td=doc.createElement('td');td.textContent=text;tr.append(td);}el('rows').append(tr);}
        }else{
          const appliedRows=terminal&&result.stateApplication?(result.terminalRows??[result.terminalRow]).filter(Boolean):[];
          const stateSummary=appliedRows.length?` · States ${appliedRows.map(row=>`${row.evaluation.values[0]} +${row.evaluation.values[1]}`).join(', ')}`:'';
          el('summary').textContent=`${result.completed?'Command completed':'Command stopped'} · Modeled HP lost: ${result.modeledHpLost} · Ultimate energy: ${result.casterEnergyAfter}${stateSummary}`;
          el('stop').textContent=result.stop?JSON.stringify(result.stop):'No stop within this supported scope.';
          let energy=input.energy.target.energy,target={...input.attackBase.targetState};
          for(const action of executed?.actions??[]){
            const beforeEnergy=energy,beforeTarget=target;
            if(action.type==='damage')target=action.result.targetAfter;else energy=action.result.targetsAfter[0].energy;
            const tr=doc.createElement('tr');for(const text of [action.rowId,`${beforeEnergy} → ${energy}`,`${beforeTarget.hp} → ${target.hp}`,`${beforeTarget.block} → ${target.block}`,action.type==='energy'?'Energy gain':action.result.completed?'Damage':'Partial damage']){const td=doc.createElement('td');td.textContent=text;tr.append(td);}el('rows').append(tr);
          }
          for(const row of appliedRows){const tr=doc.createElement('tr');for(const text of [row.id,`${energy} → ${energy}`,`${target.hp} → ${target.hp}`,`${target.block} → ${target.block}`,`State ${row.evaluation.values[0]} requested at layer ${row.evaluation.values[1]}`]){const td=doc.createElement('td');td.textContent=text;tr.append(td);}el('rows').append(tr);}
        }
        }
      }else{
      el('summary').textContent=`${result.completed?'Sequence completed':'Sequence stopped'} | Modeled HP lost: ${result.modeledHpLost} | Energy left: ${result.energyAfter} | Accepted actions: ${result.acceptedActions}`;
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
    try{const input=JSON.parse(el('action-input').value);if(['morimens-damage-energy-command','morimens-terminal-state-command','morimens-ordered-state-command'].includes(input.kind)){const rows=Object.values(input.command.data_list).reverse();input.command.data_list=Object.fromEntries(rows.map((row,i)=>[String(i+1),row]));}else{if(!Array.isArray(input.steps))throw new Error('Action steps required');input.steps.reverse();}el('action-input').value=JSON.stringify(input,null,2);run();}
    catch(error){el('results').hidden=true;el('result-json').textContent='';el('error').textContent=error.message;}
  };
}
