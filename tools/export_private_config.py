"""Export one copied config chunk to ignored observations for local analysis."""
from pathlib import Path
import argparse
import ctypes as C
import json

from runtime_oracle import Oracle, ROOT


def export(module_path):
    oracle=Oracle();L=oracle.state
    def api(name,result,*args):
        fn=getattr(oracle.lib,name);fn.restype=result;fn.argtypes=list(args);return fn
    pointer,integer=C.c_void_p,C.c_int
    kind=api('lua_type',integer,pointer,integer);absolute=api('lua_absindex',integer,pointer,integer)
    pushnil=api('lua_pushnil',None,pointer);nextitem=api('lua_next',integer,pointer,integer)
    boolean=api('lua_toboolean',integer,pointer,integer);is_integer=api('lua_isinteger',integer,pointer,integer)
    to_integer=api('lua_tointegerx',C.c_int64,pointer,integer,pointer)
    def read(index,depth=0):
        if depth>30:raise ValueError('Excessive nesting')
        tag=kind(L,index)
        if tag==0:return None
        if tag==1:return bool(boolean(L,index))
        if tag==3:return to_integer(L,index,None) if is_integer(L,index) else oracle.tonumber(L,index,None)
        if tag==4:return oracle.string(L,index,None).decode('utf-8')
        if tag!=5:raise ValueError(f'Non-data Lua tag {tag}')
        index=absolute(L,index);out={};pushnil(L)
        while nextitem(L,index):
            key=read(-2,depth+1);out[str(key)]=read(-1,depth+1);oracle.top(L,-2)
        return out
    oracle.top(L,0);oracle.module(module_path.stem,{"output":str(module_path.relative_to(ROOT)).replace('\\','/')})
    return read(-1)


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--module',required=True,type=Path);parser.add_argument('--output',required=True,type=Path);args=parser.parse_args()
    module=args.module.resolve();output=args.output.resolve()
    try:module.relative_to(ROOT/'research/observations');output.relative_to(ROOT/'research/observations')
    except ValueError as error:raise ValueError('Inputs and outputs must stay inside ignored observations') from error
    if output.exists():raise FileExistsError('Refusing to overwrite private config export')
    data=export(module);output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print(json.dumps({'rows':len(data),'output':str(output.relative_to(ROOT))},indent=2))


if __name__=='__main__':main()
