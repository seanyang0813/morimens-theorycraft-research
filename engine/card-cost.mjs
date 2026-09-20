// Resolved modifier boundary: this does not decide whether a card can be played.
export function resolveCardCost(v){
  const keys=['cfgCost','energy','originCost','delta','harmonize','fixedSwitches','keeper','keeperCost','pvp'];
  if(!v||keys.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!keys.includes(k))||['energy','originCost','delta','harmonize'].some(k=>!Number.isFinite(v[k]))||v.energy<0||typeof v.keeper!=='boolean'||typeof v.pvp!=='boolean'||!(v.keeperCost===null||Number.isFinite(v.keeperCost))||!(v.cfgCost===null||typeof v.cfgCost==='string'||Number.isFinite(v.cfgCost))||!v.fixedSwitches||Array.isArray(v.fixedSwitches)||Object.entries(v.fixedSwitches).some(([k,x])=>!/^card_fixed_cost[0-5]$/.test(k)||!Number.isFinite(x)))throw new Error('Explicit resolved card cost inputs required');
  const match=typeof v.cfgCost==='string'?/^X([0-9]+)$/.exec(v.cfgCost):null;
  const variable=v.cfgCost==='X'||match!==null;
  if(match&&!Number.isSafeInteger(Number(match[1])))throw new Error('Variable cost limit outside supported integer range');
  const fixed=variable?null:[0,1,2,3,4,5].find(n=>v.fixedSwitches['card_fixed_cost'+n]>0)??null;
  const baseCost=v.keeper?(v.keeperCost??0):fixed!==null?fixed:v.cfgCost===null?0:variable?-1:Math.max(0,v.originCost+v.delta);
  const useCost=v.keeper?(v.keeperCost??0):v.pvp&&v.cfgCost===null&&fixed===null?0:baseCost===-1?-1:Math.max(0,baseCost+v.harmonize);
  const variableConsumeCost=v.cfgCost==='X'?v.energy:match?Math.min(Number(match[1]),v.energy):null;
  return {status:'EXPERIMENTAL',baseCost,useCost,variableConsumeCost,fixedCost:fixed,
    trace:{keeperOverride:v.keeper,variable,originCost:v.originCost,delta:v.delta,harmonize:v.harmonize},
    unresolvedDependencies:['Cost modifiers and card type/progression supplied','Payment, energy changes, hand/target/turn legality and forced-play rules not evaluated','Independent gameplay validation']};
}
