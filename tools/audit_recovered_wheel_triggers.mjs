import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const read=path=>readFileSync(resolve(root,path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const config=name=>{const bytes=read(`research/extracted/config/${name}.json`),parsed=JSON.parse(bytes);return {bytes,data:parsed.data??parsed};};
const state=config('State'),cmd=config('Cmd'),runtime=read('research/extracted/normalized/BattleStateServer.decompiled.lua');
const runtimeText=runtime.toString('utf8').replace(/\r\n/g,'\n');
const checks=[];
const requireCheck=(id,ok)=>{if(!ok)throw new Error(`Recovered Wheel trigger audit failed: ${id}`);checks.push(id);};
const s=id=>state.data[String(id)],c=id=>cmd.data[String(id)]?.data_list;

requireCheck('effect-trigger-requires-condition',runtimeText.includes('if not self.configData[condKey] or self.configData[condKey] == "" then\n    return'));
requireCheck('doomsday-event-and-judgement',s(123521).TriggerCond1?.[1]==='BSTAfterUseCard'&&s(123521).Judgement1==='TriggerAssociator.CardTypeMatch(Card_Strike)==1');
requireCheck('doomsday-attack-rounding',s(123521).TriggerPara1==='math.ceil(StateOwner.atk*StateArg2*0.01)');
requireCheck('doomsday-command-order',c(124065)?.[1]?.Cond==='PlayerRole.GetStateLayer(123518)<8'&&c(124065)?.[1]?.Para==='124066,Arg1'&&c(124065)?.[2]?.Para===123518);
requireCheck('doomsday-flat-property-and-cap',s(124066).ExistProperty?.strikecard_damage_plus==='ChangedLayer'&&s(123518).MaxLayer===8);
requireCheck('light-event-and-parameter',s(123520).TriggerCond1?.[1]==='BSTAfterUseKeeperSkill'&&s(123520).TriggerPara1==='StateArg1');
requireCheck('light-random-and-counter-condition',c(124022)?.[1]?.Cond==='Random(100)<=Arg1 and PlayerRole.GetStateLayer(124023)==0');
requireCheck('light-card-selection-and-move',c(124022)?.[1]?.Target==='DrawDeckAndGraveyardDeck.GetCardByAwakerExp(UpperTarget,99).GetCardByType(Card_Strike,1)'&&c(124022)?.[1]?.Para==='HandDeck,TOP,1');
requireCheck('light-counter-command',c(124022)?.[2]?.Para===124023&&c(124022)?.[2]?.Target==='PlayerRole');
requireCheck('light-counter-clear-events',s(124023).MaxLayer===1&&s(124023).ClearCond?.[1]==='BSTAfterBoutEnd'&&s(124023).ClearCond?.[2]==='BSTBeforeBattleEnd');
requireCheck('eternal-owner-and-cap',s(134231).TriggerCond1?.[1]==='BSTAfterAttachPostAction'&&s(134231).Judgement1==='TriggerAssociator2.UniqueID==StateOwner.UniqueID and PlayerRole.GetStateLayer(134383)<5');
requireCheck('rota-owner-and-cap',s(134313).TriggerCond1?.[1]==='BSTAfterAttachPostAction'&&s(134313).Judgement1==='TriggerAssociator2.UniqueID==StateOwner.UniqueID and PlayerRole.GetStateLayer(134382)<5');
requireCheck('pursuit-command-properties',c(134385)?.[1]?.Para==='70350,Arg1'&&c(134385)?.[2]?.Para===134383&&c(134386)?.[1]?.Para==='70350,Arg1'&&c(134386)?.[2]?.Para===134382&&s(70350).ExistProperty?.basic_damage_per==='ChangedLayer');
requireCheck('doomsday-turn-clear',s(123518).ClearCond?.[1]==='BSTAfterBoutEnd'&&s(124066).ClearCond?.[1]==='BSTAfterBoutEnd');
requireCheck('eternal-turn-counter-clear',s(134383).ClearCond?.[1]==='BSTAfterBoutEnd'&&s(134383).ClearCond?.[2]==='BSTBeforeBattleEnd');
requireCheck('rota-battle-counter-clear',s(134382).ClearCond?.[1]==='BSTBeforeBattleEnd'&&!s(134382).ClearCond?.[2]);
requireCheck('pursuit-amplification-turn-clear',s(70350).ClearCond?.[1]==='BSTAfterBoutEnd'&&s(70350).ClearCond?.[2]==='BSTBeforeBattleEnd');
requireCheck('eternal-second-command-unregistered',s(134231).TriggerCmd2===1603&&!s(134231).TriggerCond2);

const report={schemaVersion:1,kind:'morimens-recovered-wheel-trigger-audit',analysisTrack:'mechanics',status:'SOURCE_ROWS_MATCH_EXPECTED_TRANSITIONS',build:'pc-res144-build51',summary:{checks:checks.length,passed:checks.length,doomsdayCounterCap:8,doomsdayClearsAfterBout:true,lightCounterCap:1,maxRefinementLightChancePercent:100,arachneCounterCapPerWheel:5,eternalCounterClearsAfterBout:true,rotaCounterClearsAfterBout:false,pursuitAmplificationClearsAfterBout:true,maxRefinementDoomsdayFlatPercent:25,maxRefinementEternalAmplification:40,maxRefinementRotaAmplification:15,eternalSecondCommandRegistered:false},checks,source:{StateSha256:hash(state.bytes),CmdSha256:hash(cmd.bytes),BattleStateServerSha256:hash(runtime)},limitations:['Static source/config audit; no connected event execution or gameplay validation','Published report contains bounded derived facts and hashes, not complete proprietary rows']};
writeFileSync(resolve(root,'research/evidence/recovered-wheel-trigger-audit.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Wrote ${checks.length} passed recovered Wheel trigger checks`);
