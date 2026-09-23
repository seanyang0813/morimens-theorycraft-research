"""Publish source hashes and bounds for installed Tentacle team aggregation."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    source=ROOT/'research/observations/current-res151-build51/modules/SchoolCompPVE.lua'
    fixture_path=ROOT/'tests/synthetic/installed-tentacle-multi-awaker.json'
    parity_path=ROOT/'research/evidence/pc-res151-tentacle-state-accumulation-parity.json'
    fixture=json.loads(fixture_path.read_text(encoding='utf-8'))
    parity=json.loads(parity_path.read_text(encoding='utf-8'))
    if (fixture.get('sourceHash')!=sha(source) or len(fixture.get('fixtures',[]))!=346 or
            parity.get('status')!='SELECTED_METHOD_BODY_IDENTICAL'):
        raise ValueError('Tentacle team-aggregation source checks incomplete')
    counts={str(n):sum(len(row['input']['awakers'])==n for row in fixture['fixtures'])
            for n in range(1,5)}
    report={'schemaVersion':1,'kind':'MORIMENS_PC_INSTALLED_TENTACLE_TEAM_AGGREGATION',
            'build':'pc-res151-build51','status':'EXACT_IN_SYNTHETIC_FIXTURE_DOMAIN',
            'sourceHashes':{'SchoolCompPVE.lua':sha(source),'stateAccumulationParityReport':sha(parity_path),
                            'originalRuntimeFixture':sha(fixture_path)},
            'originalRuntimeCases':len(fixture['fixtures']),'casesByAwakerCount':counts,
            'method':'Execute installed SchoolCompPVE.CalcTentacleDmg in copied XLua with one to four synthetic Awakeners. Its state callback models the installed BattleUnitBase.GetTotalDamagePer2HasState method: sum values by property name into the shared table. Compare an independent JavaScript aggregation plus pre-hit calculation to every original output.',
            'rule':'Average enemy-type, buff, debuff, block and block-barrier bonuses over Awakeners. Sum eligible state-bonus values with the same property name across Awakeners, then multiply (1 + sum/100) across distinct state properties.',
            'limitations':['Synthetic adapters supply already eligible per-Awakener bonuses and target-state property names; they do not infer them from a team or target.',
                           'No critical RNG, card effect, BeHit, HP, replay build attribution or independent gameplay validation is established.']}
    output=ROOT/'research/evidence/pc-res151-tentacle-team-aggregation.json'
    output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('Wrote installed Tentacle team aggregation evidence:',len(fixture['fixtures']))


if __name__=='__main__':
    main()
