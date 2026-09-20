"""Repeated original effect/BeHit calls retaining one Lua target property table."""
import json
from effect_hp_oracle import EffectHpOracle, ROOT
class TimelineOracle(EffectHpOracle):
    def run(self,case):
        trace=[];after=dict(case['target'])
        for index,hit in enumerate(case['hits']):
            if after['hp']<=0:break
            before=dict(after)
            values=dict(damage=hit['damage'],damageType=hit['category'],puncture=hit['puncture'],dimensionFixPer=0,
                hp=after['hp'],block=after['block'],immune=False,preventEligible=False,retainHp=0,limit=0,usedLimit=0,deathResist=0,effectProperties={})
            if index==0:self.evaluate(values)
            else:self.invoke_attack(values)  # Deliberately retain Lua properties; no evaluate() reset.
            L=self.state;self.top(L,0);self.getglobal(L,b'_hp_property');self.getfield(L,-1,b'properties')
            for field in ['hp','block']:self.getfield(L,-1,field.encode());after[field]=self.tonumber(L,-1,None);self.top(L,-2)
            trace.append({'stepId':hit['id'],'before':before,'after':dict(after),'modeledHpLost':before['hp']-after['hp']})
        return {'targetAfter':after,'trace':trace,'executedSteps':len(trace)}
if __name__=='__main__':
    o=TimelineOracle();cases=[]
    def hit(name,category,damage,puncture=False):return dict(id=name,category=category,damage=damage,puncture=puncture)
    orders=[
        [hit('pierce','Fixed',100,True),hit('normal','Fixed',50)],
        [hit('normal','Fixed',50),hit('pierce','Fixed',100,True)],
        [hit('passive','Passive',25.25),hit('pure','Pure',50.5),hit('fixed','Fixed',75.75)],
        [hit('big','Fixed',1200),hit('later','Pure',50)],
    ]
    for hp in [80,1000]:
        for shield in [0,100,250]:
            for hits in orders:
                case={'target':{'hp':hp,'block':shield},'hits':hits};cases.append({'input':case,'expected':o.run(case)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51',
        'scope':'Sequential original Passive/Fixed/Pure effect calls, original BeHit and original property mutation retaining the same Lua properties. Zero modifiers and ordinary/Puncture subtypes as supplied. Harness stops after HP reaches zero. Damage events, animation and statistics remain no-op adapters; no card scheduler, callback effects, death execution or gameplay validation.',
        'sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BEPassiveDamage','BEFixedDamage','BEPureDamage','BattleEffectServer','BattleUnitBase','BattleUnitUtil','BattlePropertyServer']},'fixtures':cases}
    (ROOT/'tests/synthetic/original-hit-timeline.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(cases),'retained-state original hit timelines')
