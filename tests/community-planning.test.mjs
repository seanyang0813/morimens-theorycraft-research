import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {analyzeCommunityTeams,searchCommunityPortfolios,communityBuildPlan} from '../engine/community-team-planner.mjs';
import {validateBuildPlan} from '../engine/build-plan.mjs';
import {simulateEnemyPressure,minimumBlockForPressure} from '../engine/encounter-thresholds.mjs';
import {searchSimulationThreshold} from '../engine/simulation-threshold-search.mjs';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const catalog=read('research/community/suggested-teams.json'), builds=read('website/dist/build-catalog.json');
const fixture=()=>read('research/examples/community-wheel-threshold.json');
const pressure=read('research/evidence/season71-zone3-example-enemy-audit.json');

test('source-grounded teams preserve variants and the explicit Posse correction',()=>{
  assert.equal(catalog.teams.length,8);
  const ids=new Set(builds.characters.map(row=>row.id));
  for(const team of catalog.teams){assert.equal(team.members.length,4);assert.equal(new Set(team.members.map(row=>row.characterId)).size,4);assert.ok(team.members.every(row=>ids.has(row.characterId)));assert.equal(team.combatBuild,null);}
  const result=analyzeCommunityTeams(catalog,['24-chaos','tawil']);
  assert.deepEqual(result.conflicts.map(row=>[row.type,row.name]),[['posse','All of Her']]);
  assert.equal(analyzeCommunityTeams(catalog,['24-chaos','tawil'],{checkPosse:false}).conflicts.length,0);
  assert.ok(analyzeCommunityTeams(catalog,['tawil','lotan-xu']).conflicts.some(row=>row.name==='Doll: Inferno'));
  assert.throws(()=>analyzeCommunityTeams(catalog,['24-chaos','24-chaos']),/Unique/);
  assert.throws(()=>analyzeCommunityTeams(catalog,['unknown']),/Unknown/);
});

test('complete template subset search finds exactly the three five-team alternatives',()=>{
  const result=searchCommunityPortfolios(catalog,catalog.teams.map(row=>row.id));
  assert.equal(result.evaluatedSubsets,256);assert.equal(result.maximumTeams,5);assert.equal(result.portfolios.length,3);
  for(const portfolio of result.portfolios)assert.equal(analyzeCommunityTeams(catalog,portfolio).conflicts.length,0);
  assert.throws(()=>searchCommunityPortfolios(catalog,catalog.teams.map(row=>row.id),{maxEvaluations:255}),/cap/);
});

test('build export works in existing planner while leaving stats and Wheels unknown',()=>{
  for(const team of catalog.teams){
    const plan=communityBuildPlan(catalog,team.id,builds);
    assert.deepEqual(validateBuildPlan(plan,builds).plan,plan);
    assert.equal(plan.clientBuild,null);assert.ok(plan.team.every(row=>row.level===null&&row.gnosticRank===null&&row.wheelSlots.length===0));
  }
});

test('engine threshold search distinguishes refinement, order, and a real failing candidate',()=>{
  const input=fixture(), before=structuredClone(input), result=searchSimulationThreshold(input);
  assert.deepEqual(input,before);assert.equal(result.evaluatedPermutations,12);
  assert.deepEqual(result.candidates.map(row=>row.modeledHpLost),[850,975,1000,1025,1050,1125]);
  assert.deepEqual(result.passingCandidateIds,['signature-refinement-1','signature-refinement-2','signature-refinement-3','signature-and-secondary-refinement-3']);
  assert.deepEqual(result.candidates[5].bestOrder,['setup','burst']);
  assert.equal(result.candidates[5].result.best.result.energyAfter,0);
  assert.equal(result.finalDamage,null);assert.equal(result.gameplayClear,null);
});

test('owner mismatch, exhausted trigger counters and insufficient energy cannot pass',()=>{
  for(const mutate of [
    t=>t.actions[1].effects[1].pursuitOwnerUid=999,
    t=>t.initialWheelState.arachne.wheels.forEach(w=>w.triggersUsed=5),
    t=>t.initialEnergy=1
  ]) {
    const input=fixture();input.candidates=[input.candidates[5]];mutate(input.candidates[0].timeline);
    const result=searchSimulationThreshold(input);assert.deepEqual(result.passingCandidateIds,[]);
  }
});

test('search refuses partial enumeration and malformed snapshots instead of claiming a threshold',()=>{
  const input=fixture();assert.throws(()=>searchSimulationThreshold({...input,maxEvaluations:7}),/cap/);
  input.candidates[0].timeline.baseCasterProperties=null;assert.throws(()=>searchSimulationThreshold(input));
  assert.throws(()=>searchSimulationThreshold({...fixture(),thresholdHpLost:NaN}));
});

test('survival threshold matches the Python implementation without borrowing replay HP',async()=>{
  const {execFileSync}=await import('node:child_process');
  for(const hp of [1200,3000,5000])for(const heal of [0,200]) {
    const input={candidateMaxHp:hp,candidateStartingHp:hp,healingPerTurn:heal,horizon:8};
    const result=minimumBlockForPressure(pressure,input);
    const code=`import sys,json;sys.path.insert(0,'tools');from season71_zone3_survival_frontier import minimum_block;d=json.load(open('research/evidence/season71-zone3-example-enemy-audit.json'));print(minimum_block(d['enemyHitsToPlayer'],d['playerMaxHpChanges'],8,${hp},${heal}))`;
    const expected=Number(execFileSync('python',['-c',code],{cwd:new URL('../',import.meta.url),encoding:'utf8'}).trim());
    assert.equal(result.minimumBlockPerTurn,expected);assert.equal(result.thresholdPass.passedFixedPressure,true);
    if(expected)assert.equal(result.oneBelowPass,false);
  }
  assert.throws(()=>simulateEnemyPressure(pressure,{candidateMaxHp:null}),/integer/);
});

test('survival preserves within-turn damage, capped healing, lethal-before-cut, and partial starting HP',()=>{
  const p={enemyHitsToPlayer:[{turn:1,record:1,incomingBeforeBlock:80},{turn:1,record:2,incomingBeforeBlock:80},{turn:2,record:3,incomingBeforeBlock:10}],playerMaxHpChanges:[{turn:1,record:2}]};
  const input={candidateMaxHp:100,candidateStartingHp:100,healingPerTurn:50,blockPerTurn:60,horizon:2};
  const dead=simulateEnemyPressure(p,input);assert.deepEqual(dead.death,{turn:1,record:2});assert.equal(dead.maxHpAfter,100);assert.equal(dead.healedTotal,0);assert.equal(dead.trace[1].blockBefore,0);
  const alive=simulateEnemyPressure(p,{...input,blockPerTurn:100});assert.equal(alive.passedFixedPressure,true);assert.equal(alive.trace[1].maxHpAfter,80);assert.equal(alive.hpAfter,80);
  const wounded=simulateEnemyPressure(p,{...input,candidateStartingHp:30,healingPerTurn:0,blockPerTurn:100});assert.equal(wounded.passedFixedPressure,false);
  assert.throws(()=>simulateEnemyPressure({...p,playerMaxHpChanges:[{turn:1,record:9}]},input),/bind/);
});
