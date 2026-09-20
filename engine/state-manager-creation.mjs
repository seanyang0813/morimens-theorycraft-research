const ports=['construct','merge','afterInit','serialize','record','changeUniqueRole','queueOnAdd','recordStats'];
// Synchronous manager routing. Hooks must execute or schedule their real work;
// this function alone does not constitute a complete state implementation.
export function createManagedState({target,createArgs,registry,deathHandling,teamUnique,hooks}){
  if(!target||!Number.isSafeInteger(target.uid)||!['Awaker','Player','Monster','Card','Invalid'].includes(target.role)||typeof target.dead!=='boolean')throw new Error('Explicit target role/death required');
  if(!createArgs||!Number.isSafeInteger(createArgs.stateId)||!(createArgs.layer===null||Number.isFinite(createArgs.layer))||typeof createArgs.skipOnAdd!=='boolean')throw new Error('Explicit creation arguments required');
  if(!(registry instanceof Map)||!['Wipe','NonWipe_ProhibitTrigger','NonWipe_AllowTrigger'].includes(deathHandling)||typeof teamUnique!=='boolean'||!hooks||ports.some(p=>typeof hooks[p]!=='function'))throw new Error('Explicit registry, death handling and lifecycle hooks required');
  for(const list of registry.values())if(!Array.isArray(list)||list.some(s=>!s||!Number.isSafeInteger(s.uid)||!Number.isSafeInteger(s.stateId)||typeof s.isDeleted!=='boolean'))throw new Error('Explicit registered state identities/deletion flags required');
  const trace=[];
  if(target.role==='Invalid')return {state:null,trace:['invalidTarget']};
  createArgs.stateType=target.role==='Card'?'Card':target.role==='Awaker'?'Awaker':'Role';
  if(target.role!=='Card'&&target.dead&&deathHandling==='Wipe')return {state:null,trace:['deadRejected']};
  if(createArgs.layer!==null&&createArgs.layer<=0)return {state:null,trace:['emptyRejected']};
  if(!registry.has(target.uid))registry.set(target.uid,[]);
  const list=registry.get(target.uid);
  let state=list.find(s=>!s.isDeleted&&s.stateId===createArgs.stateId);
  if(state){trace.push('merge');hooks.merge(state,createArgs);}
  else{
    trace.push('construct');state=hooks.construct(target,createArgs);
    if(!state||!Number.isSafeInteger(state.uid)||state.stateId!==createArgs.stateId||typeof state.isDeleted!=='boolean')throw new Error('Constructor must return a valid state instance');
    list.push(state);trace.push('debug','afterInit');hooks.afterInit(state);
    trace.push('serialize');const serialized=hooks.serialize(state);
    const card=target.role==='Card';trace.push(card?'recordCard':'recordRole');hooks.record(serialized,card);
    if(teamUnique){trace.push('unique');hooks.changeUniqueRole(target,state);}
  }
  if(!createArgs.skipOnAdd){trace.push('onAdd');hooks.queueOnAdd({createArgs,stateUid:state.uid});trace.push('stats');hooks.recordStats(state,createArgs);}
  return {state,trace};
}
