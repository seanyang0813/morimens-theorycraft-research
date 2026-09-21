import {readFileSync} from 'node:fs';
import {buildReplayActionCandidate} from '../engine/replay-action-candidate.mjs';

try{
  const usage='Usage: node tools/build_replay_action_candidate.mjs <replay-index.json> <action-index> [--hit-index N] [--crit-roll N] [--decoded-replay FILE]';
  if(process.argv.length<4)throw new Error(usage);
  const read=path=>JSON.parse(readFileSync(path,'utf8'));
  const actionIndex=Number(process.argv[3]),options=process.argv.slice(4);let hitIndex=null,critRoll=null,decodedReplayPath=null;
  while(options.length){
    const flag=options.shift(),raw=options.shift();
    if(raw===undefined||!['--hit-index','--crit-roll','--decoded-replay'].includes(flag))throw new Error(usage);
    if(flag==='--decoded-replay'){decodedReplayPath=raw;continue;}
    const value=Number(raw);if(!Number.isFinite(value))throw new Error(`${flag} requires a finite number`);
    if(flag==='--hit-index')hitIndex=value;else critRoll=value;
  }
  let catalogs,provenance;
  if(decodedReplayPath){
    const artifact=read(decodedReplayPath),records=artifact?.decoded?.resourceRecords;
    if(artifact?.kind!=='MORIMENS_DECODED_REPLAY'||!records||!['Skill','Cmd','MonsterConfig','AwakerConfig'].every(name=>records[name]&&typeof records[name]==='object'))throw new Error('Decoded replay with embedded combat resource tables required');
    catalogs={skills:records.Skill,commands:records.Cmd,monsters:records.MonsterConfig,awakeners:records.AwakerConfig};provenance={kind:'replay-embedded-resource-records',decodedReplayInputSha256:artifact.inputSha256};
  }else{
    catalogs={skills:read('research/extracted/config/Skill.json'),commands:read('research/extracted/config/Cmd.json'),monsters:read('research/extracted/config/MonsterConfig.json'),awakeners:read('research/extracted/config/AwakerConfig.json')};provenance={kind:'local-extracted-pc144-catalogs'};
  }
  const result=buildReplayActionCandidate({index:read(process.argv[2]),actionIndex,hitIndex,critRoll,...catalogs});result.catalogProvenance=provenance;
  console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
