import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {classifyReplayCombatDomain} from '../engine/replay-combat-domain.mjs';

const args=process.argv.slice(2);let indexFile=null;
while(args.length){const flag=args.shift(),value=args.shift();if(flag!=='--index'||!value||indexFile)throw new Error('Usage: node tools/classify_replay_combat_domain.mjs --index FILE');indexFile=value;}
if(!indexFile)throw new Error('Replay index is required');
const index=JSON.parse(readFileSync(resolve(indexFile),'utf8'));
console.log(JSON.stringify(classifyReplayCombatDomain(index),null,2));
