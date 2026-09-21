"""Generate connected HP-event through cached state-trigger request fixtures."""
import json
from connected_hp_listener_oracle import ConnectedHpListenerOracle, CASES, ROOT

STATE_CASES=[
    {**CASES[0],'name':'monster-self-damage-to-state-command','executeState':True},
    {**CASES[0],'name':'hidden-owner-stops-state-command','executeState':True,'hidden':1},
    {**CASES[1],'name':'other-monster-stops-before-state-command','executeState':True},
    {**CASES[4],'name':'enemy-damage-to-player-state-command','executeState':True},
]

def main():
    oracle=ConnectedHpListenerOracle();fixtures=[{'input':row,'expected':oracle.run_hp_listener(row)} for row in STATE_CASES]
    names=('BattleEngine','BattleEventMgr','BattleEffectMgrServer','BattleEffectServer','BESendEvent','BattleLogicEvent','BattleStateTriggerServer','BSTHpChanged','BattleStateServer','BattleConst','Table')
    output=ROOT/'tests/synthetic/original-connected-hp-state-trigger.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in names},'scope':'Original RoleHpChanged request through event execution, HP-listener eligibility and cached BattleStateServer.Trigger. Real effect-manager creation observes BEGenerateTargets and BECreateSkillPhase request objects; StateTriggerEnd BESendEvent is constructed. Generated target/phase effects and end event do not execute. Explicit role/state/command/engine adapters; no gameplay or holdout credit.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n');print('Generated',len(fixtures),'connected HP-to-state-trigger cases')

if __name__=='__main__':main()
