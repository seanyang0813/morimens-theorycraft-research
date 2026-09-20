import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolveScalarSkillField} from '../engine/skill-field.mjs';
if(process.argv.length!==3){console.error('Usage: node tools/resolve_skill_field.mjs request.json');process.exitCode=2;}
else try{
  const request=JSON.parse(readFileSync(process.argv[2],'utf8'));
  const keys=['skillId','field','isAwaker','breakSkillLevel','potencyLevel','conditionResults'];
  if(!request||keys.some(key=>!Object.hasOwn(request,key))||Object.keys(request).some(key=>!keys.includes(key))||!/^\d+$/.test(String(request.skillId))||!request.conditionResults||Array.isArray(request.conditionResults))throw new Error('Explicit skill-field request required');
  const bytes=readFileSync(new URL('../research/extracted/config/Skill.json',import.meta.url)),skills=JSON.parse(bytes);
  if(!Object.hasOwn(skills,String(request.skillId)))throw new Error('Unknown skill ID');
  const reads=[];
  const result=resolveScalarSkillField({...request,skill:skills[String(request.skillId)],evaluate:expression=>{
    if(!Object.hasOwn(request.conditionResults,expression))throw new Error('Unresolved runtime condition: '+expression);
    const value=request.conditionResults[expression];reads.push({expression,value});return value;
  }});
  console.log(JSON.stringify({status:'EXPERIMENTAL_FIELD_LOOKUP',build:'pc-res144-build51',skillId:request.skillId,field:request.field,sourceSha256:createHash('sha256').update(bytes).digest('hex'),result,conditionReads:reads,
    limitations:['Supplied internal progression levels and condition outcomes','One scalar field only; not card execution, build assembly or gameplay validation']},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
