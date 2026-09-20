"""Audit actual exported command-reference formats without evaluating conditions."""
import collections
import hashlib
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'research/extracted/config/Skill.json';skills=json.loads(path.read_text(encoding='utf-8'))
counts=collections.Counter();unmarked=[];temporary=collections.Counter()
for sid,skill in skills.items():
    for key in skill:
        if key.startswith('temp'):temporary[key]+=1
    value=skill.get('CmdList')
    if isinstance(value,dict):
        nested=any(isinstance(entry,dict) for entry in value.values())
        if nested:
            counts['nestedConditionalMarkedPvp' if skill.get('IsPVP') else 'nestedUnmarked']+=1
            if not skill.get('IsPVP'):unmarked.append(sid)
        else:counts['scalarProgressionMap']+=1
    elif isinstance(value,(int,str)):counts['directScalar']+=1
    elif value is None:counts['absent']+=1
    else:counts['other']+=1
report={'build':'pc-res144-build51','status':'STATIC_ROUTING_AUDIT','sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'skillCount':len(skills),'commandReferenceCounts':dict(counts),'temporaryFieldCounts':dict(temporary),'unmarkedNestedSkillIds':unmarked,
        'limitations':['Exported table shape/flags only, not condition evaluation or skill execution','Inspected ResourceCache.GetLine clones source rows; owner hook and other mutation paths are not exhaustively audited','No independent gameplay validation']}
assert sum(counts.values())==len(skills)
(ROOT/'research/evidence/skill-routing-audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2))
