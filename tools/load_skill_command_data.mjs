import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

export function loadSkillCommandData(build){
  if(!['pc-res144-build51','pc-res150-build51'].includes(build))throw new Error('Unsupported requested client build');
  const configRoot=build==='pc-res150-build51'?'research/observations/current-res150-build51/modules':'research/extracted/config',loaded={};
  for(const name of ['Skill','BattleApi','Cmd','State']){const bytes=readFileSync(resolve(root,`${configRoot}/${name}.json`));loaded[name]={data:JSON.parse(bytes),sha256:hash(bytes)};}
  return {build,skills:loaded.Skill.data,battleApi:loaded.BattleApi.data,commands:loaded.Cmd.data,states:loaded.State.data,sourceHashes:Object.fromEntries(Object.entries(loaded).map(([name,row])=>[name,row.sha256]))};
}
