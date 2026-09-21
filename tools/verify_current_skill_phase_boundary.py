"""Run selected skill-phase boundary fixtures against resource 150."""
import hashlib
import json

from skill_phase_finish_oracle import PhaseFinishOracle, ROOT
from state_owner_target_oracle import StateOwnerOracle
from command_argument_oracle import ArgumentOracle
from connected_skill_arguments_oracle import ConnectedArguments
from command_row_order_oracle import RowOracle
from command_delay_oracle import DelayOracle
from trigger_cmd_oracle import TriggerCmdOracle
from connected_skill_phase_oracle import ConnectedSkillPhaseOracle


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir=ROOT/'research/observations/current-res150-build51/modules'
    combat_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json'
    phase_path=ROOT/'research/evidence/pc-res150-skill-phase-modules.json'
    finish_path=ROOT/'tests/synthetic/original-skill-phase-finish.json'
    target_path=ROOT/'tests/synthetic/original-state-owner-target.json'
    argument_path=ROOT/'tests/synthetic/original-command-arguments.json'
    skill_argument_path=ROOT/'tests/synthetic/original-connected-skill-arguments.json'
    row_path=ROOT/'research/evidence/command-row-order.json'
    delay_path=ROOT/'tests/synthetic/original-command-delays.json'
    trigger_path=ROOT/'tests/synthetic/original-trigger-cmd.json'
    connected_phase_path=ROOT/'tests/synthetic/original-connected-skill-phase.json'
    output=ROOT/'research/evidence/pc-res150-skill-phase-boundary-runtime.json'
    combat={row['name']:row for row in json.loads(combat_path.read_text(encoding='utf-8'))['combatModules']}
    phase={row['name']:row for row in json.loads(phase_path.read_text(encoding='utf-8'))['modules']}
    assets={};hashes={'combatComparison':sha(combat_path),'phaseComparison':sha(phase_path),'finishFixture':sha(finish_path),'targetFixture':sha(target_path),'argumentFixture':sha(argument_path),'skillArgumentFixture':sha(skill_argument_path),'rowFixture':sha(row_path),'delayFixture':sha(delay_path),'triggerFixture':sha(trigger_path),'connectedPhaseFixture':sha(connected_phase_path)}
    for name in ('BattleConst','BattleUtilServer','BattlePropertyServer'):
        path=module_dir/f'{name}.lua';expected=combat[f'{name}.lua']['current'][0]
        if sha(path)!=expected['sha256']:raise ValueError(f'Current module mismatch: {name}')
        assets[name]={'output':str(path.relative_to(ROOT)).replace('\\','/')};hashes[f'current{name}']=sha(path)
    for name in ('BattleCmdServer','BattleCmdParser'):
        path=module_dir/f'{name}.lua';expected=phase[f'{name}.lua']['current']
        if sha(path)!=expected['sha256']:raise ValueError(f'Current module mismatch: {name}')
        assets[name]={'output':str(path.relative_to(ROOT)).replace('\\','/')};hashes[f'current{name}']=sha(path)
    for name in ('BECreateSkillPhase.lua','BattleCmdTargetsExp.lua'):
        if phase[name]['status']!='IDENTICAL':raise ValueError(f'{name} equality required')
    finish=json.loads(finish_path.read_text(encoding='utf-8'));target=json.loads(target_path.read_text(encoding='utf-8'));argument=json.loads(argument_path.read_text(encoding='utf-8'));skill_argument=json.loads(skill_argument_path.read_text(encoding='utf-8'));row_report=json.loads(row_path.read_text(encoding='utf-8'));delay=json.loads(delay_path.read_text(encoding='utf-8'));trigger=json.loads(trigger_path.read_text(encoding='utf-8'));connected_phase=json.loads(connected_phase_path.read_text(encoding='utf-8'))
    finish_oracle=PhaseFinishOracle(assets);target_oracle=StateOwnerOracle(assets);argument_oracle=ArgumentOracle(assets);skill_argument_oracle=ConnectedArguments(assets);row_oracle=RowOracle(assets);delay_oracle=DelayOracle(assets);trigger_oracle=TriggerCmdOracle(assets);connected_phase_oracle=ConnectedSkillPhaseOracle(assets)
    domains={};mismatch_rows=[]
    for domain,fixture,oracle,method in (
        ('phaseFinish',finish,finish_oracle,'run_finish'),
        ('stateOwnerTarget',target,target_oracle,'run_target'),
        ('argumentLookup',argument,argument_oracle,'run'),
        ('skillArguments',skill_argument,skill_argument_oracle,'run'),
        ('commandDelays',delay,delay_oracle,'run'),
        ('triggerCmd',trigger,trigger_oracle,'run'),
        ('connectedPhaseStart',connected_phase,connected_phase_oracle,'run_phase'),
    ):
        mismatches=[]
        for row in fixture['fixtures']:
            actual=getattr(oracle,method)(row['input'])
            if actual!=row['expected']:mismatches.append({'input':row['input'],'baseline':row['expected'],'current':actual})
        total=len(fixture['fixtures']);domains[domain]={'fixtures':total,'exactMatches':total-len(mismatches),'mismatches':len(mismatches)}
        mismatch_rows.extend({'domain':domain,**row} for row in mismatches)
    row_mismatches=[]
    for fixture in row_report['fixtures']:
        actual=row_oracle.run(fixture['skipPhase'],fixture['notAwakerCardPerform'])
        if actual!=fixture['effects']:row_mismatches.append({'input':{'skipPhase':fixture['skipPhase'],'notAwakerCardPerform':fixture['notAwakerCardPerform']},'baseline':fixture['effects'],'current':actual})
    domains['commandRowOrder']={'fixtures':len(row_report['fixtures']),'exactMatches':len(row_report['fixtures'])-len(row_mismatches),'mismatches':len(row_mismatches)}
    mismatch_rows.extend({'domain':'commandRowOrder',**item} for item in row_mismatches)
    total=sum(row['fixtures'] for row in domains.values());exact=sum(row['exactMatches'] for row in domains.values())
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'selected skill-phase command/parser boundary','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatch_rows else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':hashes,'fixtures':total,'exactMatches':exact,'mismatches':len(mismatch_rows),'domains':domains,'results':mismatch_rows,'scope':'Resource-150 BattleCmdServer TriggerCmd through effect-list construction, phase cleanup, skill arguments, delay planning and row ordering plus BattleCmdParser StateOwner selection, target handoff and ArgN lookup, with byte-identical phase and target-expression modules.','limitations':['Effect objects are observed adapters rather than real effects; no target-expression initialization, event listener dispatch, complete card phase, gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':total,'exactMatches':exact,'domains':domains,'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
