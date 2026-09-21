"""Execute original BattleUnitBase.UseAttachPostCard through observable adapters."""
import ctypes as C
import json

from card_effect_chain_oracle import CardEffectChainOracle, ROOT


class UseAttachPostCardOracle(CardEffectChainOracle):
    def __init__(self, asset_overrides=None):
        super().__init__(asset_overrides)
        self.gettop = self.lib.lua_gettop
        self.gettop.argtypes = [C.c_void_p]
        self.gettop.restype = C.c_int

    def _same_global(self, state, index, name):
        index = self.absindex(state, index)
        self.getglobal(state, name)
        same = bool(self.rawequal(state, index, -1))
        self.top(state, -2)
        return same

    def _typed(self, state, index):
        kind = self.kind(state, index)
        if kind == 0:
            return {'type': 'nil', 'value': None}
        if kind == 1:
            return {'type': 'boolean', 'value': bool(self.tobool(state, index))}
        if kind == 3:
            return {'type': 'number', 'value': self.tonumber(state, index, None)}
        if kind == 4:
            return {'type': 'string', 'value': self.string(state, index, None).decode()}
        if kind == 5:
            for label, name in (
                ('card', b'_attach_use_card'),
                ('serializedCard', b'_attach_use_serialized'),
                ('owner', b'_attach_use_owner'),
                ('mainCommand', b'_attach_use_main'),
                ('preCommand', b'_attach_use_pre'),
                ('attachPostParam', b'_attach_use_param'),
            ):
                if self._same_global(state, index, name):
                    return {'type': 'table', 'identity': label}
            return {'type': 'table', 'identity': 'other'}
        return {'type': 'other', 'luaType': kind}

    def _effect(self, state, config):
        config = self.absindex(state, config)
        result = {
            'effectType': self._value_field(state, config, 'effectType'),
            'castRoleUid': self._number_field(state, config, 'castRoleUid'),
            'cardUid': self._number_field(state, config, 'cardUid'),
            'camp': self._number_field(state, config, 'camp'),
            'targetType': self._number_field(state, config, 'targetType'),
            'cancelable': self._value_field(state, config, 'cancelable'),
            'skipPhase': self._value_field(state, config, 'skipPhase'),
        }
        self.getfield(state, config, b'cmdServer')
        result['cmdServer'] = self._typed(state, -1)
        self.top(state, -2)
        self.getfield(state, config, b'clientTargetUids')
        result['clientTargetCount'] = int(self.rawlen(state, -1)) if self.kind(state, -1) == 5 else None
        self.top(state, -2)
        return result

    def run_use_attach(self, value):
        state = self.state
        self.top(state, 0)
        self.errors.clear()
        events = []

        self.table(state, 0, 2)
        self.setglobal(state, b'_attach_use_main')
        self.table(state, 0, 0)
        self.setglobal(state, b'_attach_use_pre')

        self.table(state, 0, 8)
        self.number(state, value['cardUid'])
        self.setfield(state, -2, b'uid')
        self.getglobal(state, b'_attach_use_main')
        self.setfield(state, -2, b'cmdServer')
        self.method('GetCardCmdServer', lambda s: (self.getglobal(s, b'_attach_use_main'), 1)[1])
        self.method('GetCardPreCmdServer', lambda s: (self.getglobal(s, b'_attach_use_pre') if value['hasPre'] else self.nil(s), 1)[1])
        self.method('GetCmdTarget', lambda s: (self.number(s, value['targetType']), 1)[1])
        self.method('Serialize', lambda s: (self.getglobal(s, b'_attach_use_serialized'), 1)[1])
        self.setglobal(state, b'_attach_use_card')
        self.table(state, 0, 0)
        self.setglobal(state, b'_attach_use_serialized')

        self.table(state, 0, 5)

        def create_card(s):
            info = self.absindex(s, 2)
            self.getfield(s, info, b'owner')
            owner_is_input = self._same_global(s, -1, b'_attach_use_owner')
            self.top(s, -2)
            events.append({'stage': 'CreateCardByInfo', 'arguments': {
                'tid': self._number_field(s, info, 'tid'),
                'level': self._number_field(s, info, 'level'),
                'deck': self._value_field(s, info, 'deck'),
                'camp': self._number_field(s, info, 'camp'),
                'ownerIsInput': owner_is_input,
            }})
            self.getglobal(s, b'_attach_use_card')
            return 1

        self.method('CreateCardByInfo', create_card)

        def set_current(s):
            events.append({'stage': 'SetCurUseCard', 'arguments': [self._typed(s, index) for index in range(2, self.gettop(s) + 1)]})
            return 0

        self.method('SetCurUseCard', set_current)
        self.setglobal(state, b'_attach_use_card_mgr')

        self.table(state, 0, 1)

        def create_effect(s):
            events.append({'stage': 'CreateEffect', 'request': self._effect(s, 2)})
            return 0

        self.method('CreateEffect', create_effect)
        self.setglobal(state, b'_attach_use_effect_mgr')

        self.table(state, 0, 2)

        def add_record(s):
            events.append({'stage': 'OnAddNewCard', 'arguments': [self._typed(s, index) for index in range(2, self.gettop(s) + 1)]})
            return 0

        self.method('OnAddNewCard', add_record)
        self.setglobal(state, b'_attach_use_record_mgr')

        self.table(state, 0, 5)
        for field, name in (
            ('cardMgr', b'_attach_use_card_mgr'),
            ('effectMgr', b'_attach_use_effect_mgr'),
            ('recordMgr', b'_attach_use_record_mgr'),
        ):
            self.getglobal(state, name)
            self.setfield(state, -2, field.encode())
        self.setglobal(state, b'_attach_use_engine')

        self.table(state, 0, 8)
        self.number(state, value['ownerUid'])
        self.setfield(state, -2, b'uid')
        self.number(state, value['camp'])
        self.setfield(state, -2, b'camp')
        self.getglobal(state, b'_attach_use_engine')
        self.setfield(state, -2, b'battleEngine')
        self.method('GetCamp', lambda s: (self.number(s, value['camp']), 1)[1])
        self.getglobal(state, b'_behit_unit')
        self.getfield(state, -1, b'UseAttachPostCard')
        self.setfield(state, -3, b'UseAttachPostCard')
        self.top(state, -2)
        self.setglobal(state, b'_attach_use_owner')

        self.table(state, 0, 1)
        self.boolean(state, value['isTriggerBST'])
        self.setfield(state, -2, b'isTriggerBST')
        self.setglobal(state, b'_attach_use_param')

        self.getglobal(state, b'_attach_use_owner')
        self.getfield(state, -1, b'UseAttachPostCard')
        self.getglobal(state, b'_attach_use_owner')
        self.number(state, value['skillId'])
        self.number(state, value['skillLevel'])
        self.getglobal(state, b'_attach_use_param')
        self.check(self.call(state, 4, 1, 0, 0, None))
        returned = bool(self.tobool(state, -1)) if self.kind(state, -1) == 1 else None

        self.top(state, 0)
        self.getglobal(state, b'_attach_use_main')
        self.getfield(state, -1, b'attachPostParam')
        param_binding = self._typed(state, -1)
        is_trigger = None
        if self.kind(state, -1) == 5:
            self.getfield(state, -1, b'isTriggerBST')
            is_trigger = bool(self.tobool(state, -1))
            self.top(state, -2)
        if self.errors:
            raise RuntimeError(self.errors)
        return {'returned': returned, 'events': events, 'mainCommandAttachPostParam': {'binding': param_binding, 'isTriggerBST': is_trigger}}


CASES = [
    {'name': 'arachne-main-only', 'skillId': 133381, 'skillLevel': 7, 'camp': 3, 'ownerUid': 99, 'cardUid': 900, 'targetType': 123, 'hasPre': False, 'isTriggerBST': False},
    {'name': 'mouchette-main-only', 'skillId': 123159, 'skillLevel': 1, 'camp': 2, 'ownerUid': 71, 'cardUid': 901, 'targetType': 456, 'hasPre': False, 'isTriggerBST': False},
    {'name': 'pre-command', 'skillId': 133381, 'skillLevel': 3, 'camp': 3, 'ownerUid': 88, 'cardUid': 902, 'targetType': 789, 'hasPre': True, 'isTriggerBST': False},
    {'name': 'trigger-bst', 'skillId': 123159, 'skillLevel': 5, 'camp': 1, 'ownerUid': 42, 'cardUid': 903, 'targetType': 321, 'hasPre': False, 'isTriggerBST': True},
]


def main():
    oracle = UseAttachPostCardOracle()
    fixtures = [{'input': row, 'expected': oracle.run_use_attach(row)} for row in CASES]
    output = ROOT / 'tests/synthetic/original-use-attach-post-card.json'
    output.write_text(json.dumps({
        'kind': 'SYNTHETIC_ORIGINAL_RUNTIME',
        'build': 'pc-res144-build51',
        'sourceHashes': {'BattleUnitBase': oracle.assets['BattleUnitBase.lua']['sha256'], 'BattleConst': oracle.assets['BattleConst.lua']['sha256']},
        'scope': 'Original BattleUnitBase.UseAttachPostCard with explicit card-constructor, card-manager, record-manager and effect-manager observers. Covers main-only, optional pre-command and trigger-parameter binding. No card initialization internals, effect execution, callbacks, gameplay or holdout.',
        'fixtures': fixtures,
    }, indent=2) + '\n', encoding='utf-8', newline='\n')
    print('Generated', len(fixtures), 'UseAttachPostCard cases')


if __name__ == '__main__':
    main()
