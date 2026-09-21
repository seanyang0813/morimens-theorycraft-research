"""Original energy effect repetition and property-change source assembly."""
import ctypes as C
import itertools,json
from passive_runtime_oracle import PassiveOracle,ROOT
class EffectOracle(PassiveOracle):
    def __init__(self, asset_overrides=None):
        asset_overrides = asset_overrides or {}
        super().__init__(asset_overrides=asset_overrides);L=self.state
        self.boolean_read=self.lib.lua_toboolean;self.boolean_read.argtypes=[C.c_void_p,C.c_int];self.boolean_read.restype=C.c_int
        def newclass(s):
            self.table(s,0,5);self.table(s,0,1);self.method('DoEffect',lambda s:0);return 2
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',newclass);self.top(L,0)
        self.module('BEGainUltiEnergy',asset_overrides.get('BEGainUltiEnergy'));self.setglobal(L,b'_ulti_effect')
    def run(self,v):
        L=self.state;self.top(L,0);events=[];count=0
        self.getglobal(L,b'_ulti_effect');self.getfield(L,-1,b'DoEffect');self.table(L,0,6)
        self.table(L,3,0)
        for i,x in enumerate(v['parameters'],1):
            if x is not None:self.number(L,x);self.rawseti(L,-2,i)
        self.setfield(L,-2,b'params');self.table(L,len(v['targets']),0)
        for i,uid in enumerate(v['targets'],1):
            self.table(L,0,2);self.number(L,uid);self.setfield(L,-2,b'uid')
            def gain(s,uid=uid):
                source={}
                for key in ['castRoleUid','reason','cmdServerUid','castValue','skillConfigId']:
                    self.getfield(s,3,key.encode());source[key]=self.tonumber(s,-1,None);self.top(s,-2)
                self.getfield(s,3,b'showText');source['showText']=bool(self.boolean_read(s,-1));self.top(s,-2)
                events.append({'stage':'gain','target':uid,'value':self.tonumber(s,2,None),'source':source});return 0
            self.method('GainUltiEnergy',gain);self.rawseti(L,-2,i)
        self.setfield(L,-2,b'targets');self.table(L,0,1);self.number(L,1);self.setfield(L,-2,b'castRoleUid');self.setfield(L,-2,b'effectConfig')
        self.number(L,2);self.setfield(L,-2,b'cmdServerUid');self.table(L,0,2);self.number(L,3);self.setfield(L,-2,b'skillConfigId')
        def calculate(s):
            nonlocal count
            count+=1;self.getfield(s,3,b'uid');uid=self.tonumber(s,-1,None);self.top(s,-2)
            base=self.tonumber(s,2,None);events.append({'stage':'calculate','target':uid,'base':base});self.number(s,base+count);return 1
        self.method('GetRealUltiEnergy',calculate);self.setfield(L,-2,b'cmdServer')
        self.getglobal(L,b'_passive_base');self.getfield(L,-1,b'GetPropertyChangeSource');self.setfield(L,-3,b'GetPropertyChangeSource');self.top(L,-2)
        self.check(self.call(L,1,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return {'returned':bool(self.boolean_read(L,-1)),'events':events}
if __name__=='__main__':
    o=EffectOracle();fixtures=[]
    for base,times,show,targets in itertools.product([-0.1,10.1],[None,-0.1,0,0.1,1.1],[None,0,1,2],[[],[7],[7,8]]):
        v={'parameters':[base,times,show],'targets':targets};fixtures.append({'input':v,'expected':o.run(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BEGainUltiEnergy','BattleEffectServer','BattleConst']},'scope':'120 original DoEffect/GetPropertyChangeSource cases with no-op superclass presentation, changing calculation adapter and gain observer. Explicit target list and source identity. No actual formula/storage/listeners or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-ulti-energy-effect.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'original energy effect cases')
