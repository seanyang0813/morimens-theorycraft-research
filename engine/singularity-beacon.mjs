import {singularityLayers} from './singularity-realm.mjs';

// State126900.Judgement4 and Cmd134388. Call only for an actual before-use event.
// Does not infer that an attached action dispatches such an event.
export function beforePlayedCardBeacon({cardTypes,existingBeaconLayers,shuttleUses,extraShuttles,finalRealmMastery}){
  if(!Array.isArray(cardTypes)||cardTypes.some(x=>typeof x!=='string'))throw new Error('Explicit card types required');
  for(const value of [existingBeaconLayers,shuttleUses,extraShuttles])if(!Number.isSafeInteger(value)||value<0)throw new Error('Explicit nonnegative state counts required');
  const layers=singularityLayers(finalRealmMastery).beacon;
  const matches=cardTypes.some(x=>['Card_Strike','Card_Defend','Card_Skill','Card_Extend'].includes(x));
  const eligible=matches&&existingBeaconLayers===0&&(shuttleUses===0||extraShuttles>0);
  return {eligible,temporaryBeaconLayers:eligible?layers:0,admissionMarker:eligible};
}

// Cmd126890 rows17/18: only ordinary rounds spend extra admissions and count use.
// This records the counter transition, not copy creation or its downstream events.
export function afterPlayedCardShuttle({admissionMarker,isDimensionBout,shuttleUses,extraShuttles}){
  if(typeof admissionMarker!=='boolean'||typeof isDimensionBout!=='boolean')throw new Error('Explicit admission and round flags required');
  for(const value of [shuttleUses,extraShuttles])if(!Number.isSafeInteger(value)||value<0)throw new Error('Explicit nonnegative state counts required');
  const copiesToDimension=admissionMarker&&!isDimensionBout;
  return {copiesToDimension,shuttleUses:shuttleUses+(copiesToDimension?1:0),extraShuttles:Math.max(0,extraShuttles-(copiesToDimension&&shuttleUses>0?1:0))};
}
