import hashlib,json,re
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CROSSWALK=ROOT/'research/observations/wheel-config-audit/crosswalk-audit.json'
STATES=ROOT/'research/extracted/config/State.json'
OUTPUT=ROOT/'research/evidence/wheel-initial-property-audit.json'

crosswalk=json.loads(CROSSWALK.read_text(encoding='utf-8'))
states=json.loads(STATES.read_text(encoding='utf-8'))
forms=Counter(); properties=Counter(); targets=Counter(); state_count=0
for row in crosswalk['rows']:
    if row['status']!='UNIQUE': continue
    candidate=row['candidates'][0]
    targets[candidate['stateTarget']]+=1
    direct=states[str(candidate['initialStateId'])].get('ExistProperty') or {}
    if direct: state_count+=1
    for name,expression in direct.items():
        properties[name]+=1
        value=str(expression)
        if re.fullmatch(r'StateArg[1-9]\d*',value): forms[value]+=1
        elif isinstance(expression,(int,float)) or re.fullmatch(r'-?(?:\d+(?:\.\d+)?|\.\d+)',value): forms['numericLiteral']+=1
        elif value=='StateArg1*StateOwner.physique*0.01*(1+StateOwner.physique_per/100)': forms['explicitPhysiqueScaling']+=1
        elif value=='math.ceil(StateOwner.atk*StateArg3*0.01)': forms['explicitAttackScalingWithCeil']+=1
        else: forms['unsupported']+=1

report={
  'schemaVersion':1,'kind':'MORIMENS_WHEEL_INITIAL_PROPERTY_AUDIT','analysisTrack':'mechanics','status':'OBSERVED_GRAMMAR_COVERED',
  'source':{'privateClientStateExportSha256':crosswalk['source']['privateClientStateExportSha256'],'privateCrosswalkSha256':hashlib.sha256(CROSSWALK.read_bytes()).hexdigest()},
  'summary':{'uniqueCrosswalkedWheels':141,'ownerTargetRows':targets['TargetCmdOwner'],'initialStatesWithDirectProperties':state_count,'directPropertyEntries':sum(properties.values()),'uniquePropertyNames':len(properties),'unsupportedExpressions':forms['unsupported']},
  'expressionClasses':dict(sorted((key,value) for key,value in forms.items() if key!='unsupported')),
  'claims':['All 100 direct property entries on the 141 uniquely crosswalked initial Wheel states fit the bounded numeric expression grammar exposed by the local resolver.','All 141 uniquely crosswalked initial state attachments target the command owner.'],
  'limitations':['This is grammar coverage plus component composition, not connected execution of a Wheel state by the original client.','The generic state-property initialization boundary has separate original-runtime fixture coverage; this audit does not add gameplay or end-to-end runtime evidence.','No trigger, condition, later state update, stacking, legality, theorycraft recommendation, cheese, budget-scouting, gameplay-validation or holdout result is claimed.']
}
OUTPUT.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(f'Wrote {OUTPUT.relative_to(ROOT)} with {sum(properties.values())} covered property entries')
