"""Connected original card/tag energy arithmetic using real tag-property mapping."""
import itertools,json
from ulti_energy_oracle import UltiOracle,ROOT
if __name__=='__main__':
    o=UltiOracle();fixtures=[]
    for card,eligible,tags,base,bonus in itertools.product([None,{'matchesEnergyCardTypes':False},{'matchesEnergyCardTypes':True}],[False,True],[[],['Card_Strike'],['Card_Strike','Card_Skill'],['Card_Strike','Card_Strike'],['Card_Defend'],['Ulti_Skill']],[0,10.2],[0,25]):
        v={'base':base,'dimension':20,'card':card,'casterEligible':eligible,'skillTags':tags,'properties':{'ulti_energy_per':50,'i_ulti_energy_per':25,'ulti_energy_efficiency':30,'ulti_energy_plus':2,'gain_ulti_energy_per':50,'gain_ulti_energy_plus':1,'card_ulti_per':bonus,'card_ulti_plus':3,'o_ulti_energy_per':40,'ulti_per_strikecard':25,'ulti_per_skillcard':50,'ulti_per_defendcard':15,'ulti_per_ultiskill':35}}
        fixtures.append({'input':v,'expected':o.run(v)})
    out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleCmdServer','BattleUtilServer','BattleConst']},'scope':'144 connected ordinary-subtype GetRealUltiEnergy cases with card presence/type-match and caster eligibility adapters, explicit properties/dimension and supplied tags using original mapping. Includes duplicate tags. No actual CardTypeMatch, property/build derivation, gain storage/events or gameplay.','fixtures':fixtures}
    (ROOT/'tests/synthetic/original-card-ulti-energy.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'card/tag ultimate-energy cases')
