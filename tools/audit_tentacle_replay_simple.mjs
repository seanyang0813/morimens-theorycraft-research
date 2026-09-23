// Outcome-first component check. No holdout or final-HP credit.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileNumericCommand} from '../engine/command-expressions.mjs';
import {playerTentacleDamage} from '../engine/player-tentacle-damage.mjs';
import {tentaclePreHit} from '../engine/tentacle-prehit.mjs';
import {tentacleCritDamage} from '../engine/tentacle-crit-damage.mjs';
import {calculateDirectTentacleCommand} from '../engine/tentacle-direct-command.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const pkeys=['tentacle_dmg','tentacle_base_dmg','basic_damage_per','weak_per','tentacle_dmg_per'];
const akeys=['i_basic_damage_per','i_damage_per',...Array.from({length:8},(_,i)=>`i_damage_per${i+1}`)];
const counters={replaysScanned:0,completeTentacleHits:0,immediateIdentity:0,oneDirectRow:0,
  exactRowShape:0,resolvedTargetAndNeutralAwakers:0,noncritEligible:0,exact:0,mismatch:0,
  critEligible:0,internationalCritBranchExact:0,japanCritBranchExact:0,composedDirectCommandMatches:0,blocked:{}};
const sourceReplays=new Set(),sourceActions=new Set(),digest=createHash('sha256');
for(let n=71;n<=172;n++){
  const folder=resolve(root,`research/observations/replay-batch-${String(n).padStart(2,'0')}`);
  const indexPath=resolve(folder,'compact-index.json');
  if(!existsSync(indexPath))throw new Error('Missing private replay index');
  const indexBytes=readFileSync(indexPath),index=JSON.parse(indexBytes);
  digest.update(Buffer.from([0,n]));digest.update(createHash('sha256').update(indexBytes).digest());
  counters.replaysScanned++;
  let catalog;
  for(const action of index.actionSnapshots??[]){
    const hits=new Map((action.window?.hits??[]).map(row=>[`${row.recordIndex}:${row.frameIndex}`,row]));
    for(const snapshot of action.window?.hitSnapshots??[]){
      if(snapshot.boundaryStatus!=='COMPLETE')continue;
      const hit=hits.get(`${snapshot.recordIndex}:${snapshot.frameIndex}`),config=hit?.data?.beHitConfig;
      if(config?.damageType!==3)continue;
      counters.completeTentacleHits++;
      const card=action.cards?.[String(action.cardUid)];
      if(!card||config.castRoleUid!==card.ownerUid||config.skillConfigId!==card.tid)continue;
      counters.immediateIdentity++;
      catalog??=read(resolve(folder,'decoded.json')).decoded.resourceRecords;
      const skill=catalog.Skill?.[String(card.tid)],command=catalog.Cmd?.[String(skill?.CmdList)];
      const rows=command?.data_list?.filter(row=>row.Type==='BETentacleAttack')??[];
      if(rows.length!==1)continue;
      counters.oneDirectRow++;
      const row=rows[0];
      if(row.Target!=='FrontEnemy'||row.Para!=='PlayerRole.tentacle_dmg*CmdCaster.occupation_master/200,1,0')continue;
      counters.exactRowShape++;
      const roles=Object.values(snapshot.roles??{}),caster=snapshot.roles?.[String(card.ownerUid)],target=snapshot.roles?.[String(hit.data.roleUid)];
      const players=roles.filter(role=>role.roleType===3&&role.camp===card.camp);
      const awakers=roles.filter(role=>role.roleType===1&&role.camp===card.camp);
      if(players.length!==1||awakers.length===0||!caster||!target||target.roleType!==2||target.camp===card.camp||target.properties?.hp<=0){counters.blocked['role/target binding']=(counters.blocked['role/target binding']??0)+1;continue;}
      const player=players[0],targetProps=target.properties??{};
      if(awakers.some(role=>Object.entries(role.properties??{}).some(([key,value])=>/damage_per2|dmg_per2/.test(key)&&value!==0))){counters.blocked['nonneutral Awaker bonus']=(counters.blocked['nonneutral Awaker bonus']??0)+1;continue;}
      counters.resolvedTargetAndNeutralAwakers++;
      if(typeof config.isCrit!=='boolean')throw new Error('Missing critical outcome flag');
      const map=(props,keys)=>Object.fromEntries(keys.map(key=>[key,props?.[key]??0]));
      const playerDamage=playerTentacleDamage({build:'pc-res151-build51',player:map(player.properties,pkeys),awakers:awakers.map(role=>map(role.properties,akeys)),powerStateLayer:0,dimensionFixPer:player.properties?.dimension_fix_per??0}).value;
      const numeric=compileNumericCommand(row.Para) (name=>name==='PlayerRole.tentacle_dmg'?playerDamage:name==='CmdCaster.occupation_master'?(caster.properties?.occupation_master??0):undefined).values;
      if(numeric.length!==3||numeric[1]!==1||numeric[2]!==0)throw new Error('Unexpected Tentacle row expression');
      const effectBase=Math.ceil(numeric[0]);
      const resolved={build:'pc-res151-build51',isCrit:config.isCrit,tentacleDamage:effectBase,critDamagePer:0,
        beDamagePer:targetProps.be_damage_per??0,beDamagePer2:targetProps.be_damage_per2??0,beDamagePer3:targetProps.be_damage_per3??0,beTentacleDamagePer:targetProps.be_tentacle_damage_per??0,vulnerablePer:targetProps.vulnerable_per??0,beDamagePlus:targetProps.be_damage_plus??0,
        enemyTypePer:0,enemyStatePer:0,enemyBuffPer:0,enemyDebuffPer:0,enemyBlockPer:0,enemyBarrierPer:0,paraPlus:0};
      const directInput={build:'pc-res151-build51',player:{...map(player.properties,pkeys),outside_crit_damage:player.properties?.outside_crit_damage??0},
        awakers:awakers.map(role=>({...map(role.properties,akeys),crit_damage:role.properties?.crit_damage??0})),
        powerStateLayer:0,dimensionFixPer:player.properties?.dimension_fix_per??0,
        casterOccupationMaster:caster.properties?.occupation_master??0,japan:false,isCrit:config.isCrit,
        target:Object.fromEntries(Object.entries(resolved).filter(([key])=>!['build','isCrit','tentacleDamage','critDamagePer'].includes(key)))};
      const composed=calculateDirectTentacleCommand(directInput);
      if(composed.player.value!==playerDamage||composed.command.effectDamage!==effectBase)
        throw new Error('Composed direct command disagrees with independent replay expression stages');
      sourceReplays.add(n);sourceActions.add(`${n}:${action.actionIndex}`);
      if(!config.isCrit){
        counters.noncritEligible++;
        const preHit=tentaclePreHit(resolved).preHitDamage;
        if(preHit===config.castDamage)counters.exact++;
        else counters.mismatch++;
        if(composed.preHitDamage===preHit&&preHit===config.castDamage)counters.composedDirectCommandMatches++;
      }else{
        counters.critEligible++;
        const criticalInput={build:'pc-res151-build51',outsideCritDamage:player.properties?.outside_crit_damage??0,
          awakerCritDamage:awakers.map(role=>role.properties?.crit_damage??0)};
        for(const [japan,countKey] of [[false,'internationalCritBranchExact'],[true,'japanCritBranchExact']]){
          const critDamagePer=tentacleCritDamage({...criticalInput,japan}).value;
          const preHit=tentaclePreHit({...resolved,critDamagePer}).preHitDamage;
          if(preHit===config.castDamage)counters[countKey]++;
          if(!japan&&composed.preHitDamage===preHit&&preHit===config.castDamage)counters.composedDirectCommandMatches++;
        }
      }
    }
  }
}
const summary={...counters,distinctSourceReplays:sourceReplays.size,distinctSourceActions:sourceActions.size};
const expected={replaysScanned:102,completeTentacleHits:905,immediateIdentity:58,oneDirectRow:39,
  exactRowShape:39,resolvedTargetAndNeutralAwakers:39,noncritEligible:34,exact:34,mismatch:0,
  critEligible:5,internationalCritBranchExact:5,japanCritBranchExact:0,composedDirectCommandMatches:39,blocked:{},distinctSourceReplays:4,distinctSourceActions:39};
if(JSON.stringify(summary)!==JSON.stringify(expected))throw new Error('Tentacle retrospective component corpus changed; review private cases');
const catalogDigest=createHash('sha256');
for(const n of [...sourceReplays].sort((a,b)=>a-b)){
  const path=resolve(root,`research/observations/replay-batch-${String(n).padStart(2,'0')}/decoded.json`);
  catalogDigest.update(Buffer.from([n]));catalogDigest.update(createHash('sha256').update(readFileSync(path)).digest());
}
const report={schemaVersion:1,kind:'MORIMENS_RETROSPECTIVE_TENTACLE_SIMPLE_CONSISTENCY',
  analysisTrack:'verification',status:'EXACT_RETROSPECTIVE_PREHIT_COMPONENT_MATCHES',
  calculationBuild:'pc-res151-build51',recordedCombatBuild:null,
  privateIndexCommitmentSha256:digest.digest('hex'),privateCatalogCommitmentSha256:catalogDigest.digest('hex'),
  summary,method:'From complete Tentacle hit snapshots, require matching played-card caster/skill identity, one exact direct BETentacleAttack FrontEnemy row, a living monster target and zero Awaker conditional damage bonuses. Reconstruct PlayerRole.tentacle_dmg through installed GetTentacleDamage, evaluate the command expression and effect ceiling, then apply recorded target Tentacle/Vulnerable/flat properties. The source-bound direct-command composition agrees with the independently staged calculation and recorded castDamage in all 39 cases when the international critical branch is tested. Noncritical hits are compared directly; critical hits separately evaluate both installed regional Crit DMG branches against recorded castDamage without using either branch for region attribution.',
  limitations:['All outcomes were decoded before calculation; none is a blind holdout or publication credit.',
    'The 34 exact noncritical hits and five critical branch comparisons are 39 actions in four replays, not independent players or controlled battles.',
    'The recorded combat build is unknown despite selected installed method parity; this does not establish historical engine identity.',
    'The five critical outcomes were known before both regional branches were evaluated; their branch matches do not identify the replay region or random draw. Nonzero conditional Awaker bonuses, triggered/nested Tentacle sources, BeHit, HP, callbacks and full battle behavior remain outside the comparison.',
    'Private player, replay, role and card identifiers are not published.']};
writeFileSync(resolve(root,'research/evidence/tentacle-replay-simple-consistency.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({noncritEligible:summary.noncritEligible,noncritExact:summary.exact,criticalBranchCases:summary.critEligible,internationalBranchExact:summary.internationalCritBranchExact,japanBranchExact:summary.japanCritBranchExact,replays:summary.distinctSourceReplays,actions:summary.distinctSourceActions}));
