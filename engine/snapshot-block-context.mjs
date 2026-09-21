import {blockInputKeys} from './show-block.mjs';

const instructionTags=new Set(['Card_Strike','Card_Skill','Card_Defend','Card_Extend']);
const outsideTagProperties={Card_Defend:['block_per_defendcard'],Card_Skill:['block_per_skillcard'],Ulti_Skill:['block_per_ulti','o_block_per_ulti']};
const insideTagProperties={Card_Defend:'i_block_per_defendcard',Card_Skill:'i_block_per_skillcard',Ulti_Skill:'i_block_per_ulti'};

// Ordinary Camp1 PvE Awakener/card branch of BattleCmdServer.__GetShowBlock.
// Keeper skills, PvP, OnlyIncludeTarget and state-trigger additions are excluded.
export function deriveSnapshotBlockInput({skillTags,casterProperties,playerProperties,cardProperties,targetProperties,skillArgsPlus=0}){
  if(!Array.isArray(skillTags)||skillTags.some(tag=>typeof tag!=='string')||!Number.isFinite(skillArgsPlus))throw new Error('Explicit Block skill tags and ParaPlus required');
  for(const [name,value] of Object.entries({casterProperties,playerProperties,cardProperties,targetProperties}))if(!value||typeof value!=='object'||Array.isArray(value)||Object.values(value).some(item=>!Number.isFinite(item)))throw new Error(`Complete finite ${name} required`);
  const reads=[];
  const read=(owner,property)=>{const maps={caster:casterProperties,player:playerProperties,card:cardProperties,target:targetProperties},values=maps[owner],present=Object.hasOwn(values,property),value=present?values[property]:0;reads.push({owner,property,present,value});return value;};
  const instructionCard=skillTags.some(tag=>instructionTags.has(tag));
  let skillTypeBlockPer=1,skillTypeInsideBlockPer=1;
  const tagFactors=[];
  for(const tag of skillTags){
    for(const property of outsideTagProperties[tag]??[]){const percent=read('caster',property);skillTypeBlockPer*=1+percent/100;tagFactors.push({tag,bucket:'outside',property,percent});}
    const insideProperty=insideTagProperties[tag];if(insideProperty){const percent=read('caster',insideProperty);skillTypeInsideBlockPer*=1+percent/100;tagFactors.push({tag,bucket:'inside',property:insideProperty,percent});}
  }
  const modifiers={
    awakerOutsideBlockPer:read('caster','o_block_per'),playerOutsideBlockPer:0,curCardBlockPer:read('card','card_block_per'),cardBlockPer:instructionCard?read('caster','block_per_card'):0,ultiBlockPer:0,skillTypeBlockPer,
    awakerBlockPlus:read('player','block_plus')+read('caster','block_plus'),cardBlockPlus:read('card','card_block_plus'),skillArgsPlus,
    awakerFrailPer:read('player','frail_per'),awakerInsideBlockPer:read('caster','i_block_per'),playerInsideBlockPer:0,instructcardFinalBlockPer:instructionCard?read('caster','instructcard_final_block_per'):0,dimension_fix_per:read('player','dimension_fix_per'),skillTypeInsideBlockPer,
    cardBlockPer2:read('card','card_block_per2'),card_block_per2_n2:instructionCard?read('caster','card_block_per2_n2'):0,awaker_CmdCard_block_per:instructionCard?read('caster','awaker_CmdCard_block_per'):0,awaker_ulti_block_per:skillTags.includes('Ulti_Skill')?read('caster','awaker_ulti_block_per'):0,
    spellboundBlockPer:read('caster','spellbound_block_per'),spellboundBlockPer2:read('caster','spellbound_block_per2'),spellboundBlockPer3:read('caster','spellbound_block_per3'),spellboundBlockPer4:read('caster','spellbound_block_per4'),spellboundBlockPer5:read('caster','spellbound_block_per5'),
    keeperskill_def_per:0,is_chaos_type2:0,
  };
  if(Object.keys(modifiers).length!==blockInputKeys.length-1)throw new Error('Internal Block property mapping drift');
  const target={gainBlockPer:read('target','gain_block_per'),gainBlockPlus:read('target','gain_block_plus')};
  const storage={block:read('target','block'),maxHp:read('target','max_hp'),blockMaxPer:read('target','block_max_per'),ignoreMax:false};
  return {source:'ordinary Camp1 PvE Awakener/card GetRealBlock property ownership',instructionCard,tagFactors,reads,modifiers,target,storage};
}
