"""Copy one installed TextAsset into ignored observations for runtime analysis."""
from pathlib import Path
import argparse

import UnityPy

from runtime_oracle import ROOT


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--install-root',required=True,type=Path);parser.add_argument('--module',required=True);parser.add_argument('--output',required=True,type=Path);args=parser.parse_args()
    output=args.output.resolve()
    try:output.relative_to(ROOT/'research/observations')
    except ValueError as error:raise ValueError('Output must stay inside ignored observations') from error
    if output.exists():raise FileExistsError('Refusing to overwrite private module')
    key=ROOT/'research/raw/bundle-key.bin';UnityPy.set_assetbundle_decrypt_key(key.read_bytes());matches=[]
    for bundle_name in ('share.ab','gamescript.ab','foundation.ab','config.ab'):
        path=args.install_root.resolve()/'_game_data_'/'DownLoad'/bundle_name
        for obj in UnityPy.load(str(path)).objects:
            if obj.type.name!='TextAsset':continue
            value=obj.read()
            if value.m_Name!=args.module:continue
            payload=value.m_Script.encode('utf-8','surrogateescape') if isinstance(value.m_Script,str) else bytes(value.m_Script);matches.append((bundle_name,payload))
    if len(matches)!=1:raise ValueError(f'Expected one installed TextAsset named {args.module}, found {len(matches)}')
    output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(matches[0][1]);print(f'Exported {args.module} from {matches[0][0]} to {output.relative_to(ROOT)}')


if __name__=='__main__':main()
