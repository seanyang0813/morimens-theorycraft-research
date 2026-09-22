import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {classifyReplayCombatDomain} from '../engine/replay-combat-domain.mjs';

const args=process.argv.slice(2);let indexFile=null,decodedFile=null;
while(args.length){const flag=args.shift(),value=args.shift();if(!value||!['--index','--decoded'].includes(flag)||(flag==='--index'&&indexFile)||(flag==='--decoded'&&decodedFile))throw new Error('Usage: node tools/classify_replay_combat_domain.mjs --index FILE [--decoded FILE]');if(flag==='--index')indexFile=value;else decodedFile=value;}
if(!indexFile)throw new Error('Replay index is required');
const index=JSON.parse(readFileSync(resolve(indexFile),'utf8'));
let context={};if(decodedFile){const decoded=JSON.parse(readFileSync(resolve(decodedFile),'utf8')),battleDat=decoded?.decoded?.battleDat,battleConfig=decoded?.decoded?.resourceRecords?.BattleConfig?.[String(battleDat?.battleTid)];context={battleDat,battleConfig};}
console.log(JSON.stringify(classifyReplayCombatDomain(index,context),null,2));
