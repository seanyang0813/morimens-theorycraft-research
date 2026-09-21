"""Compare resource-150 connected HP-to-state-trigger behavior with baseline fixtures."""
import hashlib,json
from connected_hp_listener_oracle import ConnectedHpListenerOracle,ROOT

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    module_dir=ROOT/'research/observations/current-res150-build51/modules';comparison_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json';scheduler_path=ROOT/'research/evidence/pc-res150-scheduler-modules.json';fixture_path=ROOT/'tests/synthetic/original-connected-hp-state-trigger.json';output=ROOT/'research/evidence/pc-res150-connected-hp-state-trigger-runtime.json'
    comparison=json.loads(comparison_path.read_text(encoding='utf-8'));scheduler=json.loads(scheduler_path.read_text(encoding='utf-8'));assets={};hashes={'comparison':sha(comparison_path),'schedulerComparison':sha(scheduler_path),'fixture':sha(fixture_path)}
    for name in ('BattleConst','BattleEngine'):
        path=module_dir/f'{name}.lua';rows=[row for row in comparison['combatModules'] if row['name']==f'{name}.lua']
        if len(rows)!=1 or len(rows[0].get('current') or [])!=1 or sha(path)!=rows[0]['current'][0]['sha256']:raise ValueError(f'Current module mismatch: {name}')
        assets[name]={'output':str(path.relative_to(ROOT)).replace('\\','/')};hashes[f'current{name}']=sha(path)
    state_rows=[row for row in comparison['combatModules'] if row['name']=='BattleStateServer.lua']
    if len(state_rows)!=1 or state_rows[0].get('status')!='IDENTICAL' or state_rows[0].get('baseline')!=state_rows[0].get('current'):raise ValueError('BattleStateServer is not pinned identical')
    required=('BattleEffectServer.lua','BattleEffectMgrServer.lua','BESendEvent.lua','BattleLogicEvent.lua','BattleEventMgr.lua','Table.lua','BSTHpChanged.lua','BattleStateTriggerServer.lua');rows={row['name']:row for row in scheduler['modules']}
    if any(rows.get(name,{}).get('status')!='IDENTICAL' for name in required):raise ValueError('Event/trigger modules are not pinned identical')
    fixtures=json.loads(fixture_path.read_text(encoding='utf-8'))['fixtures'];oracle=ConnectedHpListenerOracle(assets);mismatches=[]
    for row in fixtures:
        actual=oracle.run_hp_listener(row['input'])
        if actual!=row['expected']:mismatches.append({'input':row['input'],'baseline':row['expected'],'current':actual})
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'RoleHpChanged -> HP listener -> BattleStateServer.Trigger -> effect requests','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':hashes,'fixtures':len(fixtures),'exactMatches':len(fixtures)-len(mismatches),'mismatches':len(mismatches),'results':mismatches,'scope':'Actual current event request construction connected through byte-identical event, HP-listener, trigger and cached state callback bytecode. Covers accepted monster/player callbacks, hidden-owner rejection, other-monster rejection, BEGenerateTargets/BECreateSkillPhase request construction and StateTriggerEnd request.','limitations':['Generated effects and StateTriggerEnd do not execute','Cached command adapter with no Judgement or ban','No gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':len(fixtures),'exactMatches':report['exactMatches'],'output':str(output.relative_to(ROOT))},indent=2))
if __name__=='__main__':main()
