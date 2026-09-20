"""Original FrontEnemy with original role filtering and position sorting."""
import ctypes as C
import itertools,json
from state_owner_target_oracle import StateOwnerOracle,ROOT
class FrontOracle(StateOwnerOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.rawseti=self.lib.lua_rawseti;self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        def require(s):
            name=self.string(s,1,None)
            known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Cmd.BattleCmdParser':b'_target_parser'}
            if name in known:self.getglobal(s,known[name])
            else:self.table(s,0,0)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleRoleMgrServer');self.setglobal(L,b'_front_roles')
    def run(self,v):
        L=self.state;self.top(L,0)
        def role(s,r):
            if r is None:self.nil(s);return
            self.table(s,0,7)
            for k in ['uid','camp']:self.number(s,r[k]);self.setfield(s,-2,k.encode())
            def hp(s):self.boolean(s,r['hasHpBar']);return 1
            def dead(s):self.boolean(s,r['dead']);return 1
            def pos(s):self.number(s,r['position']);return 1
            def prop(s):self.number(s,r['sneak']);return 1
            self.method('HasHpBar',hp);self.method('IsDead',dead);self.method('GetBattleFieldPos',pos);self.method('GetProperty',prop)
        def uidrole(s,uid):role(s,next((r for r in v['roles'] if r['uid']==uid),None))
        self.getglobal(L,b'_target_parser');self.getfield(L,-1,b'GenerateTargetsExp');self.table(L,0,3)
        def camp(s):self.number(s,v['casterCamp']);return 1
        def locked(s):uidrole(s,v['lockedUid']);return 1
        self.method('GetCasterCamp',camp);self.method('__GetLockedEnemyByCaster',locked)
        self.table(L,0,1);self.table(L,0,4);self.table(L,len(v['roles']),0)
        for i,r in enumerate(v['roles'],1):role(L,r);self.rawseti(L,-2,i)
        self.setfield(L,-2,b'roleList')
        def taunt(s):uidrole(s,v['tauntUid']);return 1
        self.method('GetTauntRole',taunt)
        for method in ['GetAliveRoleListByCamp','GetPosSortedRoleByCamp']:
            self.getglobal(L,b'_front_roles');self.getfield(L,-1,method.encode());self.setfield(L,-3,method.encode());self.top(L,-2)
        self.setfield(L,-2,b'roleMgr');self.setfield(L,-2,b'battleEngine')
        self.pushstring(L,b'FrontEnemy');self.check(self.call(L,2,1,0,0,None))
        self.getfield(L,-1,b'GetTargetList');self.pushvalue(L,-2);self.check(self.call(L,1,1,0,0,None));self.rawgeti(L,-1,1)
        if self.kind(L,-1)==0:return []
        self.getfield(L,-1,b'uid');return [self.tonumber(L,-1,None)]
if __name__=='__main__':
    o=FrontOracle();fixtures=[]
    base=[{'uid':i,'camp':2,'hasHpBar':True,'dead':False,'position':pos,'sneak':0} for i,pos in [(11,3),(12,-1),(13,2)]]
    for camp,locked,taunt,variant in itertools.product([1,2],[None,11],[None,13],['normal','sneak','dead','noHp','ally','empty']):
        roles=json.loads(json.dumps(base))
        if variant=='empty':roles=[]
        elif variant!='normal':roles[1][{'sneak':'sneak','dead':'dead','noHp':'hasHpBar','ally':'camp'}[variant]]={'sneak':1,'dead':True,'noHp':False,'ally':1}[variant]
        if camp==2:
            for r in roles:r['camp']=3-r['camp']
        v={'casterCamp':camp,'lockedUid':locked,'tauntUid':taunt,'roles':roles};fixtures.append({'input':v,'expected':o.run(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleCmdParser','BattleRoleMgrServer','BattleConst']},'scope':'48 connected FrontEnemy/filter/position-sort cases. Supplied caster camp, locked/taunt lookup and role property/HP/death/position adapters; identity expression wrapper. Unique absolute positions; no lock/taunt derivation, tie-order proof, full targeting lifecycle or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-front-enemy.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'connected front-enemy cases')
