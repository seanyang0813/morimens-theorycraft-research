import {prepareNoCardPveOffense,casterSetupKeys,playerSetupKeys} from './offensive-setup.mjs';
import {showDamage} from './show-damage.mjs';
export const cardCasterKeys=[...casterSetupKeys,'i_damage_per_card','o_damage_per_card','awaker_CmdCard_dmg_per','card_damage_per3_n2'];
export const cardPropertyKeys=['card_damage_per','card_damage_plus','card_strength_multiple','card_damage_per2','card_damage_per3','o_damage_per_strikecard_limit'];
export {playerSetupKeys};
function exact(obj,keys){if(!obj||keys.some(k=>!Object.hasOwn(obj,k)||!Number.isFinite(obj[k]))||Object.keys(obj).some(k=>!keys.includes(k)))throw new Error('Missing or unknown resolved property');}
export function prepareCardPveOffense(input){
 const keys=['build','value','caster','player','tags','dimensionFixPer','skillArgsPlus','card','instructionCard','stateTriggerAdd'];
 if(!input||keys.some(k=>!Object.hasOwn(input,k))||Object.keys(input).some(k=>!keys.includes(k)))throw new Error('Missing or unknown card setup field');
 if(typeof input.instructionCard!=='boolean'||typeof input.stateTriggerAdd!=='boolean')throw new Error('Explicit boolean flags required');
 exact(input.caster,cardCasterKeys);exact(input.card,cardPropertyKeys);
 const c=input.caster,p=input.player,card=input.card;
 const base=prepareNoCardPveOffense(Object.fromEntries(keys.slice(0,7).map(k=>[k,k==='caster'?Object.fromEntries(casterSetupKeys.map(n=>[n,c[n]])):input[k]])));
 const d={...base.resolvedUtilityInputs};
 d.cardDamagePer2=card.card_damage_per2;
 if(input.instructionCard){d.cardInsideDmgPer=c.i_damage_per_card;d.cardOutsideDmgPer=c.o_damage_per_card;d.awaker_CmdCard_dmg_per=c.awaker_CmdCard_dmg_per;d.card_damage_per3_n2=c.card_damage_per3_n2;}
 const suffix={Card_Strike:'strikecard',Card_Skill:'skillcard',Card_AttachPost:'attachpost',Ulti_Skill:'ulti'};
 d.skillTypeOutsideDmgPer=1;
 for(const tag of input.tags){let v=c['o_damage_per_'+suffix[tag]];if(tag==='Card_Strike'&&card.o_damage_per_strikecard_limit>0)v=Math.min(v,card.o_damage_per_strikecard_limit);d.skillTypeOutsideDmgPer*=1+v/100;}
 d.curCardDamagePer=card.card_damage_per;d.cardDamagePlus=card.card_damage_plus;d.cardDamagePer3=card.card_damage_per3;
 d.strength=p.damage_plus+c.damage_plus;
 if(d.strength>0)d.strength*=(1+c.awaker_strength_multiple/100+card.card_strength_multiple/100+(input.tags.includes('Ulti_Skill')?c.ulti_strength_multiple/100:0))*(1+c.awaker_dmg_power_per_scale/100);
 if(input.stateTriggerAdd)for(const k of ['cardDamagePer2','cardDamagePer3','card_damage_per3_n2','awaker_ulti_dmg_per','awaker_CmdCard_dmg_per'])d[k]=0;
 const out=showDamage(d);
 return {status:'UNVERIFIED',finalDamage:null,showDamage:out.showDamage,diagnosticBaseDamage:out.diagnosticBaseDamage,resolvedUtilityInputs:d,evidence:['PC144:CardOffensiveSetup'],unresolvedDependencies:['Actual card identity, flags and properties','Target, crit and HP resolution','Gameplay validation']};
}
