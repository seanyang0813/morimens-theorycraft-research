"""Original BEAttachPostAction request boundary for non-monster targets."""
import ctypes as C
import json

from target_runtime_oracle import TargetOracle, ROOT


class AttachPostOracle(TargetOracle):
    def __init__(self):
        super().__init__();L=self.state
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
        self.rawseti=self.lib.lua_rawseti;self.rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawseti.restype=None
        self.rawgeti=self.lib.lua_rawgeti;self.rawgeti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawgeti.restype=C.c_int
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_void_p
        def newclass(s):
            self.table(s,0,30);self.table(s,0,2);self.method('DoEffect',lambda state:0);return 2
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',newclass);self.top(L,0)
        def require(s):
            name=self.string(s,1,None)
            if name==b'System.System':self.getglobal(s,b'_oracle_config_system')
            elif name==b'Battle.BattleConst':self.getglobal(s,b'_oracle_bc')
            elif name==b'Battle.DbgEngine.Effect.BattleEffectServer':self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BEAttachPostAction');self.setglobal(L,b'_attach_post')
        self.getglobal(L,b'table')
        def contains(s):
            wanted=self.string(s,2,None);found=False
            for index in range(1,8):
                self.rawgeti(s,1,index);value=self.string(s,-1,None);self.top(s,-2)
                if value is None:break
                if value==wanted:found=True;break
            self.boolean(s,found);return 1
        self.method('contains',contains);self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)

    def run(self,value):
        L=self.state;self.top(L,0);self.errors.clear();initialization=[];property_reads=[];records=[];cards=[]
        parameters=value['parameters'];skill_id=parameters[0]
        self.getglobal(L,b'_attach_post');self.getfield(L,-1,b'DoEffect');self.table(L,0,20)
        self.table(L,len(parameters),0)
        for index,number in enumerate(parameters,1):self.number(L,number);self.rawseti(L,-2,index)
        self.setfield(L,-2,b'params');self.table(L,1 if value['targetPresent'] else 0,0)
        if value['targetPresent']:
            self.table(L,0,8);self.number(L,value['targetUid']);self.setfield(L,-2,b'uid')
            def use_card(s):
                self.getfield(s,4,b'isTriggerBST');trigger=bool(self.tobool(s,-1));self.top(s,-2)
                cards.append({'targetUid':value['targetUid'],'skillId':self.tonumber(s,2,None),'skillLevel':self.tonumber(s,3,None),'attachPostParam':{'isTriggerBST':trigger}});return 0
            self.method('UseAttachPostCard',use_card);self.method('GetProperty',lambda s:(property_reads.append(self.string(s,2,None).decode()),self.number(s,value['casterSealAttachPost']),1)[2]);self.method('IsRoleType',lambda s:(self.boolean(s,False),1)[1]);self.rawseti(L,-2,1)
        self.setfield(L,-2,b'targets');self.table(L,0,4);self.number(L,value['casterUid']);self.setfield(L,-2,b'castRoleUid');self.setfield(L,-2,b'cmdServer');self.table(L,0,0);self.setfield(L,-2,b'effectConfig')
        def do_multi(s):
            for name in ['totalEffectTimes','leftEffectTimes']:
                self.getfield(s,1,name.encode());number=self.tonumber(s,-1,None);self.top(s,-2)
                if len(initialization)==0:initialization.append({})
                initialization[0][name]=number
            self.boolean(s,True);return 1
        self.method('DoMultiEffect',do_multi);self.table(L,0,5)
        self.table(L,0,1)
        def current(s):self.getglobal(s,b'_attach_caster');return 1
        self.method('GetCurCaster',current);self.setfield(L,-2,b'roleMgr');self.table(L,0,1)
        def record(s):records.append({'casterUid':self.tonumber(s,2,None),'targetUid':self.tonumber(s,3,None),'skillId':self.tonumber(s,4,None),'showPerform':self.tonumber(s,5,None)});return 0
        self.method('OnAttachPostAction',record);self.setfield(L,-2,b'recordMgr');self.table(L,0,1);self.table(L,0,1);self.table(L,0,2);self.number(L,77918);self.setfield(L,-2,b'AwakerID');self.table(L,1,0);self.pushstring(L,b'Card_AttachPost');self.rawseti(L,-2,1);self.setfield(L,-2,b'Type');self.rawseti(L,-2,int(skill_id));self.setfield(L,-2,b'Skill');self.setfield(L,-2,b'battleDT');self.setfield(L,-2,b'battleEngine')
        if value['targetPresent']:
            self.getfield(L,-1,b'targets');self.rawgeti(L,-1,1);self.setglobal(L,b'_attach_target');self.top(L,-2)
        else:self.nil(L);self.setglobal(L,b'_attach_target')
        self.table(L,0,5);self.number(L,value['casterUid']);self.setfield(L,-2,b'uid');self.method('GetProperty',lambda s:(property_reads.append(self.string(s,2,None).decode()),self.number(s,value['casterSealAttachPost']),1)[2]);self.method('IsRoleType',lambda s:(self.boolean(s,False),1)[1]);self.setglobal(L,b'_attach_caster')
        self.pushvalue(L,-1);self.setglobal(L,b'_attach_subject');self.check(self.call(L,1,1,0,0,None));self.top(L,0)
        self.getglobal(L,b'_attach_post');self.getfield(L,-1,b'__DoMultiEffect');self.getglobal(L,b'_attach_subject');self.check(self.call(L,1,1,0,0,None));returned=bool(self.tobool(L,-1))
        if self.errors:raise RuntimeError(self.errors)
        return {'initialization':initialization[0],'propertyReads':property_reads,'records':records,'cardRequests':cards,'returned':returned}


if __name__=='__main__':
    oracle=AttachPostOracle();cases=[
        {'parameters':[133381,1,0,1,7],'casterUid':77,'targetUid':99,'casterSealAttachPost':0,'targetPresent':True},
        {'parameters':[123159,1,0,1],'casterUid':10,'targetUid':20,'casterSealAttachPost':0,'targetPresent':True},
        {'parameters':[133381,2.2,1,3,7],'casterUid':77,'targetUid':99,'casterSealAttachPost':0,'targetPresent':True},
        {'parameters':[133381,1,2,0,4],'casterUid':77,'targetUid':99,'casterSealAttachPost':0,'targetPresent':True},
        {'parameters':[133381],'casterUid':77,'targetUid':99,'casterSealAttachPost':0,'targetPresent':True},
        {'parameters':[133381,1,1,1,7],'casterUid':77,'targetUid':99,'casterSealAttachPost':1,'targetPresent':True},
        {'parameters':[133381,1,1,1,7],'casterUid':77,'targetUid':99,'casterSealAttachPost':-1,'targetPresent':True},
        {'parameters':[133381,1,1,1,7],'casterUid':77,'targetUid':99,'casterSealAttachPost':0,'targetPresent':False},
    ]
    fixtures=[{'input':case,'expected':oracle.run(case)} for case in cases]
    output={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in ('BEAttachPostAction','BattleConst')},'scope':'Original BEAttachPostAction.DoEffect initialization and one original __DoMultiEffect iteration for non-monster targets. Actual Card_AttachPost type membership, current-caster seal lookup, record request and UseAttachPostCard call are retained; role manager, record manager and target card-use endpoints are observers. No monster path, attached-card construction/execution, later repetition scheduling, gameplay or holdout.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-attach-post-action.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8',newline='\n');print('Generated',len(fixtures),'attach-post action cases')
