// Ordinary HP subtraction only; callback descriptors do not execute listeners.
export function subtractOrdinaryHp({hp,request}){
  if(!Number.isFinite(hp)||!Number.isFinite(request)||hp<0||request<0)throw new Error('Explicit finite nonnegative HP and request required');
  const amount=Math.min(hp,request),hpAfter=hp-amount;
  return {hpAfter,hpLost:hp-hpAfter,callbacks:[
    {kind:'owner',property:'hp',old:hp,new:hpAfter},
    {kind:'send',property:'hp',delta:-amount,new:hpAfter}
  ]};
}
