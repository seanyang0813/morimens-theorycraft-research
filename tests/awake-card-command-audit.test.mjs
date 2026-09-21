import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

const read=name=>{const bytes=readFileSync(new URL(`../${name}`,import.meta.url));return {bytes,data:JSON.parse(bytes)}};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('Awake card audit separates command mechanics from direct damage assembly',()=>{
  const audit=read('research/evidence/pc-awake-card-command-audit.json');
  const comparison=read('research/evidence/pc-res144-to-res150-combat-build.json');
  const skills=read('research/extracted/config/Skill.json');
  const commands=read('research/extracted/config/Cmd.json');
  assert.equal(audit.data.sourceHashes.buildComparison,hash(comparison.bytes));
  assert.equal(audit.data.sourceHashes['pc-res144-build51'].skillExport,hash(skills.bytes));
  assert.equal(audit.data.sourceHashes['pc-res144-build51'].cmdExport,hash(commands.bytes));
  assert.deepEqual(Object.fromEntries(Object.entries(audit.data.builds).map(([build,row])=>[build,{
    awakeSkills:row.awakeSkills,linkedCommands:row.linkedCommands,missingCommands:row.missingCommands,directDamageRows:row.directDamageRows,
  }])),{
    'pc-res144-build51':{awakeSkills:69,linkedCommands:64,missingCommands:0,directDamageRows:0},
    'pc-res150-build51':{awakeSkills:69,linkedCommands:64,missingCommands:0,directDamageRows:0},
  });
  assert.equal(audit.data.builds['pc-res144-build51'].commandRows,314);
  assert.equal(audit.data.builds['pc-res150-build51'].commandRows,315);
  assert.equal(audit.data.builds['pc-res150-build51'].effectTypeCounts.BERemoveState,1);
  for(const row of Object.values(audit.data.builds)){
    assert.equal(row.literalNestedCommands,3);
    assert.equal(row.literalNestedCommandRows,11);
    assert.equal(row.literalNestedMissingCommands,0);
    assert.equal(row.literalNestedDamageRows,1);
    assert.deepEqual(row.literalNestedDamageTypeCounts,{BEPassiveDamage:1});
    assert.equal(row.dynamicRunCardRows,1);
  }
});
