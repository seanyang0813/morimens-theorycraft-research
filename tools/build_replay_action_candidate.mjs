import {readFileSync} from 'node:fs';
import {buildReplayActionCandidate} from '../engine/replay-action-candidate.mjs';

try{
  if(process.argv.length<4)throw new Error('Usage: node tools/build_replay_action_candidate.mjs <replay-index.json> <action-index> [--hit-index N] [--crit-roll N]');
  const read=path=>JSON.parse(readFileSync(path,'utf8'));
  const actionIndex=Number(process.argv[3]),options=process.argv.slice(4);let hitIndex=null,critRoll=null;
  while(options.length){
    const flag=options.shift(),raw=options.shift();
    if(raw===undefined||!['--hit-index','--crit-roll'].includes(flag))throw new Error('Usage: node tools/build_replay_action_candidate.mjs <replay-index.json> <action-index> [--hit-index N] [--crit-roll N]');
    const value=Number(raw);if(!Number.isFinite(value))throw new Error(`${flag} requires a finite number`);
    if(flag==='--hit-index')hitIndex=value;else critRoll=value;
  }
  const result=buildReplayActionCandidate({index:read(process.argv[2]),actionIndex,hitIndex,critRoll,skills:read('research/extracted/config/Skill.json'),commands:read('research/extracted/config/Cmd.json'),monsters:read('research/extracted/config/MonsterConfig.json'),awakeners:read('research/extracted/config/AwakerConfig.json')});
  console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
