import {readFileSync} from 'node:fs';
import {buildReplayActionCandidate} from '../engine/replay-action-candidate.mjs';

try{
  if(process.argv.length<4||process.argv.length>5)throw new Error('Usage: node tools/build_replay_action_candidate.mjs <replay-index.json> <action-index> [crit-roll]');
  const read=path=>JSON.parse(readFileSync(path,'utf8'));
  const actionIndex=Number(process.argv[3]),critRoll=process.argv[4]===undefined?null:Number(process.argv[4]);
  const result=buildReplayActionCandidate({index:read(process.argv[2]),actionIndex,critRoll,skills:read('research/extracted/config/Skill.json'),commands:read('research/extracted/config/Cmd.json'),monsters:read('research/extracted/config/MonsterConfig.json')});
  console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
