import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {oldEmbersCommand} from '../engine/old-embers.mjs';

export function replayMechanicObservation(record){
  if(!record||record.kind!=='REAL_GAME_OBSERVATION')throw new Error('Real gameplay observation required');
  const check=record.mechanicRegression;
  if(!check||check.schemaVersion!==1||check.model!=='old-embers-active-statistics-v1')throw new Error('Unsupported mechanic regression');
  if(check.retrospective!==true||check.holdout!==false)throw new Error('Mechanic regression must declare retrospective non-holdout status');
  if(!Number.isFinite(check.observedCreditedDamage)||check.observedCreditedDamage<0)throw new Error('Observed credited damage must be nonnegative');
  const result=oldEmbersCommand(check.modelInput);
  if(result.triggerAmount===null||!Number.isFinite(result.hpChangeRequest)||result.hpChangeRequest>=0)throw new Error('Model input does not produce an Old Embers HP-loss request');
  const predictedCreditedDamage=Math.abs(result.hpChangeRequest);
  return {
    model:check.model,
    build:check.modelInput.build,
    predictedCreditedDamage,
    observedCreditedDamage:check.observedCreditedDamage,
    difference:predictedCreditedDamage-check.observedCreditedDamage,
    exactMatch:predictedCreditedDamage===check.observedCreditedDamage,
    triggerAmount:result.triggerAmount,
    stacksConsumed:result.stacksConsumed,
    scope:'Retrospective source-statistics mechanic regression; not a full hit prediction or holdout',
  };
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  if(process.argv.length!==3)throw new Error('Usage: node tools/replay_mechanic_observation.mjs observation.json');
  console.log(JSON.stringify(replayMechanicObservation(JSON.parse(readFileSync(process.argv[2],'utf8'))),null,2));
}
