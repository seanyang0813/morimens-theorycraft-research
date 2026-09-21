"""Generate browser-safe state classifiers from public evidence catalogs."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]


def generate(types,build,source,output):
    if not isinstance(types,dict) or set(types.values())-{'buff','debuff','none'}:
        raise ValueError('Malformed state type catalog')
    rows={kind:sorted(int(state_id) for state_id,value in types.items() if value==kind) for kind in ['buff','debuff','none']}
    if sum(map(len,rows.values()))!=len(types):
        raise ValueError('Incomplete state classification')
    body="""// Generated from %s. Do not hand edit.
const buff=new Set(%s);
const debuff=new Set(%s);
const none=new Set(%s);
export function classifyTargetStateIds(stateIds){
  if(!Array.isArray(stateIds)||stateIds.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(stateIds).size!==stateIds.length)throw new Error('Target state IDs must be unique positive safe integers');
  const types=stateIds.map(stateId=>{if(buff.has(stateId))return {stateId,type:'buff'};if(debuff.has(stateId))return {stateId,type:'debuff'};if(none.has(stateId))return {stateId,type:'none'};throw new Error(`Unknown %s state ID: ${stateId}`);});
  return {targetHasBuff:types.some(row=>row.type==='buff'),targetHasDebuff:types.some(row=>row.type==='debuff'),types};
}
"""%(source,json.dumps(rows['buff'],separators=(',',':')),json.dumps(rows['debuff'],separators=(',',':')),json.dumps(rows['none'],separators=(',',':')),build)
    path=ROOT/output
    path.write_text(body,encoding='utf-8',newline='\n')
    print('Generated',path.relative_to(ROOT),'with',len(types),'classified state IDs')


baseline=json.loads((ROOT/'research/evidence/state-immunity-catalog.json').read_text(encoding='utf-8'))
if baseline.get('build')!='pc-res144-build51':
    raise ValueError('Unsupported baseline state catalog build')
current=json.loads((ROOT/'research/evidence/pc-res150-target-eligibility-catalog.json').read_text(encoding='utf-8'))
if current.get('currentBuild')!='pc-res150-build51' or current.get('status')!='EXACT_MATCH_FOR_SHARED_STATE_CLASSIFICATION_AND_TARGET_MAPPINGS':
    raise ValueError('Unsupported current state catalog evidence')
generate(baseline.get('stateTypes'),'PC144','research/evidence/state-immunity-catalog.json','engine/state-type-catalog.mjs')
generate(current.get('currentStateTypes'),'PC150','research/evidence/pc-res150-target-eligibility-catalog.json','engine/state-type-catalog-150.mjs')
