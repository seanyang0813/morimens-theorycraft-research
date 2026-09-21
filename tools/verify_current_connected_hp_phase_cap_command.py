"""Compare the resource-150 HP-to-60406 command path with baseline fixtures."""
import hashlib
import json

from connected_hp_listener_oracle import ConnectedHpListenerOracle, PHASE_CAP_COMMAND_60405, PHASE_CAP_COMMAND_60406, ROOT


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir=ROOT/'research/observations/current-res150-build51/modules'
    comparison_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json'
    phase_path=ROOT/'research/evidence/pc-res150-skill-phase-modules.json'
    fixture_path=ROOT/'tests/synthetic/original-connected-hp-phase-cap-command.json'
    current_cmd_path=module_dir/'Cmd.json'
    output=ROOT/'research/evidence/pc-res150-connected-hp-phase-cap-command-runtime.json'
    comparison=json.loads(comparison_path.read_text(encoding='utf-8'));phase=json.loads(phase_path.read_text(encoding='utf-8'))
    assets={};hashes={'comparison':sha(comparison_path),'phaseModules':sha(phase_path),'fixture':sha(fixture_path),'currentCmdCatalog':sha(current_cmd_path)}
    for name in ('BattleConst','BattleEngine','BattleCmdServer'):
        path=module_dir/f'{name}.lua';rows=[row for row in comparison['combatModules'] if row['name']==f'{name}.lua']
        if len(rows)!=1 or len(rows[0].get('current') or [])!=1 or sha(path)!=rows[0]['current'][0]['sha256']:raise ValueError(f'Current module mismatch: {name}')
        assets[name]={'output':str(path.relative_to(ROOT)).replace('\\','/')};hashes[f'current{name}']=sha(path)
    rows={row['name']:row for row in comparison['combatModules']}
    if rows['BattleStateServer.lua'].get('status')!='IDENTICAL':raise ValueError('State callback module changed')
    phase_rows={row['name']:row for row in phase['modules']}
    for name in ('BEGenerateTargets.lua','BECreateSkillPhase.lua','BattleEffectServer.lua','BattleEffectMgrServer.lua'):
        if phase_rows.get(name,{}).get('status')!='IDENTICAL':raise ValueError(f'Phase module changed: {name}')
    current_commands=json.loads(current_cmd_path.read_text(encoding='utf-8'))
    for command_id,baseline in ((60406,PHASE_CAP_COMMAND_60406),(60405,PHASE_CAP_COMMAND_60405)):
        current=current_commands[str(command_id)]['data_list'];normalized=[]
        for index in range(1,len(baseline)+1):normalized.append({key:value for key,value in current[str(index)].items() if key!='BaseSortID'})
        expected=[{key:value for key,value in row.items() if key!='BaseSortID'} for row in baseline]
        if normalized!=expected:raise ValueError(f'Current command {command_id} rows differ from baseline')
    fixtures=json.loads(fixture_path.read_text(encoding='utf-8'))['fixtures'];oracle=ConnectedHpListenerOracle(assets);mismatches=[]
    for row in fixtures:
        actual=oracle.run_hp_listener(row['input'])
        if actual!=row['expected']:mismatches.append({'input':row['input'],'baseline':row['expected'],'current':actual})
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'RoleHpChanged -> state trigger -> generated target/phase -> TriggerCmd -> command 60406 rows','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':hashes,'fixtures':len(fixtures),'exactMatches':len(fixtures)-len(mismatches),'mismatches':len(mismatches),'results':mismatches,'resultsCatalogRows':{'60406':8,'60405':7},'scope':'Current engine/constants/command bytecode, exact current command-60406 and command-60405 row comparisons, and identical state/target/phase/effect modules. The original runtime traverses all eight configured first-phase command rows after eligible HP changes.','limitations':['StateOwner and TriggerPara-to-Arg1 are explicit adapters','Delays and final effect constructors are observers','No command conditions or effect bodies execute','Second-phase rows are catalog-compared but not connected through the HP runtime fixture','No scheduler completion, gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':len(fixtures),'exactMatches':report['exactMatches'],'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
