"""Check installed state-bonus accumulation method against decoded res144 body."""
import hashlib
import json
import struct

from audit_tentacle_source_parity import (ROOT, close, load, new, pointer, ptr,
                                          runtime_prototypes, spl)


def main():
    index=json.loads((ROOT/'research/symbols/lua-index.json').read_text(encoding='utf-8'))
    path=ROOT/next(row['prototype'] for row in index if row['name']=='BattleUnitBase.lua')
    original=json.loads(path.read_text(encoding='utf-8'))['children'][53]
    if (original['constants']!=['GetDamagePer2HasStateValue','pairs'] or
            [row['name'] for row in original['locals'][:4]]!=['self','target','ret','properties']):
        raise ValueError('Original state-aggregation method selection changed')
    module=ROOT/'research/observations/current-res151-build51/modules/BattleUnitBase.lua'
    payload=module.read_bytes()
    state=new()
    key=(ROOT/'research/raw/lua-public-key.txt').read_bytes()
    spl(state,key,len(key))
    try:
        if load(state,payload,len(payload),b'BattleUnitBase.lua')!=0:
            raise RuntimeError('Could not load installed BattleUnitBase.lua')
        candidates=[row for row in runtime_prototypes(ptr(pointer(state,-1)+24))
                    if row['constants']==original['constants']]
        if len(candidates)!=1:
            raise ValueError('Expected one installed state-aggregation method candidate')
        installed=candidates[0]
    finally:
        close(state)
    old_body=original['instructions_decoded'][1:]
    current_body=installed['instructions_decoded'][1:]
    if original['constant_tags']!=installed['constant_tags'] or old_body!=current_body:
        raise ValueError('Installed GetTotalDamagePer2HasState method differs')
    report={'schemaVersion':1,'kind':'MORIMENS_PC_INSTALLED_TENTACLE_STATE_ACCUMULATION_PARITY',
            'baselineBuild':'pc-res144-build51','installedBuild':'pc-res151-build51',
            'status':'SELECTED_METHOD_BODY_IDENTICAL',
            'installedModuleSha256':hashlib.sha256(payload).hexdigest(),
            'decodedMethodBodySha256':hashlib.sha256(struct.pack('<'+'I'*len(current_body),*current_body)).hexdigest(),
            'instructionCountExcludingSyntheticPrefix':len(current_body),
            'method':'BattleUnitBase.GetTotalDamagePer2HasState',
            'observedRule':'Adds positive, eligible per-state property values into a shared table by property name; SchoolCompPVE multiplies distinct accumulated properties after its Awaker loop.',
            'scope':'Selected installed method body and byte-identical installed SchoolCompPVE caller; target-state eligibility, property acquisition and gameplay remain separate.',
            'limitations':['Decoded method-body parity and synthetic adapter checks are not observed gameplay.',
                           'The synthetic adapter supplies already eligible state-property values; it does not reconstruct target state IDs.']}
    output=ROOT/'research/evidence/pc-res151-tentacle-state-accumulation-parity.json'
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Installed Tentacle state-accumulation method body identical')


if __name__=='__main__':
    main()
