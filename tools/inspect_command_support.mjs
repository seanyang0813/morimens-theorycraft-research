import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectCommandSupport} from '../engine/inspect-command-support.mjs';
const bytes=readFileSync(new URL('../research/extracted/config/Cmd.json',import.meta.url));
const commands=JSON.parse(bytes),counts={},reports={};
for(const [id,command] of Object.entries(commands)){
  const r=inspectCommandSupport({command});reports[id]=r;
  for(const row of r.rows)for(const b of row.blockers){const key=[b.code,b.field??b.value??''].join(':');counts[key]=(counts[key]??0)+1;}
}
const report={build:'pc-res144-build51',sourceSha256:createHash('sha256').update(bytes).digest('hex'),commandCount:Object.keys(commands).length,structurallyCompatible:Object.values(reports).filter(r=>r.structurallyCompatible).length,blockerCounts:counts,commands:reports};
writeFileSync(new URL('../research/evidence/command-support-audit.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({commandCount:report.commandCount,structurallyCompatible:report.structurallyCompatible,mostFrequentBlockers:Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,12)},null,2));
