"""Run inherited energy-payment fixtures against resource-150 changed modules."""
import hashlib
import json

from connected_card_payment_oracle import ConnectedPaymentOracle
from energy_payment_oracle import EnergyOracle, ROOT


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    module_dir=ROOT/'research/observations/current-res150-build51/modules';comparison_path=ROOT/'research/evidence/pc-res144-to-res150-combat-build.json';card_path=ROOT/'research/evidence/pc-res150-card-modules.json';output=ROOT/'research/evidence/pc-res150-energy-payment-runtime.json'
    comparison=json.loads(comparison_path.read_text(encoding='utf-8'));cards=json.loads(card_path.read_text(encoding='utf-8'));assets={};hashes={'comparison':sha(comparison_path),'cardModules':sha(card_path)}
    combat={row['name']:row for row in comparison['combatModules']};card_rows={row['name']:row for row in cards['modules']}
    for name in ('BattleConst','BattleUtilServer','BattlePropertyServer'):
        path=module_dir/f'{name}.lua';expected=combat[f'{name}.lua']['current'][0]
        if sha(path)!=expected['sha256']:raise ValueError(f'Current module mismatch: {name}')
        assets[name]={'output':str(path.relative_to(ROOT)).replace('\\','/')};hashes[f'current{name}']=sha(path)
    player=module_dir/'BattleUnitPlayer.lua';expected=card_rows['BattleUnitPlayer.lua']['current']
    if sha(player)!=expected['sha256']:raise ValueError('Current BattleUnitPlayer mismatch')
    assets['BattleUnitPlayer']={'output':str(player.relative_to(ROOT)).replace('\\','/')};hashes['currentBattleUnitPlayer']=sha(player)
    specs=[('consumeEnergy',ROOT/'tests/synthetic/original-energy-payment.json',EnergyOracle(assets),lambda oracle,value:oracle.run(value['energy'],value['request'])),('connectedBeforeUse',ROOT/'tests/synthetic/original-connected-card-payment.json',ConnectedPaymentOracle(assets),lambda oracle,value:oracle.connected(value))]
    results={};mismatches=[];total=0
    for domain,path,oracle,runner in specs:
        data=json.loads(path.read_text(encoding='utf-8'));hashes[domain+'Fixture']=sha(path);total+=len(data['fixtures']);bad=[]
        for row in data['fixtures']:
            actual=runner(oracle,row['input'])
            if actual!=row['expected']:bad.append({'input':row['input'],'baseline':row['expected'],'current':actual})
        results[domain]={'fixtures':len(data['fixtures']),'exactMatches':len(data['fixtures'])-len(bad),'mismatches':len(bad)};mismatches.extend({'domain':domain,**row} for row in bad)
    report={'schemaVersion':1,'kind':'MORIMENS_PC_CROSS_BUILD_RUNTIME_COMPARISON','baselineBuild':'pc-res144-build51','currentBuild':'pc-res150-build51','methods':['BattleUnitPlayer.ConsumeEnergy','BEBeforeUseCard.__CostEnergy through property mutation'],'status':'EXACT_MATCH_IN_FIXTURE_DOMAIN' if not mismatches else 'BEHAVIOR_CHANGE_DETECTED','sourceHashes':hashes,'domains':results,'fixtures':total,'exactMatches':total-len(mismatches),'mismatches':len(mismatches),'results':mismatches,'scope':'Actual resource-150 changed player, property, utility and constants bytecode across inherited direct and connected energy-payment fixtures; unchanged card/before-use modules execute in the connected domain.','limitations':['No complete CanUseCard/UseCard chain, event listeners, effect tree, gameplay or holdout credit']}
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps({'status':report['status'],'fixtures':total,'exactMatches':report['exactMatches'],'domains':results,'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
