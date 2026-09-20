// Original Awaker gain policy plus numeric property storage; callbacks are reported only.
export function gainUltiEnergy({energy,request,maximumProperties,ignoreMax,castValue=null}){
  const keys=['ulti_energy_max','ulti_energy_cost_per','ulti_energy_cost_flat','ulti_energy_max_per'];
  if(!Number.isFinite(energy)||energy<0||!Number.isFinite(request)||(castValue!==null&&!Number.isFinite(castValue))||typeof ignoreMax!=='boolean'||!maximumProperties||keys.some(k=>!Object.hasOwn(maximumProperties,k)||!Number.isFinite(maximumProperties[k])))throw new Error('Explicit energy, request, maximum properties and ignoreMax required');
  const p=maximumProperties;
  const maximum=Math.floor((p.ulti_energy_max*(1+p.ulti_energy_cost_per/100)+p.ulti_energy_cost_flat)*(1+p.ulti_energy_max_per/100)+0.5);
  const candidate=Math.floor(energy+request)>maximum?maximum-energy:request;
  const addition=Math.ceil(candidate);
  if(addition<=0)return {returned:0,energyAfter:energy,energyGained:0,maximum,castValue,events:[]};
  let delta=addition;
  if(!ignoreMax&&energy+delta>maximum)delta=Math.max(0,maximum-energy);
  const after=energy+delta;
  if(!Number.isFinite(after)||!Number.isFinite(maximum))throw new Error('Nonfinite energy result');
  return {returned:after,energyAfter:after,energyGained:delta,maximum,castValue:castValue??addition,events:[
    {kind:'owner',property:'ulti_energy',old:energy,new:after},
    {kind:'send',property:'ulti_energy',delta,new:after}
  ]};
}
