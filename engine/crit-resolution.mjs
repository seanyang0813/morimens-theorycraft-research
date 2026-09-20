const supportedTags=['Card_Strike','Card_Skill','Ulti_Skill','Card_AttachPost'];
const tagCrit={Card_Strike:'crit_per_from_strikecard',Ulti_Skill:'crit_per_from_ulti'};

const validateMap=(value,label)=>{
  if(!value||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||Object.entries(value).some(([key,item])=>['__proto__','constructor','prototype'].includes(key)||!Number.isFinite(item)))throw new Error(`${label} must be a finite numeric property map`);
};

// Translation of BattleCmdServer:CalcCrit and its two certain-crit helpers.
// Missing properties match GetProperty's zero default in the captured battle maps.
export function resolveCriticalHit(value){
  if(!value||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)throw new Error('Explicit critical-hit context required');
  const keys=['tags','cardPresent','casterIsAwaker','casterProperties','playerProperties','targetProperties','cardProperties','roll'];
  if(Object.keys(value).length!==keys.length||!keys.every(key=>Object.hasOwn(value,key)))throw new Error('Exact critical-hit context required');
  if(!Array.isArray(value.tags)||value.tags.some(tag=>!supportedTags.includes(tag))||new Set(value.tags).size!==value.tags.length)throw new Error('Unique supported skill tags required');
  if(typeof value.cardPresent!=='boolean'||typeof value.casterIsAwaker!=='boolean')throw new Error('Explicit card and caster type flags required');
  for(const [label,map] of [['Caster',value.casterProperties],['Player',value.playerProperties],['Target',value.targetProperties],['Card',value.cardProperties]])validateMap(map,label);
  if(!value.cardPresent&&Object.keys(value.cardProperties).length)throw new Error('Card properties require a present card');
  if(value.roll!==null&&(!Number.isInteger(value.roll)||value.roll<1||value.roll>100))throw new Error('Critical roll must be null or an integer from 1 to 100');
  const trace=[];
  const read=(owner,property)=>{const map=value[`${owner}Properties`],present=Object.hasOwn(map,property),result=present?map[property]:0;trace.push({owner,property,present,value:result});return result;};
  const certain=(reason)=>({status:'RESOLVED',isCrit:true,deterministic:true,reason,critChanceCeil:null,roll:null,rngConsumed:false,trace});

  if(value.cardPresent){
    if(read('target','block')>0&&read('card','card_crit2block')>0)return certain('card_crit2block');
    if(read('card','card_certain_crit')>0)return certain('card_certain_crit');
  }
  if(value.casterIsAwaker){
    if(read('caster','certain_crit')>0)return certain('caster_certain_crit');
    if(value.tags.includes('Card_Strike')&&read('caster','crit_from_strikecard')>0)return certain('crit_from_strikecard');
    if(read('target','block')>0&&read('caster','crit2block')>0)return certain('crit2block');
    const maxHp=read('target','max_hp'),hp=read('target','hp');
    if(maxHp<=0)throw new Error('Awakener critical resolution requires positive target max_hp');
    const hpRatio=hp/maxHp,gt=read('caster','crit2gt_hp_per');
    if(gt>0&&gt<hpRatio)return certain('crit2gt_hp_per');
    const lt=read('caster','crit2lt_hp_per');
    if(lt>0&&lt>hpRatio)return certain('crit2lt_hp_per');
  }
  if(read('player','certain_crit')>0)return certain('player_certain_crit');

  let chance=value.cardPresent?read('card','crit'):0;
  chance+=read('caster','crit');
  if(value.casterIsAwaker){
    chance+=read('player','crit');
    if(value.cardPresent)chance+=read('caster','card_crit');
  }
  for(const tag of value.tags)if(tagCrit[tag])chance+=read('caster',tagCrit[tag]);
  chance=chance*(100+read('caster','crit_per'))/100-read('target','anti_crit');
  const critChanceCeil=Math.ceil(chance);
  if(value.roll===null&&critChanceCeil>0&&critChanceCeil<100)return {status:'RNG_REQUIRED',isCrit:null,deterministic:false,reason:'random_roll_required',critChanceCeil,roll:null,rngConsumed:true,trace};
  const roll=value.roll??(critChanceCeil>=100?100:1);
  return {status:'RESOLVED',isCrit:critChanceCeil>=roll,deterministic:critChanceCeil>=100||critChanceCeil<1,reason:value.roll===null?'chance_guarantees_result':'captured_roll',critChanceCeil,roll:value.roll,rngConsumed:true,trace};
}
