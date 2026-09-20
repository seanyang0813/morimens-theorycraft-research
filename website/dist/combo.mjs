import {applySingularityToCombo,singularityLayers} from './engine/singularity-realm.mjs';
export function calculateCombo(report,{mastery,amplification,shuttle}){
  if(!Number.isSafeInteger(mastery)||mastery<0)throw new Error('Enter a nonnegative whole-number final Realm Mastery.');
  if(!Number.isFinite(amplification)||amplification<0)throw new Error('Enter a nonnegative final Damage Amplification.');
  if(!['unused','used'].includes(shuttle))throw new Error('Select the starting Shuttle state.');
  const adjusted=JSON.parse(JSON.stringify(report));
  for(const row of adjusted.rounds)for(const key of ['aHit','blast','pursuit'])if(row[key])row[key].utilityInputs.basicDamagePer=amplification;
  const schedule=Array(10).fill(0);
  if(shuttle==='unused')schedule[0]=singularityLayers(mastery).beacon;
  return applySingularityToCombo(adjusted,{finalRealmMastery:mastery,beaconLayersByPlayedCard:schedule});
}
