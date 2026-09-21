import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runPreparedSkillRequest} from '../engine/prepared-skill-request.mjs';
if(![3,4].includes(process.argv.length)){console.error('Usage: node tools/prepare_skill_command.mjs request.json [execution-context.json]');process.exitCode=2;}
else try{
  const request=JSON.parse(readFileSync(process.argv[2],'utf8'));
  const read=name=>{const bytes=readFileSync(new URL('../research/extracted/config/'+name+'.json',import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const skills=read('Skill'),api=read('BattleApi'),commands=read('Cmd'),states=read('State');
  let execution=null;
  if(process.argv[3]){
    execution=JSON.parse(readFileSync(process.argv[3],'utf8'));
  }
  const result=runPreparedSkillRequest({schemaVersion:1,kind:'morimens-prepared-skill-request',preparation:request,execution},{skills:skills.data,battleApi:api.data,commands:commands.data,states:states.data,sourceHashes:{Skill:skills.sha256,BattleApi:api.sha256,Cmd:commands.sha256,State:states.sha256}});
  console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
