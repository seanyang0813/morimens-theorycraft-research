"""Execute original BattleCardServer.InitOwner with explicit role/card lookups."""
import ctypes as C
import json

from target_runtime_oracle import TargetOracle, ROOT


class CardOwnerOracle(TargetOracle):
    def __init__(self,asset_overrides=None):
        asset_overrides=asset_overrides or {};super().__init__(asset_overrides);L=self.state
        empty={b'Battle.Ecs.BattleEntity',b'Battle.DbgEngine.Cmd.BattleCmdServer',b'Battle.DbgEngine.Event.BattleLogicEvent',b'Battle.DbgEngine.BattlePropertyServer',b'Battle.DbgEngine.DataCenter.BattleCardData',b'Battle.DbgEngine.Cmd.BattleCmdParser'}
        known={b'System.System':b'_oracle_config_system',b'Battle.BattleConst':b'_oracle_bc',b'Battle.Util.BattleUtilServer':b'_oracle_util'}
        def require(s):
            name=self.string(s,1,None)
            if name in known:self.getglobal(s,known[name])
            elif name in empty:self.table(s,0,0)
            else:self.errors.append(repr(name));self.nil(s)
            return 1
        self.callback(require);self.setglobal(L,b'require');self.module('BattleCardServer',asset_overrides.get('BattleCardServer'));self.setglobal(L,b'_owner_card_class')
        if self.errors:raise RuntimeError(self.errors)

    def _role(self,L,uid):
        self.table(L,0,1);self.number(L,uid);self.setfield(L,-2,b'uid')

    def run_owner(self,v):
        L=self.state;self.top(L,0);self.errors.clear();lookups=[]
        self._role(L,100);self.setglobal(L,b'_owner_player')
        self._role(L,200);self.setglobal(L,b'_owner_awaker')
        self._role(L,300);self.setglobal(L,b'_owner_special')
        self._role(L,400);self.setglobal(L,b'_owner_from_card_role')
        self.table(L,0,2);self.getglobal(L,b'_owner_from_card_role');self.setfield(L,-2,b'owner');self.table(L,0,1);self.number(L,777);self.setfield(L,-2,b'performSkillId');self.setfield(L,-2,b'data');self.setglobal(L,b'_owner_from_card')
        self.table(L,0,2)
        def get_player(s):lookups.append({'playerCamp':self.tonumber(s,2,None)});self.getglobal(s,b'_owner_player');return 1
        def get_awaker(s):
            lookups.append({'awakerTid':self.tonumber(s,2,None),'camp':self.tonumber(s,3,None)})
            self.getglobal(s,b'_owner_awaker') if v['awakerExists'] else self.nil(s);return 1
        self.method('GetPlayer',get_player);self.method('GetAwakerByTid',get_awaker);self.setglobal(L,b'_owner_role_mgr')
        self.table(L,0,1)
        def get_card(s):lookups.append({'fromCardUid':self.tonumber(s,2,None)});self.getglobal(s,b'_owner_from_card') if v['fromCardExists'] else self.nil(s);return 1
        self.method('GetCardByUid',get_card);self.setglobal(L,b'_owner_card_mgr')
        self.table(L,0,2);self.getglobal(L,b'_owner_role_mgr');self.setfield(L,-2,b'roleMgr');self.getglobal(L,b'_owner_card_mgr');self.setfield(L,-2,b'cardMgr');self.setglobal(L,b'_owner_engine')
        self.table(L,0,8);self.getglobal(L,b'_owner_engine');self.setfield(L,-2,b'battleEngine');self.number(L,v['camp']);self.setfield(L,-2,b'camp')
        self.table(L,0,1)
        if v['awakerId'] is not None:self.number(L,v['awakerId']);self.setfield(L,-2,b'AwakerID')
        self.setfield(L,-2,b'configData')
        if v['specialOwner']:self.getglobal(L,b'_owner_special');self.setfield(L,-2,b'specialOwner')
        self.table(L,0,2)
        if v['fromCardUid'] is not None:self.number(L,v['fromCardUid']);self.setfield(L,-2,b'fromCardUid')
        self.number(L,v['performSkillId']);self.setfield(L,-2,b'performSkillId');self.setfield(L,-2,b'data')
        self.getglobal(L,b'_owner_card_class');self.getfield(L,-1,b'InitOwner');self.setfield(L,-3,b'InitOwner');self.top(L,-2);self.setglobal(L,b'_owner_subject')
        self.getglobal(L,b'_owner_subject');self.getfield(L,-1,b'InitOwner');self.getglobal(L,b'_owner_subject');self.check(self.call(L,1,0,0,0,None))
        self.getglobal(L,b'_owner_subject');self.getfield(L,-1,b'owner');self.getfield(L,-1,b'uid');owner=self.tonumber(L,-1,None);self.top(L,0)
        self.getglobal(L,b'_owner_subject');self.getfield(L,-1,b'data');self.getfield(L,-1,b'performSkillId');perform=self.tonumber(L,-1,None)
        if self.errors:raise RuntimeError(self.errors)
        return {'ownerUid':owner,'performSkillId':perform,'lookups':lookups}


BASE={'camp':3,'awakerId':55,'specialOwner':False,'awakerExists':True,'fromCardUid':None,'fromCardExists':False,'performSkillId':123}
CASES=[
 {'name':'configured-awaker',**BASE},
 {'name':'special-owner',**BASE,'specialOwner':True},
 {'name':'missing-awaker-player-fallback',**BASE,'awakerExists':False},
 {'name':'missing-awaker-from-card',**BASE,'awakerExists':False,'fromCardUid':999,'fromCardExists':True},
 {'name':'missing-from-card-player-fallback',**BASE,'awakerExists':False,'fromCardUid':999,'fromCardExists':False},
 {'name':'non-awakener-skill-player',**BASE,'awakerId':None,'specialOwner':True},
]


def main():
    oracle=CardOwnerOracle();fixtures=[{'input':case,'expected':oracle.run_owner(case)} for case in CASES]
    output=ROOT/'tests/synthetic/original-card-owner.json'
    output.write_text(json.dumps({'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BattleCardServer':oracle.assets['BattleCardServer.lua']['sha256']},'scope':'Original BattleCardServer.InitOwner with explicit player, configured-Awakener, special-owner and source-card adapters. No constructor, command initialization, card states, gameplay or holdout validation.','fixtures':fixtures},indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Generated',len(fixtures),'original card-owner cases')


if __name__=='__main__':main()
