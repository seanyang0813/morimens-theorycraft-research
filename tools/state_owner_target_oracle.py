"""Original StateOwner parser branch and target-list getter; constructor adapter retains targets."""
import ctypes as C
import json
from behit_hp_oracle import BeHitHpOracle, ROOT
class StateOwnerOracle(BeHitHpOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.rawgeti=self.lib.lua_rawgeti;self.rawgeti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawgeti.restype=C.c_int
        def expression(s):
            self.table(s,0,2);self.pushvalue(s,2);self.setfield(s,-2,b'targets')
            self.getglobal(s,b'_target_expression');self.getfield(s,-1,b'GetTargetList');self.setfield(s,-3,b'GetTargetList');self.top(s,-2)
            return 1
        self.callback(expression);self.setglobal(L,b'_target_identity')
        empty={b'Battle.Ecs.BattleComponent',b'Battle.DbgEngine.Cmd.Expression.BattleCmdBaseExpression',b'Battle.DbgEngine.Cmd.Expression.BattleCmdCardListExp',b'Battle.DbgEngine.Cmd.Expression.BattleCmdStasticsExp',b'Battle.DbgEngine.Cmd.Expression.BattleCmdKeeperSkillExp',b'Battle.DbgEngine.Event.BattleCommand'}
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util',b'Battle.DbgEngine.Cmd.Expression.BattleCmdTargetsExp':b'_target_identity'}
            if name in known:self.getglobal(s,known[name])
            elif name in empty:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        self.module('BattleCmdTargetsExp');self.setglobal(L,b'_target_expression')
        self.module('BattleCmdParser');self.setglobal(L,b'_target_parser')
        if self.errors:raise RuntimeError(self.errors)
    def run_target(self,v):
        L=self.state;self.top(L,0);self.lookups=[];self.errorCount=0
        self.getglobal(L,b'_target_parser');self.getfield(L,-1,b'GenerateTargetsExp')
        self.table(L,0,2)
        if v['stateUid'] is not None:self.number(L,v['stateUid']);self.setfield(L,-2,b'stateUid')
        self.table(L,0,2)
        def lookup(s):
            self.lookups.append(self.tonumber(s,2,None))
            if not v['stateExists']:self.nil(s);return 1
            self.table(s,0,1)
            if v['ownerExists']:
                self.table(s,0,1);self.number(s,7);self.setfield(s,-2,b'uid');self.setfield(s,-2,b'owner')
            return 1
        def error(s):self.errorCount+=1;return 0
        self.method('GetObj',lookup);self.method('Error',error);self.setfield(L,-2,b'battleEngine')
        self.pushstring(L,b'StateOwner');self.check(self.call(L,2,1,0,0,None))
        self.getfield(L,-1,b'GetTargetList');self.pushvalue(L,-2);self.check(self.call(L,1,1,0,0,None))
        self.setglobal(L,b'_selected_state_targets');self.top(L,0)
        self.table(L,0,1);self.table(L,0,0);self.setfield(L,-2,b'cmdParser');self.setglobal(L,b'_target_command')
        self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'SetUpperTargets');self.getglobal(L,b'_target_command');self.getglobal(L,b'_selected_state_targets');self.check(self.call(L,2,0,0,0,None));self.top(L,0)
        self.getglobal(L,b'_oracle_cmd');self.getfield(L,-1,b'GetUpperTargets');self.getglobal(L,b'_target_command');self.check(self.call(L,1,1,0,0,None))
        targets=[];self.rawgeti(L,-1,1)
        if self.kind(L,-1)==5:self.getfield(L,-1,b'uid');targets.append(self.tonumber(L,-1,None))
        return dict(targets=targets,lookups=self.lookups,errorCount=self.errorCount)
if __name__=='__main__':
    o=StateOwnerOracle();cases=[dict(stateUid=uid,stateExists=exists,ownerExists=owner) for uid,exists,owner in [(123,True,True),(123,False,False),(None,True,True),(0,True,True),(123,True,False)]]
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','scope':'Original GenerateTargetsExp StateOwner branch, GetTargetList, command SetUpperTargets/GetUpperTargets, with state lookup and expression constructor adapters. Constructor retains the supplied target table; InitGetter is not executed. No BEGenerateTargets effect, phase execution or gameplay validation.','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleCmdParser','BattleCmdTargetsExp','BattleCmdServer']},'fixtures':[{'input':v,'expected':o.run_target(v)} for v in cases]}
    (ROOT/'tests/synthetic/original-state-owner-target.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(cases),'original StateOwner target cases')
