"""Construct and execute original BEActiveDamage through its first child boundary."""
import ctypes as C
import json

from offensive_setup_oracle import SetupOracle, ROOT


class ActiveEffectExecutionOracle(SetupOracle):
    def __init__(self,asset_overrides=None):
        asset_overrides=asset_overrides or {};super().__init__(asset_overrides);L=self.state
        self.kind=self.lib.lua_type;self.kind.argtypes=[C.c_void_p,C.c_int];self.kind.restype=C.c_int
        self.tobool=self.lib.lua_toboolean;self.tobool.argtypes=[C.c_void_p,C.c_int];self.tobool.restype=C.c_int
        self.pushstring=self.lib.lua_pushstring;self.pushstring.argtypes=[C.c_void_p,C.c_char_p];self.pushstring.restype=C.c_char_p
        self.rawset=self.lib.lua_rawseti;self.rawset.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawset.restype=None
        self.rawget=self.lib.lua_rawgeti;self.rawget.argtypes=[C.c_void_p,C.c_int,C.c_longlong];self.rawget.restype=C.c_int
        self.length=self.lib.lua_rawlen;self.length.argtypes=[C.c_void_p,C.c_int];self.length.restype=C.c_size_t
        self.table(L,0,1);self.method('ctor',lambda s:0);self.setglobal(L,b'_active_entity_super')
        self.getglobal(L,b'_oracle_config_system')
        def base_class(s):self.table(s,0,60);self.getglobal(s,b'_active_entity_super');return 2
        self.method('NewClass',base_class);self.top(L,0)
        def base_require(s):
            name=self.string(s,1,None)
            if name==b'System.System':self.getglobal(s,b'_oracle_config_system')
            elif name==b'Battle.BattleConst':self.getglobal(s,b'_oracle_bc')
            elif name==b'Battle.Ecs.BattleEntity':self.getglobal(s,b'_active_entity_super')
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(base_require);self.setglobal(L,b'require');self.module('BattleEffectServer',asset_overrides.get('BattleEffectServer'));self.setglobal(L,b'_active_base')
        self.getglobal(L,b'_oracle_config_system')
        def active_class(s):self.table(s,0,30);self.getglobal(s,b'_active_base');return 2
        self.method('NewClass',active_class);self.top(L,0)
        def active_require(s):
            name=self.string(s,1,None)
            if name==b'System.System':self.getglobal(s,b'_oracle_config_system')
            elif name==b'Battle.BattleConst':self.getglobal(s,b'_oracle_bc')
            elif name==b'Battle.DbgEngine.Effect.BattleEffectServer':self.getglobal(s,b'_active_base')
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(active_require);self.setglobal(L,b'require');self.module('BEActiveDamage',asset_overrides.get('BEActiveDamage'));self.setglobal(L,b'_active_class')
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',active_class);self.top(L,0)
        def function_require(s):
            name=self.string(s,1,None)
            if name==b'System.System':self.getglobal(s,b'_oracle_config_system')
            elif name==b'Battle.BattleConst':self.getglobal(s,b'_oracle_bc')
            elif name==b'Battle.DbgEngine.Effect.BattleEffectServer':self.getglobal(s,b'_active_base')
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(function_require);self.setglobal(L,b'require');self.module('BEFunctionEffect',asset_overrides.get('BEFunctionEffect'));self.setglobal(L,b'_function_class')
        self.getglobal(L,b'_oracle_config_system');self.method('NewClass',base_class);self.top(L,0)
        def manager_require(s):
            name=self.string(s,1,None)
            if name==b'System.System':self.getglobal(s,b'_oracle_config_system')
            elif name==b'Battle.BattleConst':self.getglobal(s,b'_oracle_bc')
            elif name in (b'Battle.DbgEngine.Event.BattleLogicEvent',b'Battle.Ecs.BattleEngineComponent',b'Battle.DbgEngine.Effect.BattleEffectServer'):self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(manager_require);self.setglobal(L,b'require');self.module('BattleEffectMgrServer',asset_overrides.get('BattleEffectMgrServer'));self.setglobal(L,b'_active_manager_class')
        def property_require(s):
            name=self.string(s,1,None)
            if name==b'System.System':self.getglobal(s,b'_oracle_config_system')
            elif name==b'Battle.BattleConst':self.getglobal(s,b'_oracle_bc')
            elif name==b'Battle.Util.BattleUtilServer':self.getglobal(s,b'_oracle_util')
            elif name in (b'Battle.Ecs.BattleComponent',b'Battle.DbgEngine.Event.BattleLogicEvent'):self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(property_require);self.setglobal(L,b'require');self.module('BattlePropertyServer',asset_overrides.get('BattlePropertyServer'));self.setglobal(L,b'_active_property')
        unit_known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util',b'Battle.DbgEngine.Cmd.BattleCmdServer':b'_oracle_cmd',b'Battle.DbgEngine.BattlePropertyServer':b'_active_property',b'Battle.Util.BattleUnitUtil':b'_active_unit_util'}
        unit_empty={b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.Event.BattleLogicEvent',b'Battle.DbgEngine.DataCenter.BattleRoleData',b'Battle.DbgEngine.Role.Component.TagManagerComp'}
        def unit_require(s):
            name=self.string(s,1,None)
            if name in unit_known:self.getglobal(s,unit_known[name])
            elif name in unit_empty:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(unit_require);self.setglobal(L,b'require');self.module('BattleUnitUtil',asset_overrides.get('BattleUnitUtil'));self.setglobal(L,b'_active_unit_util');self.module('BattleUnitBase',asset_overrides.get('BattleUnitBase'));self.setglobal(L,b'_active_unit')
        self.active_ctor_cb=C.CFUNCTYPE(C.c_int,C.c_void_p)(self._construct_active);self.callbacks.append(self.active_ctor_cb)
        self.function_ctor_cb=C.CFUNCTYPE(C.c_int,C.c_void_p)(self._construct_function);self.callbacks.append(self.function_ctor_cb)
        def runtime_require(s):
            name=self.string(s,1,None)
            if name==b'Battle.DbgEngine.Effect.BEActiveDamage':self.pushclosure(s,self.active_ctor_cb,0)
            elif name==b'Battle.DbgEngine.Effect.BEFunctionEffect':self.pushclosure(s,self.function_ctor_cb,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(runtime_require);self.setglobal(L,b'require')
        self.getglobal(L,b'table');self.method('contains',lambda s:(self.boolean(s,False),1)[1]);self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)

    def _copy(self,s,source,names):
        for name in names:self.getglobal(s,source);self.getfield(s,-1,name.encode());self.setfield(s,-3,name.encode());self.top(s,-2)

    def _construct_active(self,s):
        self.pushvalue(s,1);self.setglobal(s,b'_active_engine_arg');self.pushvalue(s,2);self.setglobal(s,b'_active_config_arg')
        self.table(s,0,40)
        self._copy(s,b'_active_base',('PreTrigger','AppendToParentEffect','TryDoEffect','GetConfigBeforeDelay','GenTargets','GenParams','DoMultiEffect','GetDamageSubType','PlayEffectSfx'))
        self._copy(s,b'_active_class',('DoEffect','__DoMultiEffect','GetDamageSubTypeValue','IsSingleTarget','Damage2SingleTarget'))
        self.method('CheckCondition',lambda state:(self.boolean(state,True),1)[1]);self.setglobal(s,b'_active_object')
        self.getglobal(s,b'_active_class');self.getfield(s,-1,b'ctor');self.getglobal(s,b'_active_object');self.getglobal(s,b'_active_engine_arg');self.getglobal(s,b'_active_config_arg');self.check(self.call(s,3,0,0,0,None));self.top(s,0);self.getglobal(s,b'_active_object');return 1

    def _construct_function(self,s):
        self.getfield(s,2,b'funcArgs');self.rawget(s,-1,1);self.getfield(s,-1,b'uid');target_uid=self.tonumber(s,-1,None);self.top(s,2)
        self.childConfigs.append({'targetUid':target_uid});self.pushvalue(s,1);self.setglobal(s,b'_function_engine_arg');self.pushvalue(s,2);self.setglobal(s,b'_function_config_arg')
        self.table(s,0,24)
        self._copy(s,b'_active_base',('PreTrigger','AppendToParentEffect','TryDoEffect','GetConfigBeforeDelay','GenTargets','GenParams','PlayEffectSfx'))
        self._copy(s,b'_function_class',('DoEffect',))
        self.method('CheckCondition',lambda state:(self.boolean(state,True),1)[1]);self.setglobal(s,b'_function_object')
        self.getglobal(s,b'_function_class');self.getfield(s,-1,b'ctor');self.getglobal(s,b'_function_object');self.getglobal(s,b'_function_engine_arg');self.getglobal(s,b'_function_config_arg');self.check(self.call(s,3,0,0,0,None));self.top(s,0);self.getglobal(s,b'_function_object');return 1

    def _array(self,s,values):
        self.table(s,len(values),0)
        for index,value in enumerate(values,1):self.number(s,value);self.rawset(s,-2,index)

    def run_active(self,v):
        L=self.state;self.top(L,0);self.errors.clear();self.childConfigs=[];self.childPreTriggers=[];self.delays=[];self.hitEvents=[];self.propertyEvents=[];self.formulaOutputs=[];self.nextUid=100
        self.values={
            'caster':{'damagetimes_plus':v['plus'],'damagetimes_per':v['per'],'crit_damage':v['critDamage'],'crit_damage_per':0},
            'player':{},'tags':[],'dimensionFixPer':0,'skillArgsPlus':0,
            'awakerCritDamage':v['critDamage'],'critDamagePer':0,'beDamagePer':0,'beDamagePer2':0,'beDamagePer3':0,
            'vulnerablePer':0,'beDamagePlus':0,'enemyTypeDmgPer':0,'enemyStateDmgMultiplier':1,
            'enemyBuffDmgPer':0,'enemyDebuffDmgPer':0,'enemyBlockDmgPer':0,'enemyBlockBarrierDmgPer':0,
        }
        self.table(L,0,10)
        for name in ('CreateEffect','GetParentEffectUid','GetEffectByUid','SetRunningEffect'):
            self.getglobal(L,b'_active_manager_class');self.getfield(L,-1,name.encode());self.setfield(L,-3,name.encode());self.top(L,-2)
        self.table(L,0,0);self.setfield(L,-2,b'effectList');self.setglobal(L,b'_active_manager')
        self.table(L,0,18)
        def uid(s):self.nextUid+=1;self.number(s,self.nextUid);return 1
        self.method('GenObjUid',uid)
        def get_obj(s):
            value=int(self.tonumber(s,2,None))
            if value==1:self.getglobal(s,b'_active_caster')
            else:self.nil(s)
            return 1
        self.method('GetObj',get_obj);self.method('GetCurPassTime',lambda s:(self.number(s,12.5),1)[1])
        def add_time(s):self.delays.append(self.tonumber(s,2,None));return 0
        self.method('AddPassTime',add_time);self.method('Warn',lambda s:0);self.method('Error',lambda s:0)
        self.method('IsPVE',lambda s:(self.boolean(s,True),1)[1]);self.method('IsPVP',lambda s:(self.boolean(s,False),1)[1])
        def debug(s):
            if self.kind(s,3)==3:self.formulaOutputs.append(self.tonumber(s,3,None))
            return 0
        self.method('Debug',debug);self.getglobal(L,b'_setup_roles');self.setfield(L,-2,b'roleMgr')
        self.table(L,0,1)
        def on_be_hit(s):
            row={}
            for name in ('castDamage','changeVal','realDamage','curHp'):
                self.getfield(s,3,name.encode());row[name]=self.tonumber(s,-1,None);self.top(s,-2)
            self.getfield(s,3,b'isCrit');row['isCrit']=bool(self.tobool(s,-1));self.top(s,-2);self.hitEvents.append(row);return 0
        self.method('OnBeHit',on_be_hit);self.setfield(L,-2,b'recordMgr')
        self.table(L,0,3);self.method('GetConstant',lambda s:(self.number(s,v['multiDelay']),1)[1]);self.method('GetOriginalConstant',lambda s:(self.table(s,0,0),1)[1]);self.table(L,0,0);self.setfield(L,-2,b'BattleApi');self.setfield(L,-2,b'battleDT')
        self.getglobal(L,b'_active_manager');self.setfield(L,-2,b'effectMgr');self.setglobal(L,b'_active_engine')
        self.getglobal(L,b'_active_manager');self.getglobal(L,b'_active_engine');self.setfield(L,-2,b'battleEngine');self.top(L,0)
        self.getglobal(L,b'_setup_actor');self.method('IsDead',lambda s:(self.boolean(s,False),1)[1])
        for name,key in [('GetDamagePer2MonsterType','enemyTypeDmgPer'),('GetDamagePer2HasState','enemyStateDmgMultiplier'),('GetDamagePer2BuffEnemy','enemyBuffDmgPer'),('GetDamagePer2DebuffEnemy','enemyDebuffDmgPer'),('GetDamagePer2Block','enemyBlockDmgPer'),('GetDamagePer2BlockBarrier','enemyBlockBarrierDmgPer')]:
            self.method(name,lambda s,key=key:(self.number(s,self.values[key]),1)[1])
        self.setglobal(L,b'_active_caster')
        self.getglobal(L,b'_active_unit');self.number(L,20);self.setfield(L,-2,b'uid');self.table(L,0,1);self.number(L,0);self.setfield(L,-2,b'fsmState');self.setfield(L,-2,b'data');self.getglobal(L,b'_active_property');self.setfield(L,-2,b'property');self.getglobal(L,b'_active_engine');self.setfield(L,-2,b'battleEngine')
        self.method('GetBattleLogName',lambda s:(self.pushstring(s,b'Synthetic target'),1)[1]);self.method('TryChangeToBeHitState',lambda s:0);self.method('DoDamageEvent',lambda s:0)
        def owner_changed(s):
            self.propertyEvents.append({'kind':'owner','property':self.string(s,2,None).decode(),'old':self.tonumber(s,3,None),'new':self.tonumber(s,4,None)});return 0
        self.method('OnPropertyChanged',owner_changed);self.setglobal(L,b'_active_target')
        target_props={'hp':v['hp'],'max_hp':v['hp'],'block':0,'immue_damage':0,'PreventBeActiveDamage':0,'PreventBeActiveDamageRetainHP':0,'be_damage_limit':0,'be_damage_statics':0,'pvp_death_resist':0,'be_damage_per':0,'be_damage_per2':0,'be_damage_per3':0,'vulnerable_per':0,'be_damage_plus':0}
        self.getglobal(L,b'_active_property');self.table(L,0,len(target_props))
        for key,value in target_props.items():self.number(L,value);self.setfield(L,-2,key.encode())
        self.setfield(L,-2,b'properties');self.getglobal(L,b'_active_target');self.setfield(L,-2,b'owner')
        def send_changed(s):
            self.propertyEvents.append({'kind':'send','property':self.string(s,3,None).decode(),'delta':self.tonumber(s,4,None),'new':self.tonumber(s,5,None)});return 0
        self.method('SendOnPropertyChanged',send_changed);self.top(L,0)
        self.table(L,0,16);self.number(L,77);self.setfield(L,-2,b'uid');self.number(L,1);self.setfield(L,-2,b'castRoleUid');self.number(L,0);self.setfield(L,-2,b'cardUid');self.getglobal(L,b'_active_engine');self.setfield(L,-2,b'battleEngine')
        def target_exp(s):
            self.table(s,0,1)
            def get_targets(state):self.table(state,1,0);self.getglobal(state,b'_active_target');self.rawset(state,-2,1);return 1
            self.method('GetTargetList',get_targets);return 1
        self.method('GenerateTargetsExp',target_exp);self.method('GetValueListByCmd',lambda s:(self._array(s,[v['baseDamage'],v['repeat'],0,0]),1)[1])
        self.method('CalcCrit',lambda s:(self.boolean(s,v['crit']),1)[1]);self.method('GetMemberValue',lambda s:(self.boolean(s,v['crit']),1)[1]);self.method('SetMemberValue',lambda s:0);self.method('GetDimensionFixPer',lambda s:(self.number(s,0),1)[1]);self.method('GetSkillArgsPlus',lambda s:(self.number(s,0),1)[1]);self.method('IsStateTriggerAdd',lambda s:(self.boolean(s,False),1)[1]);self.method('GetSkillType',lambda s:(self.table(s,0,0),1)[1])
        self._copy(L,b'_oracle_cmd',('__GetShowDamage','__GetFinalDamage','GetTargetBeDmgPerMul','GetRealDmg'));self.setglobal(L,b'_active_command')
        self.table(L,0,3);self.pushstring(L,b'BEActiveDamage');self.setfield(L,-2,b'Type');self.pushstring(L,b'One');self.setfield(L,-2,b'Target');self.pushstring(L,b'synthetic');self.setfield(L,-2,b'Para');self.setglobal(L,b'_active_row')
        self.table(L,0,9);self.pushstring(L,b'BEActiveDamage');self.setfield(L,-2,b'effectType');self.getglobal(L,b'_active_row');self.setfield(L,-2,b'cmdCfg');self.getglobal(L,b'_active_command');self.setfield(L,-2,b'cmdServer');self.number(L,1);self.setfield(L,-2,b'cmdIndex');self.number(L,v['beforeDelay']);self.setfield(L,-2,b'BeforeDelay');self.number(L,1);self.setfield(L,-2,b'castRoleUid');self.boolean(L,v['skipPhase']);self.setfield(L,-2,b'skipPhase');self.boolean(L,True);self.setfield(L,-2,b'isFromCmd');self.setglobal(L,b'_active_config')
        self.getglobal(L,b'_active_manager');self.getfield(L,-1,b'CreateEffect');self.getglobal(L,b'_active_manager');self.getglobal(L,b'_active_config');self.boolean(L,True);self.check(self.call(L,3,1,0,0,None));self.setglobal(L,b'_active_effect');self.top(L,0)
        self.getglobal(L,b'_active_effect');self.getfield(L,-1,b'PreTrigger');self.getglobal(L,b'_active_effect');self.table(L,0,1);self.number(L,7);self.setfield(L,-2,b'token');self.check(self.call(L,2,0,0,0,None));self.top(L,0)
        self.getglobal(L,b'_active_effect');self.getfield(L,-1,b'TryDoEffect');self.getglobal(L,b'_active_effect');self.check(self.call(L,1,1,0,0,None));eligible=bool(self.tobool(L,-1));self.top(L,0)
        self.getglobal(L,b'_active_effect');self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_active_effect');self.check(self.call(L,1,1,0,0,None));executed=bool(self.tobool(L,-1));self.top(L,0)
        if v['extraRepeat']:
            self.getglobal(L,b'_active_effect');self.getfield(L,-1,b'DoMultiEffect');self.getglobal(L,b'_active_effect');self.check(self.call(L,1,1,0,0,None));self.top(L,0)
        self.getglobal(L,b'_active_manager');self.getfield(L,-1,b'effectList');child_count=self.length(L,-1);self.top(L,0)
        for index in range(2,child_count+1):
            self.getglobal(L,b'_active_manager');self.getfield(L,-1,b'effectList');self.rawget(L,-1,index);self.setglobal(L,b'_active_child');self.top(L,0)
            self.getglobal(L,b'_active_child');self.getfield(L,-1,b'PreTrigger');self.getglobal(L,b'_active_child');self.check(self.call(L,1,0,0,0,None));self.top(L,0);self.childPreTriggers.append(None)
            self.getglobal(L,b'_active_child');self.getfield(L,-1,b'TryDoEffect');self.getglobal(L,b'_active_child');self.check(self.call(L,1,1,0,0,None));child_eligible=bool(self.tobool(L,-1));self.top(L,0)
            self.getglobal(L,b'_active_child');self.getfield(L,-1,b'DoEffect');self.getglobal(L,b'_active_child');self.check(self.call(L,1,1,0,0,None));child_executed=bool(self.tobool(L,-1));self.top(L,0)
            if not child_eligible or not child_executed:self.errors.append(f'child {index} did not execute')
        self.getglobal(L,b'_active_effect');result={}
        for field in ('uid','parentEffectUid','preTriggerTime','totalEffectTimes','leftEffectTimes'):
            self.getfield(L,-1,field.encode());result[field]=self.tonumber(L,-1,None) if self.kind(L,-1)==3 else None;self.top(L,-2)
        self.top(L,0);self.getglobal(L,b'_active_manager');self.getfield(L,-1,b'effectList');manager_count=self.length(L,-1);self.top(L,0)
        if self.errors:raise RuntimeError(self.errors)
        self.getglobal(L,b'_active_property');self.getfield(L,-1,b'properties');self.getfield(L,-1,b'hp');hp_after=self.tonumber(L,-1,None);self.top(L,0)
        return {'eligible':eligible,'executed':executed,'effect':result,'managerEffectCount':manager_count,'childConfigs':self.childConfigs,'childPreTriggers':self.childPreTriggers,'formulaOutputs':self.formulaOutputs,'hitEvents':self.hitEvents,'propertyEvents':self.propertyEvents,'hpAfter':hp_after,'delays':self.delays}


CASES=[
 {'name':'one-hit','baseDamage':100,'repeat':1,'plus':0,'per':0,'crit':False,'critDamage':50,'hp':1000,'beforeDelay':.1,'multiDelay':.2,'skipPhase':False,'extraRepeat':False},
 {'name':'flat-repeat','baseDamage':100,'repeat':2,'plus':1,'per':0,'crit':True,'critDamage':50,'hp':1000,'beforeDelay':0,'multiDelay':.2,'skipPhase':False,'extraRepeat':True},
 {'name':'percent-repeat','baseDamage':100,'repeat':2,'plus':0,'per':50,'crit':False,'critDamage':50,'hp':1000,'beforeDelay':.5,'multiDelay':.25,'skipPhase':False,'extraRepeat':True},
 {'name':'skip-phase','baseDamage':100,'repeat':2,'plus':0,'per':0,'crit':True,'critDamage':50,'hp':1000,'beforeDelay':.5,'multiDelay':.25,'skipPhase':True,'extraRepeat':True},
]


def main():
    oracle=ActiveEffectExecutionOracle();fixtures=[{'input':row,'expected':oracle.run_active(row)} for row in CASES]
    output=ROOT/'tests/synthetic/original-active-effect-execution.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{name:oracle.assets[name+'.lua']['sha256'] for name in ('BattleEffectMgrServer','BattleEffectServer','BEActiveDamage','BEFunctionEffect','BattleCmdServer','BattleUtilServer','BattleConst','BattleUnitBase','BattleUnitUtil','BattlePropertyServer')},'scope':'Original effect-manager creation of BEActiveDamage and BEFunctionEffect, original constructors, target/parameter binding, repetition routing, Function dispatch, Damage2SingleTarget, GetRealDmg offensive/final-target arithmetic, BattleUnitBase.BeHit and BattlePropertyServer HP mutation. Explicit neutral PvE actor/player/target adapters and empty skill types; table.contains is an explicit false adapter for that empty list. Property callbacks and hit recording are observers; animation and downstream damage/death event dispatch are no-op adapters. No scheduler completion, event lifecycle, gameplay or holdout.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n');print('Generated',len(fixtures),'active-effect execution cases')


if __name__=='__main__':main()
