"""Verify incoming source castValue through original gain/storage."""
import itertools,json
from ulti_energy_gain_oracle import GainOracle,ROOT
if __name__=='__main__':
 o=GainOracle();fixtures=[]
 for energy,request,cast in itertools.product([0,99.5,100],[-1,0,0.1,10],[None,0,0.1,10]):
  v={'energy':energy,'request':request,'castValue':cast,'ignoreMax':False,'maximumProperties':{'ulti_energy_max':100,'ulti_energy_cost_per':0,'ulti_energy_cost_flat':0,'ulti_energy_max_per':0}}
  fixtures.append({'input':v,'expected':o.run(v)})
 out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{n:o.assets[n+'.lua']['sha256'] for n in ['BattleUnitAwaker','BattlePropertyServer']},'scope':'48 connected gain/storage cases with incoming castValue absent, zero, fractional or positive. Other adapters as gain oracle; no event listeners or gameplay.','fixtures':fixtures}
 (ROOT/'tests/synthetic/original-ulti-energy-source.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8');print('Generated',len(fixtures),'source-preservation cases')
