import {neutralShowInputs} from './show-damage.mjs';
import {targetKeys} from './active-target.mjs';
export function syntheticCardActionExample(){
  const {value,...offense}=neutralShowInputs(0);
  const conditions={cardExists:true,inHand:true,judgeCost:true,commandExists:true,dead:false,strike:true,allowIgnoreCost:false,cardUseless:0,ownerUseless:0,coma:0,comaImmunity:0,ownerForbid:0,playerForbid:0,ownerForbidStrike:0,playerForbidStrike:0};
  const card=(id,cost,damage)=>({id,cardInstanceId:id,costInput:{cfgCost:String(cost),originCost:cost==='X'?0:cost,delta:0,harmonize:0,fixedSwitches:{},keeper:false,keeperCost:null,pvp:false},conditions:{...conditions},
    command:{rows:[{id:'damage',Type:'BEActiveDamage',Target:'UpperTarget',Para:`${damage},1`}],variables:{},offense:{...offense},targetModifiers:{...Object.fromEntries(targetKeys.map(key=>[key,0])),isCrit:false,enemyStateDmgMultiplier:1},repeatModifiers:{plus:0,per:0},immune:false}});
  return {schemaVersion:1,kind:'morimens-card-action-timeline',build:'pc-res144-build51',interveningEffects:'assumed-absent',initialEnergy:5,target:{hp:1000,block:100},steps:[card('synthetic-fixed-cost',3,200),card('synthetic-X-cost','X',400)]};
}
