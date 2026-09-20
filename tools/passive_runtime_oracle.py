"""Original Passive effect + CalFinalVal; synthetic getters, intercepted BeHit.

Does not execute state changes, shields, damage caps, callbacks, or HP loss.
"""
import ctypes as C
import json
import random
from target_runtime_oracle import TargetOracle, ROOT


class PassiveOracle(TargetOracle):
    def __init__(self, effect_name='BEPassiveDamage'):
        super().__init__()
        self.effect_name = effect_name
        L = self.state
        self.rawseti = self.lib.lua_rawseti
        self.rawseti.argtypes = [C.c_void_p, C.c_int, C.c_longlong]
        self.rawseti.restype = None
        def require(s):
            name = self.string(s, 1, None)
            known = {b'System.System': b'_oracle_config_system',
                     b'Battle.BattleConst': b'_oracle_bc',
                     b'Battle.DbgEngine.Effect.BattleEffectServer': b'_passive_base'}
            if name in known:
                self.getglobal(s, known[name])
            elif name == b'Battle.Ecs.BattleEntity':
                self.table(s, 0, 0)
            else:
                self.errors.append('Unexpected dependency: ' + repr(name))
                self.nil(s)
            return 1
        self.callback(require)
        self.setglobal(L, b'require')
        self.module('BattleEffectServer')
        self.setglobal(L, b'_passive_base')
        self.module(effect_name)
        self.setglobal(L, b'_passive_effect')
        if self.errors:
            raise RuntimeError(self.errors)

    def evaluate(self, values):
        self.values = values
        self.errors.clear()
        self.captured = None
        L = self.state
        self.top(L, 0)
        self.table(L, 0, 8)
        self.number(L, 1)
        self.setfield(L, -2, b'leftEffectTimes')
        self.table(L, 4, 0)
        for i, value in enumerate([values['baseDamage'], 1, 1, 0], 1):
            self.number(L, value)
            self.rawseti(L, -2, i)
        self.setfield(L, -2, b'params')
        self.table(L, 0, 2)
        self.number(L, 1)
        self.setfield(L, -2, b'castRoleUid')
        self.setfield(L, -2, b'cmdServer')
        for name in ['CalFinalVal', 'GetDamageSubType']:
            self.getglobal(L, b'_passive_base')
            self.getfield(L, -1, name.encode())
            self.setfield(L, -3, name.encode())
            self.top(L, -2)
        def dimension(s):
            self.number(s, values['dimensionFixPer'])
            return 1
        self.method('GetDimensionFixPer', dimension)
        self.table(L, 1, 0)
        self.table(L, 0, 3)
        def dead(s):
            self.boolean(s, values['targetDead'])
            return 1
        def prop(s):
            key = self.string(s, 2, None).decode()
            mapping = {'be_passive_damage_per': 'passive1', 'be_passive_damage_per2': 'passive2', 'be_passive_damage_per3': 'passive3'}
            if self.effect_name == 'BEFixedDamage':
                mapping = {f'be_fixed_damage_per{i}': f'fixed{i}' for i in range(1, 6)}
            if key not in mapping:
                self.errors.append('Unexpected property: ' + key)
                self.number(s, 0)
            else:
                self.number(s, values[mapping[key]])
            return 1
        def hit(s):
            self.getfield(s, 2, b'damageVal')
            self.captured = self.tonumber(s, -1, None)
            return 0
        self.method('IsDead', dead)
        self.method('GetProperty', prop)
        self.method('BeHit', hit)
        self.rawseti(L, -2, 1)
        self.setfield(L, -2, b'targets')
        self.setglobal(L, b'_passive_self')
        self.getglobal(L, b'_passive_effect')
        self.getfield(L, -1, b'__DoMultiEffect')
        self.getglobal(L, b'_passive_self')
        self.check(self.call(L, 1, 1, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)
        return self.captured


if __name__ == '__main__':
    oracle = PassiveOracle()
    neutral = dict(baseDamage=100, passive1=0, passive2=0, passive3=0, dimensionFixPer=0, targetDead=False)
    cases = [neutral, {**neutral, 'targetDead': True}]
    for key in ['baseDamage', 'passive1', 'passive2', 'passive3', 'dimensionFixPer']:
        for value in [-150, -100, -99.9, -0.1, 0, 0.1, 1, 33.333, 100, 1000]:
            cases.append({**neutral, key:value})
    rng = random.Random(20260920)
    for _ in range(1000):
        cases.append(dict(baseDamage=rng.uniform(-100, 100000), passive1=rng.choice([-100,-25,0,0.1,50]), passive2=rng.choice([-100,-25,0,12.5,50]), passive3=rng.choice([-100,-25,0,33.333,100]), dimensionFixPer=rng.choice([-150,-100,-50,0,0.1,25,100]), targetDead=False))
    fixtures = [{'id':f'passive-{i}', 'input':v, 'expected':oracle.evaluate(v)} for i,v in enumerate(cases)]
    result = {'kind':'SYNTHETIC_ORIGINAL_RUNTIME', 'build':'pc-res144-build51', 'scope':'Original __DoMultiEffect, CalFinalVal, GetDamageSubType; explicit dimension getter and target properties; intercepted BeHit; no HP resolution', 'sourceHashes':{n:oracle.assets[n+'.lua']['sha256'] for n in ['BEPassiveDamage','BattleEffectServer']}, 'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-passive-runtime.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print('Wrote',len(fixtures),'original Passive-runtime cases')
