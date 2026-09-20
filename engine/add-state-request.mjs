// Scoped PC144 DoEffect -> AddState request boundary; does not create a state.
export function planAddStateRequest({layer=null,immune,calculateLayer,limitLayer=null,limitTotalLayer=null}) {
  if(layer!==null&&!Number.isFinite(layer))throw new Error('Layer must be finite or null');
  if(typeof immune!=='boolean'||typeof calculateLayer!=='function')throw new Error('Explicit immunity and layer calculation required');
  for(const limit of [limitLayer,limitTotalLayer])if(limit!==null&&typeof limit!=='function')throw new Error('Limit must be an explicit callback or null');
  const events=[],createdLayers=[];
  const finish=()=>({createdLayers,events,returned:true});
  const requested=Math.ceil(layer??1);
  if(requested<=0)return finish();
  events.push({stage:'immunity'});
  if(immune)return finish();
  events.push({stage:'calculate',input:requested});
  const calculated=calculateLayer(requested);
  if(!Number.isFinite(calculated))throw new Error('Calculated layer must be finite');
  let next=Math.max(0,calculated);
  for(const [stage,limit] of [['CalcStateLayerLimit',limitLayer],['CalcStateLayerLimitTotal',limitTotalLayer]]) {
    if(limit===null)continue;
    events.push({stage,input:calculated});
    // Both original callbacks receive calculated, not the preceding limit result.
    next=limit(calculated);
    if(!Number.isFinite(next))throw new Error('Layer limit result must be finite');
    if(calculated>0&&next<=0){events.push({stage:'tip'});return finish();}
  }
  events.push({stage:'create'});
  createdLayers.push(next);
  return finish();
}
