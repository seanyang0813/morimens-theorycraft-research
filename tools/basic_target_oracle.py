"""Original basic target selectors with explicit registry/role adapters."""
import itertools,json
import ctypes as C
from state_owner_target_oracle import StateOwnerOracle,ROOT
class BasicTargetOracle(StateOwnerOracle):
    def run(self,v):
        L=self.state;self.top(L,0);reads=[]
        self.rawseti=self.lib.lua_rawseti;self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong]
        def role(s,uid):
            if uid is None:self.nil(s)
            else:self.table(s,0,1);self.number(s,uid);self.setfield(s,-2,b'uid')
        def targets(s,ids):
            if ids is None:self.nil(s);return
            self.table(s,len(ids),0)
            for i,uid in enumerate(ids,1):role(s,uid);self.rawseti(s,-2,i)
        self.getglobal(L,b'_target_parser');self.getfield(L,-1,b'GenerateTargetsExp');self.table(L,0,6)
        self.number(L,11);self.setfield(L,-2,b'castRoleUid');self.number(L,22);self.setfield(L,-2,b'lastEffectUid')
        targets(L,v['upperTargets']);self.setfield(L,-2,b'upperTargets')
        def camp(s):reads.append(['GetCasterCamp']);self.number(s,1);return 1
        self.method('GetCasterCamp',camp)
        self.table(L,0,2)
        def obj(s):
            reads.append(['GetObj',self.tonumber(s,2,None)])
            if not v['effectExists']:self.nil(s)
            else:self.table(s,0,1);targets(s,v['lastTargets']);self.setfield(s,-2,b'targets')
            return 1
        self.method('GetObj',obj);self.table(L,0,2)
        def caster(s):reads.append(['GetRoleByUid',self.tonumber(s,2,None)]);role(s,v['caster']);return 1
        def player(s):reads.append(['GetPlayer',self.tonumber(s,2,None)]);role(s,v['player']);return 1
        self.method('GetRoleByUid',caster);self.method('GetPlayer',player);self.setfield(L,-2,b'roleMgr');self.setfield(L,-2,b'battleEngine')
        self.pushstring(L,v['selector'].encode());self.check(self.call(L,2,1,0,0,None))
        self.getfield(L,-1,b'GetTargetList');self.pushvalue(L,-2);self.check(self.call(L,1,1,0,0,None))
        ids=None if self.kind(L,-1)==0 else []
        if ids is not None:
            for i in range(1,10):
                self.rawgeti(L,-1,i)
                if self.kind(L,-1)==0:self.top(L,-2);break
                self.getfield(L,-1,b'uid');ids.append(self.tonumber(L,-1,None));self.top(L,-3)
        return {'targets':ids,'reads':reads}
if __name__=='__main__':
    o=BasicTargetOracle();fixtures=[]
    for selector,present,upper,last in itertools.product(['CmdCaster','UpperTarget','PlayerRole','LastTarget'],[False,True],[None,[],[31,32]],[None,[],[41,42]]):
        v={'selector':selector,'caster':11 if present else None,'player':12 if present else None,'effectExists':present,'upperTargets':upper,'lastTargets':last}
        fixtures.append({'input':v,'expected':o.run(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleCmdParser','BattleCmdTargetsExp']},'scope':'72 original basic selector/GetTargetList cases; explicit role registry, camp, last effect and target lists. Expression constructor retains supplied list; original InitGetter/filtering, automatic camp/registry derivation and gameplay excluded.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-basic-targets.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'basic target cases')
