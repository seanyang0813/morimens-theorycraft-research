"""Compare resource-150 connected HP generated-phase execution with baseline fixtures."""
import hashlib,json
from connected_hp_listener_oracle import ConnectedHpListenerOracle,ROOT
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    module_dir=ROOT/'research/observations/current-res150-build51/modules';comparison_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json';phase_path=ROOT/'research/evidence/pc-res150-skill-phase-modules.json';fixture_path=ROOT/'tests/synthetic/original-connected-hp-generated-phase.json';output=ROOT/'research/evidence/pc-res150-connected-hp-generated-phase-runtime.json'
    comparison=json.loads(comparison_path.read_text(encoding='utf-8'));phase=json.loads(phase_path.read_text(encoding='utf-8'));assets={};hashes={'comparison':sha(comparison_path),'phaseModules':sha(phase_path),'fixture':sha(fixture_path)}
    for name in ('BattleConst','BattleEngine','BattleCmdServer'):
        path=module_dir/f'{name}.lua';rows=[row for row in comparison['combatModules'] if row['name']==f'{name}.lua']
        if len(rows)!=1 or len(rows[0].get('current') or [])!=1 or sha(path)!=rows[0]['current'][0]['sha256']:raise ValueError(f'Current module mismatch: {name}')
        assets[name]={'output':str(path.relative_to(ROOT)).replace('\\','/')};hashes[f'current{name}']=sha(path)
    identical=('BattleStateServer.lua',);rows={row['name']:row for row in comparison['combatModules']}
    if any(rows[name].get('status')!='IDENTICAL' for name in identical):raise ValueError('State callback module changed')
    phase_rows={row['name']:row for row in phase['modules']}
    for name in ('BEGenerateTargets.lua','BECreateSkillPhase.lua','BattleEffectServer.lua','BattleEffectMgrServer.lua'):
        if phase_rows.get(name,{}).get('status')!='IDENTICAL':raise ValueError(f'Phase module changed: {name}')
    fixtures=json.loads(fixture_path.read_text(encoding='utf-8'))['fixtures'];oracle=ConnectedHpListenerOracle(assets);mismatches=[]
    for row in fixtures:
        actual=oracle.run_hp_listener(row['input'])
        if actual!=row['expected']:mismatches.append({'input':row['input'],'baseline':row['expected'],'current':actual})
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'RoleHpChanged -> state trigger -> BEGenerateTargets -> BECreateSkillPhase -> TriggerCmd','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':hashes,'fixtures':len(fixtures),'exactMatches':len(fixtures)-len(mismatches),'mismatches':len(mismatches),'results':mismatches,'scope':'Current engine/constants/command bytecode plus identical state, target, phase and effect modules. Actual target and phase effect bodies execute; original TriggerCmd executes with explicit StateOwner expression and empty-effect-list adapters.','limitations':['Direct generated-effect execution, no scheduler completion','No real command rows or target parser construction','StateTriggerEnd constructed but not executed','No gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':len(fixtures),'exactMatches':report['exactMatches'],'output':str(output.relative_to(ROOT))},indent=2))
if __name__=='__main__':main()
