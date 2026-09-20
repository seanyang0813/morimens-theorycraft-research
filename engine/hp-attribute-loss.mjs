import {subtractOrdinaryHp} from './hp-property.mjs';

// Non-card BEChangeAttr HP loss only. Event records do not execute listeners.
export function resolveHpAttributeLoss(input){
  const keys=['hp','rawValue','immunity','limit'];
  if(!input||keys.some(key=>!Number.isFinite(input[key]))||Object.keys(input).some(key=>!keys.includes(key))||input.hp<0||input.rawValue>0||input.immunity<0||input.limit<0)throw new Error('Explicit HP, nonpositive raw change, immunity and limit required');
  const result={hpAfter:input.hp,propertyCallbacks:[],events:[],deathChecks:0};
  if(input.hp===0)return {status:'EXPERIMENTAL',finalDamage:null,result,evidence:['PC144:HpAttributeLoss']};
  let value=Math.ceil(input.rawValue);
  if(value<0&&input.immunity>0)value=0;
  else if(value<0&&input.limit>0)value=-Math.min(-value,input.limit);
  if(value===0)value=0;
  if(value<0){const change=subtractOrdinaryHp({hp:input.hp,request:-value});result.hpAfter=change.hpAfter;result.propertyCallbacks=change.callbacks;}
  const event={castValue:value,deltaValue:result.hpAfter-input.hp,overflowValue:0};
  if(event.deltaValue<0)result.events.push({name:'HpDown',...event});
  result.events.push({name:'BEChangeAttrHp',...event});result.deathChecks=1;
  return {status:'EXPERIMENTAL',finalDamage:null,result,evidence:['PC144:HpAttributeLoss']};
}
