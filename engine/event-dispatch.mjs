// Listener ordering/registration subset; does not schedule battle effects.
export class ResearchEventDispatcher {
  constructor(){this.events=new Map();this.errors=[];}
  register(eventId,callback,target,{toHead=false}={}){
    const priority=target?target.eventPriority:-1;
    if(!Number.isFinite(priority)||typeof callback!=='function')throw new Error('Explicit listener priority and callback required');
    const record={callback,target,priority,isDeleted:false};
    const list=this.events.get(eventId)??[];
    let index=toHead?0:list.length;
    if(toHead){while(index<list.length&&list[index].priority<priority)index++;}
    else {while(index>0&&list[index-1].priority>priority)index--;}
    list.splice(index,0,record);this.events.set(eventId,list);
  }
  unregister(eventId,callback,target){
    const list=this.events.get(eventId)??[];
    for(let i=list.length-1;i>=0;i--)if(list[i].callback===callback&&list[i].target===target){list[i].isDeleted=true;list.splice(i,1);}
  }
  send(eventId,...args){
    const list=this.events.get(eventId);
    if(!list)return;
    for(const record of [...list])if(!record.isDeleted){
      try {record.callback(record.target,...args);} catch(error){this.errors.push({eventId,error});}
    }
  }
}
