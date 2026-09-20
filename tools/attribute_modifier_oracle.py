"""Original AttrUtils display helpers; not proof of server-side battle stat assembly."""
import ctypes as C
import json
from runtime_oracle import Oracle, ROOT
o=Oracle();o.module('AttrUtils');o.setglobal(o.state,b'_attribute_utils')
nil=o.lib.lua_pushnil;nil.argtypes=[C.c_void_p];nil.restype=None
fixtures=[]
for base in [0,1,25,50,55,138,198,258,1.25]:
    for increase in [None,0,0.1,0.3,-0.1]:
        for method,factor in [('GetAwakerFinalAttr',None),('GetAwakerPhysique',1),('GetAwakerPhysique',1.5)]:
            L=o.state;o.top(L,0);o.getglobal(L,b'_attribute_utils');o.getfield(L,-1,method.encode());o.number(L,base)
            if increase is None:nil(L)
            else:o.number(L,increase)
            argc=2
            if factor is not None:o.number(L,factor);argc+=1
            o.check(o.call(L,argc,1,0,0,None))
            fixtures.append({'method':method,'base':base,'increase':increase,'breakRate':factor,'expected':o.tonumber(L,-1,None)})
out={'kind':'SYNTHETIC_ORIGINAL_RUNTIME','build':'pc-res144-build51','sourceHashes':{'AttrUtils':o.assets['AttrUtils.lua']['sha256']},
    'scope':'Original GetAwakerFinalAttr and GetAwakerPhysique with explicit inputs. Increase is a fraction, not percentage points. Missing increase bypasses both rounding and physique break multiplier. Does not establish origin of modifiers or server/battle stat assembly.','fixtures':fixtures}
(ROOT/'tests/synthetic/original-attribute-modifiers.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Generated',len(fixtures),'original attribute modifier cases')
