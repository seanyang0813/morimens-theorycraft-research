"""Original progression-key selection over scalar numeric CmdList maps."""
import ctypes as C
import json
from runtime_oracle import Oracle, ROOT

o=Oracle();L=o.state
rawseti=o.lib.lua_rawseti;rawseti.argtypes=[C.c_void_p,C.c_int,C.c_longlong];rawseti.restype=None
kind=o.lib.lua_type;kind.argtypes=[C.c_void_p,C.c_int];kind.restype=C.c_int
o.getglobal(L,b'_oracle_bc');o.getfield(L,-1,b'BREAKTHROUGH_AND_POTENCY_CONST');radix=int(o.tonumber(L,-1,None));o.top(L,0)
if radix<=0:raise RuntimeError('Missing progression radix')
skills=json.loads((ROOT/'research/extracted/config/Skill.json').read_text(encoding='utf-8'))
maps=[(sid,s['CmdList']) for sid,s in skills.items() if isinstance(s.get('CmdList'),dict) and s['CmdList'] and all(k.isdigit() and type(v) is int for k,v in s['CmdList'].items())]
maps.append(('synthetic-sparse',{'0':10,str(radix):20,'3':30}))
def run(name,mapping,breakthrough,potency):
    o.top(L,0);o.getglobal(L,b'_oracle_util');o.getfield(L,-1,name.encode());o.table(L,0,len(mapping))
    for key,value in mapping.items():o.number(L,value);rawseti(L,-2,int(key))
    o.number(L,breakthrough);o.number(L,potency);o.check(o.call(L,3,1,0,0,None))
    return None if kind(L,-1)==0 else o.tonumber(L,-1,None)
fixtures=[]
for sid,mapping in maps:
    for breakthrough in [0,1,2]:
        for potency in [0,1,3,6]:
            fixtures.append({'skillId':sid,'input':{'variants':mapping,'breakSkillLevel':breakthrough,'potencyLevel':potency},'expected':{'matchKey':run('GetMatchTQ',mapping,breakthrough,potency),'value':run('GetTQText',mapping,breakthrough,potency)}})
report={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','radix':radix,'scope':'Original GetMatchTQ and GetTQText over all exported scalar numeric CmdList variant maps plus one sparse synthetic map, at explicit progression inputs. No conditional tables, GetTQList, card/character progression mapping, command execution or gameplay.','sourceHashes':{name:o.assets[name+'.lua']['sha256'] for name in ['BattleUtilServer','BattleConst','Skill']},'fixtures':fixtures}
(ROOT/'tests/synthetic/original-skill-variants.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('Radix',radix,'maps',len(maps),'cases',len(fixtures),'missing selections',sum(x['expected']['value'] is None for x in fixtures))
