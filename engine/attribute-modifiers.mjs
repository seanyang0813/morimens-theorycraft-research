// Original client display helpers; callers must resolve modifier provenance separately.
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51']);
export function calculateAttributeModifier({build,base,increase,breakRate=null,method}){
  if(!supportedBuilds.has(build))throw new Error('Unsupported build');
  if(!['GetAwakerFinalAttr','GetAwakerPhysique'].includes(method))throw new Error('Unsupported attribute helper');
  if(typeof base!=='number'||!Number.isFinite(base))throw new Error('Finite base required');
  if(increase!==null&&(typeof increase!=='number'||!Number.isFinite(increase)))throw new Error('Explicit fractional increase or null required');
  if(method==='GetAwakerPhysique'&&increase!==null&&(typeof breakRate!=='number'||!Number.isFinite(breakRate)))throw new Error('Explicit physique break rate required');
  const bypass=increase===null;
  const multiplied=bypass?base:base*(1+increase);
  const raw=bypass?base:method==='GetAwakerPhysique'?multiplied*breakRate:multiplied;
  const value=bypass?base:Math.ceil(raw);
  if(!Number.isFinite(value))throw new Error('Attribute result overflow');
  return {status:'EXPERIMENTAL',build,value,finalDamage:null,trace:{base,increase,breakRate,method,bypass,multiplied,raw,rounding:bypass?'none':'ceil without epsilon',value},
    unresolvedDependencies:['Origin and activation of the supplied modifiers','Final battle property assembly','Independent gameplay validation']};
}
