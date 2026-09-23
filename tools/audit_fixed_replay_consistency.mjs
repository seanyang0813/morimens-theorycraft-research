// Outcome-first replay regression. This never contributes blind holdout credit.
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {compileNumericCommand,compileCommandCondition} from '../engine/command-expressions.mjs';
import {getLiveStateLayer} from '../engine/live-state-lookup.mjs';
import {fixedPurePreHit} from '../engine/fixed-pure-prehit.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
const out={completeFixed:0,shapeSix:0,eligible:0,exact:0,mismatch:0,blocked:{},actions:0,boosted:0,nonzeroDimension:0,nonzeroFixedTarget:0};
const batches=new Set(),actions=new Set();
let replayCount=0;
for(let i=71;i<=172;i++){
  const dir=resolve(root,`research/observations/replay-batch-${String(i).padStart(2,'0')}`);
  if(!existsSync(resolve(dir,'compact-index.json')))continue;
  replayCount++;
  const index=read(resolve(dir,'compact-index.json'));
  const catalog=read(resolve(dir,'decoded.json')).decoded.resourceRecords;
  for(const action of index.actionSnapshots??[])for(const snapshot of action.window?.hitSnapshots??[]){
    if(snapshot.boundaryStatus!=='COMPLETE')continue;
    const hit=action.window?.hits?.find(row=>row.recordIndex===snapshot.recordIndex&&row.frameIndex===snapshot.frameIndex);
    if(hit?.data?.beHitConfig?.damageType!==6)continue;
    out.completeFixed++;
    const card=action.cards?.[String(action.cardUid)],skill=catalog.Skill?.[String(card?.tid)],cmd=catalog.Cmd?.[String(skill?.CmdList)];
    const rows=cmd?.data_list?.filter(row=>row.Type==='BEFixedDamage')??[];
    if(rows.length!==6)continue;
    out.shapeSix++;
    try{
      if(!card||!skill||!cmd||hit.data.beHitConfig.castRoleUid!==card.ownerUid||hit.data.beHitConfig.skillConfigId!==card.tid)throw Error('identity');
      if(cmd.data_list.some(row=>row.Type!=='BEFixedDamage'&&/Damage/.test(row.Type)))throw Error('competing damage');
      const caster=snapshot.roles?.[String(card.ownerUid)],target=snapshot.roles?.[String(hit.data.roleUid)];
      const players=Object.values(snapshot.roles??{}).filter(row=>row?.roleType===3&&row.camp===card.camp);
      const enemies=Object.values(snapshot.roles??{}).filter(row=>row?.roleType===2&&row.camp!==card.camp&&row.properties?.hp>0);
      if(!caster||!target||players.length!==1||enemies.length!==1||enemies[0].uid!==target.uid)throw Error('target binding');
      const player=players[0],liveCard=snapshot.cards?.[String(action.cardUid)];
      if(!liveCard||liveCard.tid!==card.tid||liveCard.ownerUid!==card.ownerUid)throw Error('card identity');
      const args=liveCard.cardArgs,registry=new Map();
      for(const state of snapshot.activeStates??[]){const list=registry.get(state.ownerUid)??[];list.push({stateId:state.stateId,layer:state.layer,isDeleted:Boolean(state.isDeleted)});registry.set(state.ownerUid,list);}
      const owners={'CmdCaster.GetStateLayer':caster.uid,'UpperTarget.GetStateLayer':target.uid,'CurCard.GetStateLayer':liveCard.uid};
      const call=(name,values)=>{if(!Object.hasOwn(owners,name)||values.length!==1)throw Error('unsupported call');return getLiveStateLayer({registry,ownerUid:owners[name],stateId:values[0]});};
      const dimension=player.properties?.dimension_fix_per??0;
      const read=name=>name==='PlayerRole.dimension_fix_per'?dimension:/^Arg[1-9]\d*$/.test(name)?args?.[name.slice(3)]:undefined;
      const predictions=[];let boosted=false;
      for(const [rowIndex,row] of rows.entries()){
        if(row.Target!=='MinHpEnemy'||typeof row.Cond!=='string'||typeof row.Para!=='string')throw Error('row shape');
        const condition=compileCommandCondition(row.Cond,{allowedFunctions:Object.keys(owners)})(read,call);
        if(!condition.passed)continue;
        const params=compileNumericCommand(row.Para,{allowedFunctions:Object.keys(owners)})(read,call).values;
        if(params.length!==1)throw Error('parameter count');
        const properties=target.properties??{};
        const input={build:'pc-res144-build51',category:'FIXED',targetDead:false,baseDamage:params[0],dimensionFixPer:dimension};
        for(let n=1;n<=5;n++)input['fixed'+n]=properties['be_fixed_damage_per'+n]??0;
        predictions.push(fixedPurePreHit(input).preHitDamage);
        if(rowIndex%2===1)boosted=true;
      }
      if(!predictions.length||new Set(predictions).size!==1)throw Error('ambiguous eligible rows');
      const observed=hit.data.beHitConfig.castDamage;
      if(!Number.isFinite(observed))throw Error('observed damage');
      out.eligible++;
      batches.add(i);actions.add(`${i}:${action.actionIndex}`);
      if(boosted)out.boosted++;
      if(dimension!==0)out.nonzeroDimension++;
      if([1,2,3,4,5].some(n=>(target.properties?.['be_fixed_damage_per'+n]??0)!==0))out.nonzeroFixedTarget++;
      out.minDamage=out.minDamage===null?observed:Math.min(out.minDamage,observed);
      out.maxDamage=out.maxDamage===null?observed:Math.max(out.maxDamage,observed);
      if(predictions[0]===observed)out.exact++;
      else out.mismatch++;
    }catch(error){out.blocked[error.message]=(out.blocked[error.message]??0)+1;}
  }
}
out.actions=actions.size;
if(replayCount!==102||out.completeFixed!==99||out.shapeSix!==86||out.eligible!==85||out.exact!==85||out.mismatch!==0||batches.size!==1||out.actions!==30||out.boosted!==0||out.nonzeroDimension!==12||out.nonzeroFixedTarget!==1||JSON.stringify(out.blocked)!=='{"identity":1}')throw new Error('Fixed replay regression corpus changed; review the underlying private cases');
const onlyBatch=[...batches][0],privateDir=resolve(root,`research/observations/replay-batch-${String(onlyBatch).padStart(2,'0')}`);
const report={schemaVersion:1,kind:'MORIMENS_RETROSPECTIVE_FIXED_REPLAY_CONSISTENCY',analysisTrack:'verification',status:'EXACT_RETROSPECTIVE_COMPONENT_MATCHES',calculationBuild:'pc-res144-build51',recordedCombatBuild:null,
  corpus:{replaysScanned:replayCount,completeFixedHitSnapshots:out.completeFixed,privateReplayIndexSha256:sha(resolve(privateDir,'compact-index.json')),privateEmbeddedCatalogSha256:sha(resolve(privateDir,'decoded.json')),identifiersPublished:false},
  selection:{sixRowFixedShape:out.shapeSix,eligibleHitSnapshots:out.eligible,rejectedHitIdentity:out.blocked.identity,otherFixedSnapshotsOutsideShape:out.completeFixed-out.shapeSix,distinctReplays:batches.size,distinctCardActions:out.actions},
  comparison:{exact:out.exact,mismatches:out.mismatch,boostedBranchHits:out.boosted,nonzeroDimensionHits:out.nonzeroDimension,nonzeroFixedTargetHits:out.nonzeroFixedTarget},
  method:'For a single living enemy, evaluate the six captured conditional BEFixedDamage rows using the pre-hit card arguments, player dimension property and live caster/card/target state layers; require all eligible rows to yield one value, then run the recovered Fixed pre-hit formula and compare with recorded castDamage.',
  limitations:['All outcomes were decoded before calculation; none is an independent holdout or publication credit.','The 85 hits are 30 actions within one replay, not independent battles or players. The boosted branch was not observed.','The recorded combat build is unknown; matching historical expression and effect behavior cannot prove engine-version identity.','This compares pre-hit castDamage only, not actual HP loss, callbacks or complete battle behavior.','No player, account, replay, role-instance or card-instance identifier is published.']};
const output=resolve(root,'research/evidence/fixed-replay-consistency.json');writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output:'research/evidence/fixed-replay-consistency.json',eligible:out.eligible,exact:out.exact,mismatches:out.mismatch,replays:batches.size,actions:out.actions}));
