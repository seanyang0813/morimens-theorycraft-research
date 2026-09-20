"""Execute original target/crit methods with explicit synthetic object adapters.

No gameplay simulation: no card object, no skill tags, ordinary All subtype.
Both __GetFinalDamage and GetTargetBeDmgPerMul execute original bytecode.
"""
import ctypes as C
import json
import random
from runtime_oracle import Oracle, ROOT


class TargetOracle(Oracle):
    def __init__(self):
        super().__init__()
        self.callbacks = []
        self.errors = []
        self.values = {}
        self.boolean = self.lib.lua_pushboolean
        self.boolean.argtypes = [C.c_void_p, C.c_int]
        self.boolean.restype = None
        self.nil = self.lib.lua_pushnil
        self.nil.argtypes = [C.c_void_p]
        self.nil.restype = None
        L = self.state

        def new_class(s):
            self.table(s, 0, 100)
            self.table(s, 0, 0)
            return 2
        self.getglobal(L, b'_oracle_config_system')
        self.method('NewClass', new_class)
        self.top(L, 0)

        def require(s):
            name = self.string(s, 1, None)
            known = {b'System.System': b'_oracle_config_system',
                     b'Battle.BattleConst': b'_oracle_bc',
                     b'Battle.Util.BattleUtilServer': b'_oracle_util'}
            if name in known:
                self.getglobal(s, known[name])
            elif name in [b'Battle.Ecs.BattleComponent', b'Battle.DbgEngine.Cmd.BattleCmdParser']:
                self.table(s, 0, 0)
            else:
                self.errors.append('Unexpected dependency: ' + repr(name))
                self.nil(s)
            return 1
        self.callback(require)
        self.setglobal(L, b'require')
        self.module('BattleCmdServer')
        if self.errors:
            raise RuntimeError(self.errors)
        self.setglobal(L, b'_oracle_cmd')
        self.top(L, 0)

        def property_get(mapping):
            def get(s):
                key = self.string(s, 2, None)
                if key not in mapping:
                    self.errors.append('Unexpected property: ' + repr(key))
                    value = 0
                else:
                    value = self.values[mapping[key]]
                self.number(s, value)
                return 1
            return get

        self.table(L, 0, 10)
        self.method('GetProperty', property_get({b'crit_damage':'awakerCritDamage', b'crit_damage_per':'critDamagePer'}))
        self.method('IsRoleType', self.true)
        for name, key in [('GetDamagePer2MonsterType','enemyTypeDmgPer'),
                          ('GetDamagePer2HasState','enemyStateDmgMultiplier'),
                          ('GetDamagePer2BuffEnemy','enemyBuffDmgPer'),
                          ('GetDamagePer2DebuffEnemy','enemyDebuffDmgPer'),
                          ('GetDamagePer2Block','enemyBlockDmgPer'),
                          ('GetDamagePer2BlockBarrier','enemyBlockBarrierDmgPer')]:
            def get(s, key=key):
                self.number(s, self.values[key])
                return 1
            self.method(name, get)
        self.setglobal(L, b'_oracle_actor')
        self.table(L, 0, 2)
        self.method('GetProperty', property_get({b'be_damage_per':'beDamagePer',b'be_damage_per2':'beDamagePer2',b'be_damage_per3':'beDamagePer3',b'vulnerable_per':'vulnerablePer',b'be_damage_plus':'beDamagePlus'}))
        self.setglobal(L, b'_oracle_target')

        self.table(L, 0, 5)
        def get_obj(s):
            if self.tonumber(s, 2, None) == 1:
                self.getglobal(s, b'_oracle_actor')
            else:
                self.nil(s)
            return 1
        self.method('GetObj', get_obj)
        self.setglobal(L, b'_oracle_engine')
        self.table(L, 0, 6)
        self.getglobal(L, b'_oracle_engine')
        self.setfield(L, -2, b'battleEngine')
        self.number(L, 1)
        self.setfield(L, -2, b'castRoleUid')
        self.number(L, 0)
        self.setfield(L, -2, b'cardUid')
        def empty_types(s):
            self.table(s, 0, 0)
            return 1
        self.method('GetSkillType', empty_types)
        self.method('IsStateTriggerAdd', self.true)
        # Fetch the original helper without substituting its arithmetic.
        self.setglobal(L, b'_oracle_self')
        self.getglobal(L, b'_oracle_cmd')
        self.getfield(L, -1, b'GetTargetBeDmgPerMul')
        self.setglobal(L, b'_oracle_target_method')
        self.top(L, 0)
        self.getglobal(L, b'_oracle_self')
        self.getglobal(L, b'_oracle_target_method')
        self.setfield(L, -2, b'GetTargetBeDmgPerMul')
        self.top(L, 0)

    def true(self, s):
        self.boolean(s, 1)
        return 1

    def callback(self, fn):
        wrapped = C.CFUNCTYPE(C.c_int, C.c_void_p)(fn)
        self.callbacks.append(wrapped)
        self.pushclosure(self.state, wrapped, 0)

    def method(self, name, fn):
        self.callback(fn)
        self.setfield(self.state, -2, name.encode())

    def final_damage(self, show_damage, values):
        self.values = values
        self.errors.clear()
        L = self.state
        self.top(L, 0)
        self.getglobal(L, b'_oracle_cmd')
        self.getfield(L, -1, b'__GetFinalDamage')
        self.getglobal(L, b'_oracle_self')
        self.number(L, show_damage)
        self.getglobal(L, b'_oracle_target')
        self.boolean(L, values['isCrit'])
        # nil differs from both exclusive subtypes, selecting both branches.
        self.nil(L)
        self.check(self.call(L, 5, 1, 0, 0, None))
        if self.errors:
            raise RuntimeError(self.errors)
        return self.tonumber(L, -1, None)


if __name__ == '__main__':
    oracle = TargetOracle()
    keys = ['awakerCritDamage','cardCritDamage','skillTypeCritDamage','awakerCardCritDamage','critDamagePer','beDamagePer','beDamagePer2','beDamagePer3','beDamagePer4','beDamagePer5','vulnerablePer','enemyTypeDmgPer','enemyBuffDmgPer','enemyDebuffDmgPer','enemyBlockDmgPer','enemyBlockBarrierDmgPer','cardBlockBarrierPer','beDamagePlus']
    neutral = dict.fromkeys(keys, 0)
    neutral.update(isCrit=False, enemyStateDmgMultiplier=1)
    unsupported = ['cardCritDamage','skillTypeCritDamage','awakerCardCritDamage','beDamagePer4','beDamagePer5','cardBlockBarrierPer']
    varying = [k for k in keys if k not in unsupported]
    cases = [(100, neutral.copy())]
    for key in varying:
        for value in [-100, -25, 0.1, 20, 25, 50, 100, 200]:
            cases.append((100, {**neutral, key:value, 'isCrit':True}))
    rng = random.Random(20260919)
    for _ in range(2000):
        data = neutral.copy()
        data['isCrit'] = bool(rng.randrange(2))
        for k in rng.sample(varying, rng.randint(1, len(varying))):
            data[k] = rng.choice([-50, -25, 0.1, 3, 12.5, 20, 25, 33.333, 50, 100, 150])
        data['enemyStateDmgMultiplier'] = rng.choice([0.5, 1, 1.25, 1.5, 2])
        cases.append((rng.randint(1, 10000000), data))
    fixtures = [{'id':f'target-{i}', 'showDamage':n, 'input':v, 'expected':oracle.final_damage(n,v)} for i,(n,v) in enumerate(cases)]
    result = {'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'PC-res144-build51','sourceHash':oracle.assets['BattleCmdServer.lua']['sha256'], 'scope':'Original target/crit methods; actor adapter, no card, no skill tags, state-trigger-add helper branch; not HP resolution or gameplay', 'excludedInputs':unsupported, 'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-target-runtime.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print('Wrote',len(fixtures),'original target-runtime cases')
