// Branch planning only. ConsumeEnergy and later event effects are not executed.
export function planCardPayment(v){
  const keys=['cfgCost','cost','energy','forceMode','attached','allowIgnoreCost','energyEnough'];
  if(!v||keys.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!keys.includes(k))||!Number.isFinite(v.cost)||v.cost< -1||!Number.isFinite(v.energy)||v.energy<0||![null,1,2,3].includes(v.forceMode)||['attached','allowIgnoreCost','energyEnough'].some(k=>typeof v[k]!=='boolean')||!(v.cfgCost===null||typeof v.cfgCost==='string'||Number.isFinite(v.cfgCost)))throw new Error('Explicit supported payment inputs required');
  const match=typeof v.cfgCost==='string'?/^X([0-9]+)$/.exec(v.cfgCost):null,variable=v.cfgCost==='X'||match!==null;
  if(match&&!Number.isSafeInteger(Number(match[1])))throw new Error('Unsupported variable cost limit');
  const resolved=()=>v.cfgCost==='X'?v.energy:Math.min(Number(match[1]),v.energy);
  let branch,consumeRequest=null,ignoreCost=null;
  if(v.attached){branch='attach_post';ignoreCost=1;}
  else if(v.forceMode!==null&&variable){branch='force_x_variable_cost';consumeRequest=resolved();}
  else if(v.forceMode===1){branch='force_free';ignoreCost=1;}
  else if(v.forceMode===2){branch='force_partial';consumeRequest=variable?resolved():Math.min(v.energy,v.cost);}
  else if(!v.energyEnough&&v.allowIgnoreCost){branch='allow_ignore_cost';ignoreCost=1;}
  else{branch='normal';consumeRequest=variable?resolved():v.cost;}
  return {status:'EXPERIMENTAL',branch,consumeRequest,ignoreCost,forceModeCleared:true,energyAfter:null,
    unresolvedDependencies:['EnergyEnough decision supplied','Energy payment, events and card-use legality not executed','Independent gameplay validation']};
}
