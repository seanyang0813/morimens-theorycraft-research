import {compileNumericCommand} from './command-expressions.mjs';
import {initializeStateProperty} from './state-property-contribution.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const finite=value=>{if(!Number.isFinite(value))throw new Error('Finite Wheel property input required');return value;};
const ownerKeys=['atk','physique','physique_per'];
const directStateArg=/^StateArg[1-9]\d*$/;
const numericLiteral=/^-?(?:\d+(?:\.\d+)?|\.\d+)$/;
const physiqueScaling='StateArg1*StateOwner.physique*0.01*(1+StateOwner.physique_per/100)';
const attackScaling='math.ceil(StateOwner.atk*StateArg3*0.01)';

function normalizeValues(value,pattern,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`Explicit ${label} required`);
  const entries=Object.entries(value);
  if(entries.some(([key,item])=>!pattern.test(key)||!Number.isFinite(item)))throw new Error(`Named finite ${label} required`);
  return Object.fromEntries(entries);
}

function ownerValues(value){
  if(value===null)return null;
  if(!exact(value,ownerKeys)||ownerKeys.some(key=>!Number.isFinite(value[key])))throw new Error('Owner properties must be null or exact finite atk, physique and physique_per values');
  return {...value};
}

export function resolveWheelInitialProperties(input){
  const fields=['schemaVersion','kind','build','wheelId','stateArgs','ownerProperties','properties'];
  if(!exact(input,fields)||input.schemaVersion!==1||input.kind!=='morimens-wheel-initial-properties'||input.build!=='pc-res144-build51'||typeof input.wheelId!=='string'||!input.wheelId||!Array.isArray(input.properties)||input.properties.length<1)throw new Error('Exact resource-144 Wheel initial-property input required');
  const stateArgs=normalizeValues(input.stateArgs,/^StateArg[1-9]\d*$/,'StateArg values'),owner=ownerValues(input.ownerProperties);
  const seen=new Set();
  const contributions=input.properties.map(row=>{
    if(!exact(row,['property','expression'])||typeof row.property!=='string'||!row.property||typeof row.expression!=='string'||!row.expression)throw new Error('Exact property and expression rows required');
    if(seen.has(row.property))throw new Error('Duplicate initial Wheel property');
    seen.add(row.property);
    if(!directStateArg.test(row.expression)&&!numericLiteral.test(row.expression)&&row.expression!==physiqueScaling&&row.expression!==attackScaling)throw new Error('Unsupported Wheel initial-property expression');
    const evaluate=compileNumericCommand(row.expression,{allowedFunctions:['math.ceil']});
    const evaluated=evaluate(name=>{
      if(Object.hasOwn(stateArgs,name))return stateArgs[name];
      const match=/^StateOwner\.(atk|physique|physique_per)$/.exec(name);
      if(match&&owner)return owner[match[1]];
      throw new Error(`Missing or unsupported Wheel property variable ${name}`);
    },(name,args)=>{
      if(name==='math.ceil'&&args.length===1)return Math.ceil(args[0]);
      throw new Error(`Unsupported Wheel property function ${name}`);
    });
    if(evaluated.values.length!==1)throw new Error('One value per Wheel property expression required');
    const initialized=initializeStateProperty({property:row.property,expression:row.expression,evaluate:()=>finite(evaluated.values[0]),specialValue:null,skipInit:false});
    return {property:row.property,expression:row.expression,value:initialized.contribution.value,requestedDelta:initialized.requestedDelta,reads:evaluated.reads,calls:evaluated.calls,rounding:initialized.trace};
  });
  return {schemaVersion:1,kind:'morimens-wheel-initial-properties-result',analysisTrack:'mechanics',status:'SOURCE_BOUND_INITIAL_PROPERTY_CONTRIBUTIONS',build:input.build,wheelId:input.wheelId,stateArgs,ownerProperties:owner,contributions,propertyDeltas:Object.fromEntries(contributions.map(row=>[row.property,row.requestedDelta])),finalDamage:null,limitations:['Initial direct StateOwner property contributions only; no equipment legality, attachment timing, trigger execution, target routing, later state updates, stacking or gameplay execution','Expressions must stay within the observed numeric subset and all required StateArgs and owner properties must be explicit','This mechanics result is not a theorycraft recommendation, cheese, budget-scouting, gameplay-validation or holdout result']};
}
