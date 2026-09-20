"""Decode an explicitly supplied Morimens replay file without network access."""
from pathlib import Path
import argparse
import hashlib
import json
from replay_codec import ReplayCodec,container_compstr

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--input',required=True,type=Path)
    parser.add_argument('--encoding',required=True,choices=['latin1','utf8','base64'])
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    source=args.input.resolve();output=args.output.resolve()
    if not source.is_file():raise ValueError('Input replay file does not exist')
    try:output.relative_to(ROOT/'research'/'observations')
    except ValueError as error:raise ValueError('Decoded output must stay inside research/observations') from error
    if output.exists():raise FileExistsError('Refusing to overwrite decoded replay output')
    compressed=container_compstr(source,args.encoding);decoded=ReplayCodec().decode(compressed)
    artifact={'schemaVersion':1,'kind':'MORIMENS_DECODED_REPLAY','inputSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'compStrEncoding':args.encoding,'decoded':decoded}
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(artifact,indent=2,ensure_ascii=False)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'output':str(output.relative_to(ROOT)),'inputSha256':artifact['inputSha256'],'records':len(decoded.get('unZippedRecord',[]))},indent=2))

if __name__=='__main__':main()
