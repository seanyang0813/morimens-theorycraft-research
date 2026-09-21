"""Execute selected original BattleRecord payload constructors."""
import ctypes as C
import json

from target_runtime_oracle import TargetOracle, ROOT


class BattleRecordOracle(TargetOracle):
    def __init__(self, asset_overrides=None):
        asset_overrides=asset_overrides or {}
        super().__init__(asset_overrides);L=self.state
        self.rawequal=self.lib.lua_rawequal;self.rawequal.argtypes=[C.c_void_p,C.c_int,C.c_int];self.rawequal.restype=C.c_int
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p]
        self.module('BattleRenderEvent',asset_overrides.get('BattleRenderEvent'));self.setglobal(L,b'_record_events')
        self.module('BattleCommand',asset_overrides.get('BattleCommand'));self.setglobal(L,b'_record_commands')
        known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.DbgEngine.Event.BattleRenderEvent':b'_record_events',b'Battle.DbgEngine.Event.BattleCommand':b'_record_commands'}
        def require(s):
            name=self.string(s,1,None)
            if name in known:self.getglobal(s,known[name])
            elif name==b'Battle.Ecs.BattleEngineComponent':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require')
        self.module('BattleRecord',asset_overrides.get('BattleRecord'));self.setglobal(L,b'_record_class')
        if self.errors:raise RuntimeError(self.errors)

    def _number_field(self,L,index,name):
        self.getfield(L,index,name.encode());value=self.tonumber(L,-1,None);self.top(L,-2);return value

    def _string_field(self,L,index,name):
        self.getfield(L,index,name.encode());raw=self.string(L,-1,None);self.top(L,-2);return raw.decode() if raw else None

    def _same_global(self,L,index,name):
        self.getglobal(L,name);same=bool(self.rawequal(L,index,-1));self.top(L,-2);return same

    def run_case(self,case):
        L=self.state;self.top(L,0);self.errors.clear();captured=[]
        self.table(L,0,1);self.method('GetCurPassTime',lambda s:(self.number(s,case['time']),1)[1]);self.setglobal(L,b'_record_engine')
        self.table(L,0,2);self.getglobal(L,b'_record_engine');self.setfield(L,-2,b'battleEngine')
        def push_record(s):
            frame=2;event={'time':self._number_field(s,frame,'time'),'eventId':self._number_field(s,frame,'eventId')}
            self.getfield(s,frame,b'data');data=-1;method=case['method']
            if method=='OnUseCard':event['data']={'cardUid':self._number_field(s,data,'cardUid'),'camp':self._number_field(s,data,'camp')}
            elif method=='OnBeHit':
                event['data']={'roleUid':self._number_field(s,data,'roleUid')}
                self.getfield(s,data,b'beHitConfig');event['data']['sameBeHitConfig']=self._same_global(s,-1,b'_record_payload');self.top(s,-2)
            elif method=='OnPropertyChanged':
                event['data']={key:self._number_field(s,data,key) for key in ('uid','propertyType','changedValue','value')}
                event['data']['reason']=self._string_field(s,data,'reason')
                self.getfield(s,data,b'extraData');event['data']['sameExtraData']=self._same_global(s,-1,b'_record_payload');self.top(s,-2)
            else:event['samePayload']=self._same_global(s,data,b'_record_payload')
            captured.append(event);self.top(s,2);return 0
        self.method('PushRecord',push_record);self.setglobal(L,b'_record_self')
        if case['method']!='OnUseCard':self.table(L,0,1);self.number(L,77);self.setfield(L,-2,b'marker');self.setglobal(L,b'_record_payload')
        self.getglobal(L,b'_record_class');self.getfield(L,-1,case['method'].encode());self.getglobal(L,b'_record_self')
        if case['method']=='OnUseCard':self.number(L,case['cardUid']);self.number(L,case['camp']);argc=3
        elif case['method']=='OnBeHit':self.number(L,case['roleUid']);self.getglobal(L,b'_record_payload');argc=3
        elif case['method']=='OnPropertyChanged':
            for key in ('uid','propertyType','changedValue','value'):self.number(L,case[key])
            self.pushstring(L,case['reason'].encode());self.getglobal(L,b'_record_payload');argc=7
        else:self.getglobal(L,b'_record_payload');argc=2
        self.check(self.call(L,argc,0,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return captured[0]


CASES=[
 {'method':'OnUseCard','time':0,'cardUid':101,'camp':1},
 {'method':'OnUseCard','time':12.5,'cardUid':987654,'camp':2},
 {'method':'OnBeHit','time':3.25,'roleUid':44},
 {'method':'OnBeHit','time':99,'roleUid':9001},
 {'method':'OnPropertyChanged','time':4,'uid':8,'propertyType':17,'changedValue':-5,'value':95,'reason':'damage'},
 {'method':'OnPropertyChanged','time':4.5,'uid':9,'propertyType':23,'changedValue':2.75,'value':12.25,'reason':'state'},
 {'method':'OnSelectTargets','time':5},
 {'method':'OnSelectTargets','time':6.5},
 {'method':'OnAddState','time':7},
 {'method':'OnChangeStateLayer','time':8.75},
]


def main():
    oracle=BattleRecordOracle();fixtures=[{'input':row,'expected':oracle.run_case(row)} for row in CASES]
    output=ROOT/'tests/synthetic/original-battle-record.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in ('BattleRecord','BattleRenderEvent','BattleCommand')},'scope':'Selected original BattleRecord frame constructors for card use, hit, property, target and state events. Time is supplied; PushRecord is observed. No record queue, serialization, replay playback or gameplay.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'original BattleRecord cases')


if __name__=='__main__':main()
