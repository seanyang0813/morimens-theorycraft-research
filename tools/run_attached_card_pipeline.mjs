import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runAttachedCardPipeline} from '../engine/attached-card-pipeline.mjs';

const root=new URL('../',import.meta.url),inputPath=process.argv[2];
if(!inputPath)throw new Error('Usage: node tools/run_attached_card_pipeline.mjs INPUT.json');
const input=JSON.parse(readFileSync(inputPath,'utf8'));
const read=name=>{const bytes=readFileSync(new URL(`research/extracted/config/${name}.json`,root));return {data:JSON.parse(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const skill=read('Skill'),battleApi=read('BattleApi'),command=read('Cmd');
const source={build:input.build,skills:skill.data,battleApi:battleApi.data,commands:command.data,sourceHashes:{Skill:skill.sha256,BattleApi:battleApi.sha256,Cmd:command.sha256}};
console.log(JSON.stringify(runAttachedCardPipeline(input,source),null,2));
