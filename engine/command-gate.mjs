// Ordinary PvE lg_UseCard dispatch gate; not a full turn/play legality check.
export function checkPvePlayDispatch(v){
  if(!v||['waiting','rootExists','finished'].some(k=>typeof v[k]!=='boolean')||!Number.isSafeInteger(v.waitingTimes)||v.waitingTimes<0||v.waitingTimes>=Number.MAX_SAFE_INTEGER||Object.keys(v).some(k=>!['waiting','rootExists','finished','waitingTimes'].includes(k)))throw new Error('Explicit PvE command gate state required');
  let dispatch=false,waitingTimesAfter=v.waitingTimes,robotWaitingCalled=false,timeoutFlags=[],gate;
  if(v.waiting){gate='waiting';waitingTimesAfter++;if(waitingTimesAfter>=5){robotWaitingCalled=true;timeoutFlags=[true,false];}}
  else if(v.rootExists)gate='running-effect';
  else if(v.finished)gate='battle-finished';
  else{dispatch=true;gate='dispatch';waitingTimesAfter=0;}
  return {status:'EXPERIMENTAL',dispatch,gate,waitingTimesAfter,robotWaitingCalled,timeoutFlags,
    unresolvedDependencies:['Robot waiting response observed but not executed','Camp1 per-turn play limit and card lookup/checks occur after this gate','No target selection, turn advance or gameplay validation']};
}
