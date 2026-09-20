import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ResearchEventDispatcher} from '../engine/event-dispatch.mjs';
const fixtures=JSON.parse(readFileSync(new URL('./synthetic/original-event-dispatch.json',import.meta.url))).fixtures;
for(const {input,expected} of fixtures){
  const dispatcher=new ResearchEventDispatcher(),targets={},callbacks={},trace=[];
  let acted=false;
  const priorities=Object.fromEntries(input.registrations.map(([name,p])=>[name,p]));
  const register=(name,toHead=false)=>dispatcher.register(203,callbacks[name],targets[name],{toHead});
  const remove=name=>dispatcher.unregister(203,callbacks[name],targets[name]);
  for(const name of ['A','B','C']){
    targets[name]={eventPriority:priorities[name]??0};
    callbacks[name]=()=>{
      trace.push(name);
      if(name==='A'&&!acted){
        acted=true;
        if(['removeB','replaceB'].includes(input.action))remove('B');
        if(input.action==='replaceB')register('B');
        if(input.action==='addC')register('C');
      }
    };
  }
  for(const [name,,head] of input.registrations)register(name,head);
  dispatcher.send(203);const first=[...trace];trace.length=0;
  dispatcher.send(203);assert.deepEqual([first,trace],expected,input.name);
  assert.deepEqual(dispatcher.errors,[]);
}
