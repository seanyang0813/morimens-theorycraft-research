// Original GetEffectDelayTimes arithmetic with explicitly resolved animation times.
export function calculateCommandDelays({delays,preCommand,executeCommand,castTimes}){
  if(!Array.isArray(delays)||typeof preCommand!=='boolean'||typeof executeCommand!=='boolean'||!castTimes||Array.isArray(castTimes))throw new Error('Explicit delays, command flags and cast times required');
  let total=0,usedCast=false;const absolute=[],castTimeReads=[];
  for(const input of delays){
    if(input!==null&&input!==false&&typeof input!=='string'&&!Number.isFinite(input))throw new Error('Unsupported delay value');
    const d=input===null||input===false?(usedCast?0:'cast'):input;
    let numeric=typeof d==='number'?d:null;
    if(typeof d==='string'){
      if(/^[+-]?0x/i.test(d.trim()))throw new Error('Hexadecimal Lua numeric delay is not supported');
      if(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(d.trim()))numeric=Number(d);
    }
    if(numeric!==null){
      if(!Number.isFinite(numeric))throw new Error('Nonfinite delay');
      total+=numeric/1000;
    }else{
      usedCast=true;
      if(!preCommand&&!executeCommand){
        if(!Object.hasOwn(castTimes,d)||(castTimes[d]!==null&&!Number.isFinite(castTimes[d])))throw new Error(`Unresolved cast time: ${d}`);
        castTimeReads.push(d);if(castTimes[d]!==null)total=castTimes[d];
      }
    }
    absolute.push(total);
    for(let i=0;i<absolute.length;i++)if(absolute[i]>total)absolute[i]=total;
  }
  return {delays:absolute.map((t,i)=>t-(absolute[i-1]??0)),castTimeReads};
}
