"""Compare resource-150 connected HP-listener behavior with baseline fixtures."""
import hashlib
import json

from connected_hp_listener_oracle import ConnectedHpListenerOracle, ROOT


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir=ROOT/'research/observations/current-res150-build51/modules';comparison_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json';scheduler_path=ROOT/'research/evidence/pc-res150-scheduler-modules.json';fixture_path=ROOT/'tests/synthetic/original-connected-hp-listener.json';output=ROOT/'research/evidence/pc-res150-connected-hp-listener-runtime.json'
    comparison=json.loads(comparison_path.read_text(encoding='utf-8'));scheduler=json.loads(scheduler_path.read_text(encoding='utf-8'));assets={};hashes={'comparison':sha(comparison_path),'schedulerComparison':sha(scheduler_path),'fixture':sha(fixture_path)}
    for name in ('BattleConst','BattleEngine'):
        path=module_dir/f'{name}.lua';rows=[row for row in comparison['combatModules'] if row['name']==f'{name}.lua']
        if len(rows)!=1 or len(rows[0].get('current') or [])!=1 or sha(path)!=rows[0]['current'][0]['sha256']:raise ValueError(f'Current module mismatch: {name}')
        assets[name]={'output':str(path.relative_to(ROOT)).replace('\\','/')};hashes[f'current{name}']=sha(path)
    identical=('BattleEffectServer.lua','BattleEffectMgrServer.lua','BESendEvent.lua','BattleLogicEvent.lua','BattleEventMgr.lua','Table.lua','BSTHpChanged.lua','BattleStateTriggerServer.lua');rows={row['name']:row for row in scheduler.get('modules',[])}
    for name in identical:
        row=rows.get(name)
        if not row or row.get('status')!='IDENTICAL' or row.get('baseline')!=row.get('current'):raise ValueError(f'Current HP-listener module is not pinned identical: {name}')
    fixtures=json.loads(fixture_path.read_text(encoding='utf-8'))['fixtures'];oracle=ConnectedHpListenerOracle(assets);mismatches=[]
    for row in fixtures:
        actual=oracle.run_hp_listener(row['input'])
        if actual!=row['expected']:mismatches.append({'input':row['input'],'baseline':row['expected'],'current':actual})
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','method':'RoleHpChanged -> BESendEvent -> BSTHpChanged -> TryTrigger/Trigger','status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':hashes,'fixtures':len(fixtures),'exactMatches':len(fixtures)-len(mismatches),'mismatches':len(mismatches),'results':mismatches,'scope':'Actual resource-150 event request construction connected to hash-identical effect, dispatcher, HP-listener and generic trigger bytecode. Covers monster-self isolation, deleted-state rejection, ally/enemy camp eligibility, signed HP delta and caster associator identity.','limitations':['Trigger callback observed only','No state command or listener-generated effect execution','No gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':len(fixtures),'exactMatches':report['exactMatches'],'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
