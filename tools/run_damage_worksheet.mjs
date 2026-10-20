#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {runDamageWorksheet} from '../engine/damage-worksheet.mjs';
try{
  if(process.argv.length!==3)throw new Error('Usage: node tools/run_damage_worksheet.mjs <worksheet.json>');
  console.log(JSON.stringify(runDamageWorksheet(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
