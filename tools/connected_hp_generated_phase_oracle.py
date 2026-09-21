"""Generate connected HP-event through generated target/phase execution fixtures."""
import json
from connected_hp_state_trigger_oracle import STATE_CASES
from connected_hp_listener_oracle import ConnectedHpListenerOracle,ROOT

CASES=[{**row,'executeGenerated':True} for row in STATE_CASES]
def main():
    oracle=ConnectedHpListenerOracle();fixtures=[{'input':row,'expected':oracle.run_hp_listener(row)} for row in CASES]
    names=('BattleEngine','BattleEventMgr','BattleEffectMgrServer','BattleEffectServer','BESendEvent','BattleLogicEvent','BattleStateTriggerServer','BSTHpChanged','BattleStateServer','BEGenerateTargets','BECreateSkillPhase','BattleCmdServer','BattleConst','Table')
    output=ROOT/'tests/synthetic/original-connected-hp-generated-phase.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in names},'scope':'Original RoleHpChanged request through listener, cached State.Trigger, actual BEGenerateTargets.DoEffect and BECreateSkillPhase.DoEffect, then original BattleCmdServer.TriggerCmd. StateOwner target expression construction and empty GenerateEffectList are explicit adapters; target/phase effects run directly after construction, without scheduler completion or StateTriggerEnd execution. No command rows, gameplay or holdout credit.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n');print('Generated',len(fixtures),'connected HP generated-phase cases')
if __name__=='__main__':main()
