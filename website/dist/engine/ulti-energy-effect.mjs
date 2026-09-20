// Synchronous original target-major repetition; dynamic calculations stay callbacks.
export function runUltiEnergyEffect({parameters,targets,source,calculate,gain}){
  if(!Array.isArray(parameters)||parameters.length<1||parameters.length>3||!Number.isFinite(parameters[0])||parameters.some(v=>v!==null&&!Number.isFinite(v))||!Array.isArray(targets)||targets.some(uid=>!Number.isSafeInteger(uid))||!source||!['castRoleUid','cmdServerUid','skillConfigId'].every(k=>Number.isSafeInteger(source[k]))||typeof calculate!=='function'||typeof gain!=='function')throw new Error('Explicit numeric effect parameters, targets, source identities and callbacks required');
  const base=Math.ceil(parameters[0])||0,times=Math.ceil(parameters[1]??1)||0,showText=(parameters[2]??1)===1;
  if(!Number.isSafeInteger(times))throw new Error('Unsupported repeat range');
  const applications=[];
  for(const target of targets)for(let i=0;i<times;i++){
    const value=calculate(base,target);
    if(!Number.isFinite(value))throw new Error('Unresolved energy calculation');
    const extraData={castRoleUid:source.castRoleUid,reason:3,cmdServerUid:source.cmdServerUid,castValue:value,skillConfigId:source.skillConfigId,showText};
    const result=gain(target,value,extraData);
    applications.push({target,repetition:i+1,value,source:{...extraData},result});
  }
  return {returned:true,initialization:{base,times,showText},applications,
    unresolvedDependencies:['Presentation superclass omitted; VFX may consume RNG','Explicit calculation/gain callbacks and source identities','No full command lifecycle or independent gameplay validation']};
}
