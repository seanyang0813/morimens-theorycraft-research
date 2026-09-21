"""Connect an HP-change listener to the real 60406 phase-cap command rows."""
import json

from connected_hp_generated_phase_oracle import CASES
from connected_hp_listener_oracle import ConnectedHpListenerOracle, ROOT


def main():
    oracle=ConnectedHpListenerOracle()
    cases=[{**row,'executeCommandRows':True} for row in CASES]
    fixtures=[{'input':row,'expected':oracle.run_hp_listener(row)} for row in cases]
    names=('BattleEngine','BattleEventMgr','BattleEffectMgrServer','BattleEffectServer','BESendEvent','BattleLogicEvent','BattleStateTriggerServer','BSTHpChanged','BattleStateServer','BEGenerateTargets','BECreateSkillPhase','BattleCmdServer','BattleConst','Table','Cmd','State')
    output=ROOT/'tests/synthetic/original-connected-hp-phase-cap-command.json'
    output.write_text(json.dumps({
        'kind':'SYNTHETIC_ORIGINAL_RUNTIME',
        'build':'pc-res144-build51',
        'sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in names},
        'scope':'Original RoleHpChanged request through listener, cached State.Trigger, target generation, phase creation, TriggerCmd and GenerateEffectList using the exact eight exported rows of command 60406. StateOwner expression construction, TriggerPara-to-Arg1 conversion, delay calculation and final effect construction are explicit adapters. Child PreTrigger receives the original signed HP trigger data; effect bodies, conditions, state mutation, scheduler completion and StateTriggerEnd execution are excluded. No gameplay or holdout credit.',
        'fixtures':fixtures,
    },indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'connected HP phase-cap command cases')


if __name__=='__main__':main()
