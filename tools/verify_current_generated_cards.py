"""Replay generated-card runtime fixtures with current resource-150 dependencies."""
from pathlib import Path
import hashlib
import json

from add_new_card_oracle import AddNewCardOracle, CASES as ADD_CASES
from card_owner_oracle import CardOwnerOracle, CASES as OWNER_CASES
from create_card_oracle import CreateCardOracle, CASES as CREATE_CASES
from runtime_oracle import ROOT


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def asset(path):return {'output':str(path.relative_to(ROOT)).replace('\\','/'),'sha256':sha(path)}


def main():
    comparison_path=ROOT/'research/evidence/pc-res150-generated-card-modules.json';comparison=json.loads(comparison_path.read_text(encoding='utf-8'))
    if comparison.get('status')!='IDENTICAL':raise ValueError('Current generated-card core modules are not identical')
    private=ROOT/'research/observations/current-res150-build51/modules';const=private/'BattleConst.lua';logic=private/'BattleLogicEvent.lua'
    overrides={'BattleConst':asset(const)}
    create=CreateCardOracle(overrides);add=AddNewCardOracle({**overrides,'BattleLogicEvent':asset(logic)});owner=CardOwnerOracle(overrides)
    domains=[('create',CREATE_CASES,create.evaluate,ROOT/'tests/synthetic/original-create-card.json'),('add',ADD_CASES,add.run,ROOT/'tests/synthetic/original-add-new-card.json'),('owner',OWNER_CASES,owner.run_owner,ROOT/'tests/synthetic/original-card-owner.json')]
    results=[];total=0
    for name,cases,run,fixture_path in domains:
        expected=json.loads(fixture_path.read_text(encoding='utf-8'))['fixtures'];actual=[{'input':case,'expected':run(case)} for case in cases];equal=actual==expected;results.append({'domain':name,'fixtures':len(cases),'exactMatch':equal,'baselineFixtureSha256':sha(fixture_path)});total+=len(cases)
        if not equal:raise ValueError(f'Current generated-card {name} fixtures differ')
    report={'schemaVersion':1,'kind':'MORIMENS_PC_GENERATED_CARD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN','fixtures':total,'domains':results,'sourceHashes':{'moduleComparison':sha(comparison_path),'BattleConst':sha(const),'BattleLogicEvent':sha(logic)},'scope':'Current resource-150 BattleConst and BattleLogicEvent with byte-identical BECreateCard, BattleCardMgrServer and BattleCardServer over inherited request, selected deck-mutation and owner-resolution fixtures. Private modules are not published.','limitations':['Only the inherited synthetic fixture domains are covered','Ordinary Dimension/MonsterDimension capacity, random placement, constructor command/state initialization and listeners remain unresolved','No gameplay or holdout credit']}
    output=ROOT/'research/evidence/pc-res150-generated-card-runtime.json';output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':total,'domains':results},indent=2))


if __name__=='__main__':main()
