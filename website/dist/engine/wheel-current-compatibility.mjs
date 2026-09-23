// Static source boundary for historical Wheel identities in the installed client.
// This does not execute a Wheel, verify enhancement scaling, or grant legality.
const known=new Set(['INITIAL_DIRECT_PROPERTY_UNCHANGED','INITIAL_DIRECT_PROPERTY_CHANGED','ITEM_REPLACED_EQUIVALENT_INITIAL_RULE','CURRENT_ONLY_UNIQUE_ICON_MAINSTAT_BASE_MATCH','ITEM_ATTRIBUTES_CHANGED','HISTORICAL_ITEM_ABSENT','LINKED_STATE_ABSENT','ITEM_INITIAL_STATE_LINK_CHANGED','HISTORICAL_CROSSWALK_UNRESOLVED']);
const retained=new Set(['INITIAL_DIRECT_PROPERTY_UNCHANGED','INITIAL_DIRECT_PROPERTY_CHANGED','ITEM_REPLACED_EQUIVALENT_INITIAL_RULE']);

export function assessInstalledWheelIdentity(wheelId,report){
  if(typeof wheelId!=='string'||!wheelId)throw new Error('Explicit Wheel ID required');
  if(!report)return {wheelId,status:'COMPATIBILITY_AUDIT_REQUIRED',catalogMainstatBaseMatches:false,itemAttributeRowsEqual:false,initialDirectPropertiesEqual:null};
  if(report.kind!=='MORIMENS_PC_RES151_WHEEL_INITIAL_STATE_COMPATIBILITY'||report.status!=='PARTIAL_COMPATIBILITY'||report.currentBuild!=='pc-res151-build51'||!Array.isArray(report.wheels)||report.wheels.length!==146)throw new Error('Installed resource-151 Wheel compatibility audit required');
  const matches=report.wheels.filter(row=>row?.wheelId===wheelId);
  if(matches.length!==1||!known.has(matches[0].status))throw new Error('Wheel identity is absent or duplicated in the installed compatibility audit');
  const status=matches[0].status;
  return {wheelId,status,catalogMainstatBaseMatches:retained.has(status)||status==='CURRENT_ONLY_UNIQUE_ICON_MAINSTAT_BASE_MATCH',itemAttributeRowsEqual:retained.has(status),initialDirectPropertiesEqual:status==='CURRENT_ONLY_UNIQUE_ICON_MAINSTAT_BASE_MATCH'?null:status==='INITIAL_DIRECT_PROPERTY_UNCHANGED'||status==='ITEM_REPLACED_EQUIVALENT_INITIAL_RULE'};
}
