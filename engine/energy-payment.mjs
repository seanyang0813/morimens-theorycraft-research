// Actual property loss and action-reported cost are distinct original outputs.
export function consumeEnergy({energy,request}){
  if(!Number.isFinite(energy)||energy<0||energy>99||!Number.isFinite(request)||(request<0&&request!==-1))throw new Error('Explicit energy in 0..99 and nonnegative request or X sentinel required');
  const reportedCost=request===-1?energy:request,energyLost=Math.min(energy,reportedCost),energyAfter=energy-energyLost;
  return {status:'EXPERIMENTAL',reportedCost,energyAfter,energyLost,events:[
    {kind:'owner',property:'energy',old:energy,new:energyAfter},
    {kind:'send',property:'energy',delta:-energyLost,new:energyAfter},
    {kind:'event',castValue:reportedCost,realCost:reportedCost},
    {kind:'record',delta:-reportedCost,energyAfter}
  ],unresolvedDependencies:['Event callbacks described, not dispatched','Does not establish that a requested card play was legal','Independent gameplay validation']};
}
