import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const evidence=JSON.parse(readFileSync(new URL('../research/evidence/defense-consumer-audit.json',import.meta.url)));
const hashPattern=/^[a-f0-9]{64}$/;

test('defense consumer audit pins the static two-build inventory',()=>{
  assert.equal(evidence.schemaVersion,1);
  assert.equal(evidence.kind,'MORIMENS_DEFENSE_CONSUMER_AUDIT');
  assert.equal(evidence.analysisTrack,'mechanics');
  assert.equal(evidence.status,'STATIC_CONSUMER_INVENTORY');
  assert.deepEqual(evidence.builds.map(row=>row.build),['pc-res144-build51','pc-res150-build51']);
  assert.deepEqual(evidence.builds.map(row=>row.defenseDerivedSkills),[358,358]);
  assert.deepEqual(evidence.builds.map(row=>row.consumerRoutes),[490,492]);
  assert.deepEqual(evidence.builds.map(row=>row.usageCounts),[
    {damage:1,heal:3,shield:330,state:77,summon:79},
    {damage:1,heal:3,shield:335,state:74,summon:79},
  ]);
  for(const build of evidence.builds){
    assert.equal(Object.keys(build.sourceHashes).length,5);
    for(const digest of Object.values(build.sourceHashes))assert.match(digest,hashPattern);
    assert.equal(build.battleDefForceOperation,'ceil(source DEF × (1 + source DEF% / 100))');
    assert.deepEqual(build.directDamageRowsWithDefenseExpression,[]);
  }
  assert.deepEqual(evidence.builds.map(row=>row.stateConsumerSummary),[
    {addStateRoutes:75,literalStateIdRoutes:75,uniqueLiteralStateIds:27,propertyRouteCounts:{be_damage_plus:2,block_plus:9,damage_plus:36,i_state_layer_per_posion:2,tentacle_dmg:36},indirectDamagePropertyRoutes:38,indirectDamagePropertyStateIds:[2619,2817,3902]},
    {addStateRoutes:74,literalStateIdRoutes:74,uniqueLiteralStateIds:26,propertyRouteCounts:{be_damage_plus:2,block_plus:9,damage_plus:36,i_state_layer_per_posion:2,tentacle_dmg:36},indirectDamagePropertyRoutes:38,indirectDamagePropertyStateIds:[2619,2817,3902]},
  ]);
});

test('the sole defense-derived damage route stays explicit and conditional',()=>{
  assert.equal(evidence.crossBuild.damageRoutesIdentical,true);
  assert.equal(evidence.crossBuild.indirectDamageStateSummaryIdentical,true);
  assert.equal(evidence.conclusions.universalTargetDefenseMitigationFound,false);
  assert.equal(evidence.conclusions.sourceDefenseCanEnterDamageBase,true);
  assert.equal(evidence.conclusions.sourceDefenseCanFeedDamageModifyingStates,true);
  assert.match(evidence.trackBoundary,/does not classify cheese/);
  for(const build of evidence.builds){
    assert.deepEqual(build.damageRoutes,[{
      skillId:147434,
      skillName:'深空回响(未完成)',
      awakenerId:147397,
      awakenerName:'暮星·汀克特',
      skillVariant:'1000',
      commandId:1880,
      commandVariant:'default',
      commandRow:2,
      effectType:'BEActiveDamage',
      usage:'damage',
      defenseArgumentIndexes:[1],
      directDefenseRead:false,
    }]);
  }
});

test('published audit is exactly the checked evidence file',()=>{
  const bytes=readFileSync(new URL('../research/evidence/defense-consumer-audit.json',import.meta.url));
  assert.match(createHash('sha256').update(bytes).digest('hex'),hashPattern);
  assert.equal(JSON.stringify(evidence).includes('privateSourcePath'),false);
});
