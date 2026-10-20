#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {analyzeCommunityTeams,searchCommunityPortfolios,communityBuildPlan} from '../engine/community-team-planner.mjs';
import {simulateEnemyPressure,minimumBlockForPressure} from '../engine/encounter-thresholds.mjs';
import {searchSimulationThreshold} from '../engine/simulation-threshold-search.mjs';
const read = path => JSON.parse(readFileSync(path,'utf8'));
const root = new URL('../',import.meta.url);
const catalog = read(new URL('research/community/suggested-teams.json',root));
try {
  const [command,...args] = process.argv.slice(2); let result;
  if (command === 'portfolio') result = searchCommunityPortfolios(catalog,args.length ? args : catalog.teams.map(row=>row.id));
  else if (command === 'check') result = analyzeCommunityTeams(catalog,args);
  else if (command === 'build' && args.length === 1) result = communityBuildPlan(catalog,args[0],read(new URL('website/dist/build-catalog.json',root)));
  else if (command === 'threshold' && args.length === 1) result = searchSimulationThreshold(read(args[0]));
  else if (['survival','minimum-block'].includes(command) && args.length === 1) {
    const pressure = read(new URL('research/evidence/season71-zone3-example-enemy-audit.json',root));
    result = command === 'survival' ? simulateEnemyPressure(pressure,read(args[0])) : minimumBlockForPressure(pressure,read(args[0]));
  } else throw new Error('Usage: node tools/plan_community_teams.mjs portfolio [team IDs] | check <IDs> | build <ID> | threshold <JSON> | survival <JSON> | minimum-block <JSON>');
  console.log(JSON.stringify(result,null,2));
} catch (error) {console.error(error.message);process.exitCode=1;}
