"""Execute original connected state-layer pipeline; explicit synthetic property environment."""
import itertools
import json
from card_state_multiplier_oracle import CardStateOracle, ROOT

FAMILIES=['StateLayerPer','UltiStateLayerPer','CmdCardStateLayerPer','StateLayerPerByCard','BeStateLayerPer','BeDirectCmdStateLayerPer','UltiFixedStateLayerPer','CmdCardFixedStateLayerPer','CardFixedStateLayerPer','DirectCmdStateLayerPer']
PERCENTAGES=[10,20,30,40,50,60,70,80,90,100]

class PipelineOracle(CardStateOracle):
    def run_pipeline(self,v):
        L=self.state;self.top(L,0);reads=[]
        self.getglobal(L,b'_oracle_bc');self.getfield(L,-1,b'AwakerProperty');self.getfield(L,-1,b'o_state_layer_per_power_bycmd')
        special=self.string(L,-1,None).decode();self.top(L,0)
        props={name:percent for name,percent in zip(FAMILIES,PERCENTAGES)}
        props.update({special:25,'card_n2':15,'fixed_n2':35})
        self.getglobal(L,b'_oracle_bc')
        for name in FAMILIES:
            self.table(L,2,0);self.pushstring(L,name.encode());self.rawset(L,-2,1)
            if name=='StateLayerPer':self.pushstring(L,special.encode());self.rawset(L,-2,2)
            self.setfield(L,-2,name.encode())
        for mapping,prop,n2 in [('CardStateLayerPerWithAwakerN2','StateLayerPerByCard','card_n2'),('CardFixedStateLayerPerWithAwakerN2','CardFixedStateLayerPer','fixed_n2')]:
            self.table(L,0,1);self.pushstring(L,n2.encode());self.setfield(L,-2,prop.encode());self.setfield(L,-2,mapping.encode())
        self.top(L,0)
        def property_get(owner):
            def get(s):
                name=self.string(s,2,None).decode();reads.append({'owner':owner,'property':name})
                if name not in props:self.errors.append('Unknown property '+name)
                self.number(s,props.get(name,0));return 1
            return get
        self.table(L,0,2);self.method('GetProperty',property_get('caster'))
        def awaker(s):self.boolean(s,v['awaker']);return 1
        self.method('IsRoleType',awaker);self.setglobal(L,b'_pipeline_caster')
        self.table(L,0,3);self.method('GetProperty',property_get('card'));self.method('is',self.true)
        def match(s):self.boolean(s,v['instruction']);return 1
        self.method('CardTypeMatch',match);self.setglobal(L,b'_pipeline_card')
        self.table(L,0,1);self.method('GetProperty',property_get('target'));self.setglobal(L,b'_pipeline_target')
        self.getglobal(L,b'_add_parent')
        self.table(L,0,2)
        for field,key in [('skipCasterStateLayerPerAfterFormula','skipCaster'),('noDirectCmd','noDirect')]:self.boolean(L,v[key]);self.setfield(L,-2,field.encode())
        self.setfield(L,-2,b'effectConfig')
        self.table(L,0,3);self.table(L,0,1);self.boolean(L,v['trigger']);self.setfield(L,-2,b'isTrigger');self.setfield(L,-2,b'cmdCtorData')
        def caster(s):
            if v['caster']:self.getglobal(s,b'_pipeline_caster')
            else:self.nil(s)
            return 1
        def types(s):
            self.table(s,1,0)
            if v['ulti']:
                self.getglobal(s,b'_oracle_bc');self.getfield(s,-1,b'SkillType');self.getfield(s,-1,b'Ulti_Skill')
                self.rawset(s,-4,1);self.top(s,-3)
            return 1
        self.method('GetCaster',caster);self.method('GetSkillType',types);self.setfield(L,-2,b'cmdServer')
        self.table(L,0,3)
        def card(s):
            if v['card']:self.getglobal(s,b'_pipeline_card')
            else:self.nil(s)
            return 1
        self.method('GetCurCard',card)
        def ids(s):self.number(s,2669 if v['matching'] else 7);return 1
        def get_func(s):self.callback(ids);return 1
        self.method('GetCmdFunc',get_func)
        self.table(L,0,2);self.table(L,0,len(props))
        for name in props:
            self.table(L,0,1);self.pushstring(L,b'explicit-state-id');self.setfield(L,-2,b'Data');self.setfield(L,-2,name.encode())
        self.setfield(L,-2,b'BattleApi')
        def dimensions(s):
            self.table(s,1,0)
            if v['dimension']:self.number(s,2669);self.rawset(s,-2,1)
            return 1
        self.method('GetOriginalConstant',dimensions);self.setfield(L,-2,b'battleDT');self.setfield(L,-2,b'battleEngine')
        def final(s):reads.append({'owner':'effect','property':'CalFinalVal'});self.number(s,self.tonumber(s,2,None)*1.3);return 1
        self.method('CalFinalVal',final);self.top(L,0)
        self.getglobal(L,b'_add_parent');self.getfield(L,-1,b'__CalcStateLayer');self.getglobal(L,b'_add_parent')
        self.number(L,v['layer']);self.number(L,2669);self.getglobal(L,b'_pipeline_target');self.check(self.call(L,4,1,0,0,None))
        if self.errors:raise RuntimeError(self.errors)
        return {'layer':self.tonumber(L,-1,None),'reads':reads}

if __name__=='__main__':
    o=PipelineOracle();fixtures=[]
    flags=['trigger','skipCaster','noDirect','ulti','instruction','awaker','dimension']
    for bits in itertools.product([False,True],repeat=len(flags)):
        for layer in [2.2,0,-1.2]:
            v=dict(zip(flags,bits),layer=layer,card=True,caster=True,matching=True)
            fixtures.append({'input':v,'expected':o.run_pipeline(v)})
    for card,caster,matching in itertools.product([False,True],repeat=3):
        v=dict.fromkeys(flags,True);v.update(trigger=False,skipCaster=False,noDirect=False,layer=3.1,card=card,caster=caster,matching=matching)
        fixtures.append({'input':v,'expected':o.run_pipeline(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'BEAddStateParent':o.assets['BEAddStateParent.lua']['sha256']},'scope':'392 connected original __CalcStateLayer and all percentage/direct/helper methods. Synthetic ordered property families and state mappings, supplied properties/current card/type/role/skill flags, dimension CalFinalVal multiplier adapter. Card skill and instruction matching share a supplied boolean; no trigger-state-owned card, real property derivation, creation or gameplay.','percentages':dict(zip(FAMILIES,PERCENTAGES)),'fixtures':fixtures}
    (ROOT/'tests/synthetic/original-state-layer-pipeline.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
    print('Generated',len(fixtures),'connected original state-layer cases')
