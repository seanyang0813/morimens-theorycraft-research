export function startStates({runStateSequenceExperiment,syntheticStateSequenceExample,runtimeFingerprint},doc=document){
  const el=id=>doc.getElementById(id);
  let undoInput=null;
  function edit(index,action,renderedInput){
    try{
      const input=JSON.parse(el('state-input').value);
      if(JSON.stringify(input)!==renderedInput)throw new Error('Run your edited JSON before using step controls.');
      if(action==='earlier'&&index>0)[input.steps[index-1],input.steps[index]]=[input.steps[index],input.steps[index-1]];
      else if(action==='later'&&index<input.steps.length-1)[input.steps[index+1],input.steps[index]]=[input.steps[index],input.steps[index+1]];
      else if(action==='duplicate')input.steps.splice(index+1,0,JSON.parse(JSON.stringify(input.steps[index])));
      else if(action==='remove')input.steps.splice(index,1);
      else return;
      undoInput=el('state-input').value;el('undo').disabled=false;
      el('state-input').value=JSON.stringify(input,null,2);run();
    }catch(error){clear();el('error').textContent=error.message;}
  }
  function renderSteps(input){
    const renderedInput=JSON.stringify(input);el('step-list').replaceChildren();
    input.steps.forEach((step,index)=>{
      const item=doc.createElement('li'),label=doc.createElement('span'),controls=doc.createElement('div');controls.className='step-controls';
      label.textContent=`${index+1}. ${step.type==='attack'?`Attack (${step.rows.length} command rows)`:step.type==='removeState'?`Remove state ${step.definitionId}`:step.type==='applyState'?`Apply state ${step.definitionId}: ${step.request.layer??1} requested layers`:`Add state ${step.definitionId}: ${step.resolvedLayers} resolved layers`}`;
      for(const [action,title,disabled] of [['earlier','Move earlier',index===0],['later','Move later',index===input.steps.length-1],['duplicate','Duplicate',false],['remove','Remove step',false]]){
        const button=doc.createElement('button');button.type='button';button.className='secondary';button.textContent=title;button.disabled=disabled;button.onclick=()=>edit(index,action,renderedInput);controls.append(button);
      }
      item.append(label,controls);el('step-list').append(item);
    });
    el('step-editor').hidden=false;
  }
  function clear(){el('error').textContent='';el('results').hidden=true;el('rows').replaceChildren();el('dependencies').replaceChildren();el('result-json').textContent='';}
  function run(){
    clear();
    try{
      const input=JSON.parse(el('state-input').value),result=runStateSequenceExperiment(input);
      renderSteps(input);
      el('summary').textContent=`${result.completed?'Sequence completed':'Sequence stopped'} · Modeled HP lost: ${result.modeledHpLost} · HP remaining: ${result.targetAfter.hp}`;
      el('stop').textContent=result.stop?JSON.stringify(result.stop):'No stop within the stated experimental scope.';
      for(const row of result.trace){
        const values=row.type==='attack'?[row.index+1,'Attack',`${row.result.initialTarget.hp} → ${row.result.targetAfter.hp}`,`Modeled HP lost: ${row.result.modeledHpLost}`]:
          [row.index+1,`${row.type==='removeState'?'Remove state':'State'} ${row.definitionId}`,row.type==='removeState'?(row.removed?'Removed':'No live state'):row.state?`${row.state.layer} stacks`:'Not created',row.mutations.length?row.mutations.map(m=>`${m.owner}.${m.property}: ${m.callbacks[0]?.old??m.after} → ${m.after}`).join('; '):'No property mutation'];
        const tr=doc.createElement('tr');for(const value of values){const td=doc.createElement('td');td.textContent=String(value);tr.append(td);}el('rows').append(tr);
      }
      for(const item of result.unresolvedDependencies){const li=doc.createElement('li');li.textContent=item;el('dependencies').append(li);}
      el('result-json').textContent=JSON.stringify({runtimeFingerprint,input,result},null,2);el('results').hidden=false;
    }catch(error){el('step-editor').hidden=true;el('step-list').replaceChildren();el('error').textContent=error.message;}
  }
  el('run').onclick=run;
  el('example').onclick=()=>{undoInput=null;el('undo').disabled=true;el('state-input').value=JSON.stringify(syntheticStateSequenceExample(),null,2);run();};
  el('undo').onclick=()=>{if(undoInput===null)return;el('state-input').value=undoInput;undoInput=null;el('undo').disabled=true;run();};
  el('swap').onclick=()=>{
    try{const input=JSON.parse(el('state-input').value);if(!Array.isArray(input.steps)||input.steps.length<2)throw new Error('At least two steps required');edit(0,'later',JSON.stringify(input));}
    catch(error){clear();el('error').textContent=error.message;}
  };
}
