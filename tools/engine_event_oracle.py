"""Original BattleEngine.CreateEventEffect request construction."""
import ctypes as C
import json

from command_gate_oracle import CommandGateOracle, ROOT


class EngineEventOracle(CommandGateOracle):
    def __init__(self, asset_overrides=None):
        super().__init__(asset_overrides)
        self.rawequal=self.lib.lua_rawequal;self.rawequal.argtypes=[C.c_void_p,C.c_int,C.c_int];self.rawequal.restype=C.c_int

    def run_event(self,values):
        L=self.state;self.top(L,0);self.errors.clear();captured=[]
        self.table(L,0,3)
        self.method('IsAutoBattleOp',lambda s:(self.boolean(s,values['autoBattle']),1)[1])
        self.table(L,0,1)
        def create(s):
            self.getfield(s,2,b'effectType');effect_type=self.string(s,-1,None).decode();self.top(s,-2)
            self.getfield(s,2,b'eventId');event_id=self.tonumber(s,-1,None);self.top(s,-2)
            self.getfield(s,2,b'eventData');self.getfield(s,-1,b'isAutoOp');auto=bool(self.tobool(s,-1));self.top(s,-2)
            self.getglobal(s,b'_event_input');same=bool(self.rawequal(s,-2,-1)) if values['dataMode']!='absent' else None;self.top(s,-3)
            captured.append({'effectType':effect_type,'eventId':event_id,'isAutoOp':auto,'samePayload':same});return 0
        self.method('CreateEffect',create);self.setfield(L,-2,b'effectMgr');self.setglobal(L,b'_event_engine')
        if values['dataMode']!='absent':
            self.table(L,0,1)
            if values['dataMode'] in ('false','true'):
                self.boolean(L,values['dataMode']=='true');self.setfield(L,-2,b'isAutoOp')
            self.setglobal(L,b'_event_input')
        else:self.nil(L);self.setglobal(L,b'_event_input')
        self.getglobal(L,b'_gate_engine_class');self.getfield(L,-1,b'CreateEventEffect');self.getglobal(L,b'_event_engine');self.number(L,203)
        if values['dataMode']=='absent':self.nil(L)
        else:self.getglobal(L,b'_event_input')
        self.check(self.call(L,3,0,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return captured[0]


def main():
    oracle=EngineEventOracle();cases=[{'dataMode':mode,'autoBattle':auto} for mode in ('absent','noFlag','false','true') for auto in (False,True)]
    fixtures=[{'input':row,'expected':oracle.run_event(row)} for row in cases]
    output=ROOT/'tests/synthetic/original-engine-event.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleEngine':oracle.assets['BattleEngine.lua']['sha256'],'BattleConst':oracle.assets['BattleConst.lua']['sha256']},'scope':'Original BattleEngine.CreateEventEffect with supplied auto-operation result and observed effect-manager request. No effect construction, scheduler traversal, dispatch, listeners or gameplay.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'original engine-event cases')


if __name__=='__main__':main()
