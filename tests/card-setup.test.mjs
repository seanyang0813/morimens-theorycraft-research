import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareCardPveOffense,cardCasterKeys,cardPropertyKeys,playerSetupKeys} from '../engine/card-offensive-setup.mjs';
const file=JSON.parse(readFileSync(new URL('./synthetic/original-card-setup.json',import.meta.url)));
const explicit=(keys,obj)=>Object.fromEntries(keys.map(k=>[k,obj[k]??0]));
for(const f of file.fixtures){const input={...f.input,build:file.build,caster:explicit(cardCasterKeys,f.input.caster),player:explicit(playerSetupKeys,f.input.player),card:explicit(cardPropertyKeys,f.input.card)};const out=prepareCardPveOffense(input);assert.deepEqual([out.showDamage,out.diagnosticBaseDamage],f.expected);assert.equal(out.finalDamage,null);assert.throws(()=>prepareCardPveOffense({...input,instructionCard:undefined}));assert.throws(()=>prepareCardPveOffense({...input,card:{}}));assert.throws(()=>prepareCardPveOffense({...input,tags:['Card_Awake']}));}
