import {blockInputKeys,showBlock} from './show-block.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const modifierKeys=blockInputKeys.filter(key=>key!=='value');

export function storeBlock(input){
  if(!exact(input,['request','block','maxHp','blockMaxPer','ignoreMax'])||!Number.isFinite(input.request)||input.request<0||!Number.isFinite(input.block)||input.block<0||!Number.isFinite(input.maxHp)||input.maxHp<0||!Number.isFinite(input.blockMaxPer)||typeof input.ignoreMax!=='boolean')throw new Error('Explicit Block storage inputs required');
  const maxBlock=Math.floor(input.maxHp*(1+input.blockMaxPer/100)+0.5);
  const available=Math.max(0,maxBlock-input.block);
  const actualBlockGained=input.ignoreMax?input.request:Math.min(input.request,available);
  return {maxBlock,available,actualBlockGained,blockAfter:input.block+actualBlockGained};
}

// Resolved BEGainBlock numerical path: show formula, recipient modifiers and
// BattlePropertyServer block cap. Events and optional state descendants remain external.
export function calculateBlockGain(input){
  if(!exact(input,['base','modifiers','target','storage'])||!Number.isFinite(input.base)||!exact(input.modifiers,modifierKeys)||!Object.values(input.modifiers).every(Number.isFinite)||
    !exact(input.target,['gainBlockPer','gainBlockPlus'])||!Object.values(input.target).every(Number.isFinite)||
    !exact(input.storage,['block','maxHp','blockMaxPer','ignoreMax'])||!Number.isFinite(input.storage.block)||input.storage.block<0||!Number.isFinite(input.storage.maxHp)||input.storage.maxHp<0||!Number.isFinite(input.storage.blockMaxPer)||typeof input.storage.ignoreMax!=='boolean')throw new Error('Explicit resolved block calculation and storage inputs required');
  const formula=showBlock({value:input.base,...input.modifiers});
  const targetRaw=formula.showBlock*(1+input.target.gainBlockPer/100)+input.target.gainBlockPlus;
  const requestedBlock=Math.max(Math.ceil(targetRaw),1);
  const {maxBlock,available,actualBlockGained,blockAfter}=storeBlock({request:requestedBlock,...input.storage});
  if(![targetRaw,requestedBlock,maxBlock,available,actualBlockGained,blockAfter].every(Number.isFinite))throw new Error('Nonfinite block result');
  return {status:'EXPERIMENTAL',finalDamage:null,formula,targetRaw,requestedBlock,maxBlock,available,actualBlockGained,blockAfter,
    trace:[...formula.trace,{stage:'recipient gain modifiers before ceil',value:targetRaw},{stage:'requested Block, minimum 1',value:requestedBlock},{stage:'maximum Block',value:maxBlock},{stage:input.storage.ignoreMax?'uncapped storage':'capped storage',value:blockAfter}],
    evidence:['PC144:ShowBlockFormula','PC144:FinalBlock','PC144:BlockStorage'],
    unresolvedDependencies:['Automatic command, caster/card/tag and property assembly','Effect repetition, optional state descendants, property-change listeners and Block events','Independent gameplay validation']};
}
