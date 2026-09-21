import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {runGeneratedCardPipeline} from '../engine/generated-card-pipeline.mjs';

if(process.argv.length!==3){console.error('Usage: node tools/run_catalog_generated_card_pipeline.mjs request.json');process.exitCode=2;}
else try{
  const request=JSON.parse(readFileSync(process.argv[2],'utf8'));
  if(request.build!=='pc-res144-build51')throw new Error('Bundled public catalog snapshot is pc-res144-build51');
  const read=name=>{const bytes=readFileSync(new URL(`../research/extracted/config/${name}.json`,import.meta.url));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
  const skill=read('Skill'),battleApi=read('BattleApi');
  const source={build:request.build,skills:skill.data,battleApi:battleApi.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256}};
  console.log(JSON.stringify(runGeneratedCardPipeline(request,source),null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
