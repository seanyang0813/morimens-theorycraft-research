// Synchronous, always-eligible subset of the original effect scheduler.
// No yield, random retargeting, delay, command conditions or overflow recovery.
export class ResearchEffectOrder {
  constructor(){
    this.root={body:()=>{},repetitions:1,children:[]};
    this.running=null;this.finished=false;this.started=false;
  }
  enqueue(body,{attached=false,repetitions=1,immediateChildren=false}={}){
    if(typeof body!=='function'||!Number.isInteger(repetitions)||repetitions<1)throw new Error('Explicit effect function and positive integer repetitions required');
    if(typeof immediateChildren!=='boolean')throw new Error('Immediate child mode must be explicit boolean');
    const parent=attached?this.root:(this.running??this.root);
    const effect={body,repetitions,children:[],immediateChildren};
    // BERoleDeadlyDamage.AddRunningSubEffect executes children on insertion.
    // Its SubEffectEnd is empty, so returning resumes the parent's active body.
    if(parent.immediateChildren&&this.running===parent){this.visit(effect);this.running=parent;}
    else parent.children.push(effect);
    return effect;
  }
  finishBattle(){this.finished=true;}
  run(){
    if(this.started)throw new Error('Effect order is single-use');
    this.started=true;
    this.visit(this.root);this.running=null;
  }
  visit(effect){
      this.running=effect;
      for(let i=0;i<effect.repetitions&&!this.finished;i++){
        effect.body(i);
        while(effect.children.length&&!this.finished){
          this.visit(effect.children.shift());this.running=effect;
        }
      }
  }
}
