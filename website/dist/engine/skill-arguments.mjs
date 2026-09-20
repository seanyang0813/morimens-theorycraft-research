// Numeric, dense-list subset of GetSkillArgs. Overrides replace AFTER ceiling.
export function normalizeSkillArguments(raw,overrides){
 const dense=a=>Array.isArray(a)&&Array.from({length:a.length},(_,i)=>i).every(i=>Object.hasOwn(a,i)&&Number.isFinite(a[i]));
 if(!dense(raw)||!dense(overrides))throw new Error('Explicit dense finite numeric argument arrays required');
 const args=raw.map(Math.ceil);
 overrides.forEach((v,i)=>{args[i]=v;});
 return args;
}
