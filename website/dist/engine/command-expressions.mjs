// Deliberately numeric Lua-expression subset; never executes JavaScript/source code.
function compileCommand(expression,{allowedFunctions=[]}={},condition=false){
  if(!Array.isArray(allowedFunctions)||!allowedFunctions.every(name=>typeof name==='string'&&/^[A-Za-z_][A-Za-z_0-9]*(?:\.[A-Za-z_][A-Za-z_0-9]*)*$/.test(name)))throw new Error('Explicit function-name allowlist required');
  const allowed=new Set(allowedFunctions);
  if(typeof expression==='number'){
    if(!Number.isFinite(expression))throw new Error('Finite numeric command required');
    return ()=>({values:[expression],reads:[],calls:[]});
  }
  if(typeof expression!=='string'||!expression.trim()||expression.length>8192)throw new Error('Nonempty supported command expression required');
  if(expression.includes('--'))throw new Error('Lua comments are outside the supported expression subset');
  const tokens=[];let offset=0;
  while(offset<expression.length){
    const rest=expression.slice(offset),space=/^\s+/.exec(rest);
    if(space){offset+=space[0].length;continue;}
    const match=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest)||/^[A-Za-z_][A-Za-z_0-9]*(?:\.[A-Za-z_][A-Za-z_0-9]*)*/.exec(rest)||(condition?/^(?:==|~=|<=|>=|[<>])/.exec(rest):null)||/^[+*/(),-]/.exec(rest);
    if(!match)throw new Error(`Unsupported command syntax at ${offset}`);
    tokens.push(match[0]);offset+=match[0].length;
  }
  let cursor=0;
  const peek=()=>tokens[cursor];
  function atom(depth){
    if(depth>100)throw new Error('Command nesting exceeds supported depth');
    const token=tokens[cursor++];
    if(token==='-')return {op:'negate',value:atom(depth+1)};
    if(condition&&token==='not')return {op:'not',value:atom(depth+1)};
    if(condition&&['true','false'].includes(token))return {value:token==='true'};
    if(token==='('){const value=expressionRoot(depth+1);if(tokens[cursor++]!==')')throw new Error('Expected closing parenthesis');return value;}
    if(token!==undefined&&/^(?:\d|\.\d)/.test(token)){const value=Number(token);if(!Number.isFinite(value))throw new Error('Nonfinite literal');return {value};}
    if(token&&/^[A-Za-z_]/.test(token)&&!['true','false','nil','and','or','not'].includes(token)){
      if(peek()!=='(')return {name:token};
      if(!allowed.has(token))throw new Error(`Unsupported command function ${token}`);
      cursor++;const args=[];
      if(peek()!==')'){args.push(sum(depth+1));while(peek()===','){cursor++;args.push(sum(depth+1));}}
      if(tokens[cursor++]!==')')throw new Error('Expected function closing parenthesis');
      return {call:token,args};
    }
    throw new Error('Expected numeric value or variable');
  }
  function product(depth){let left=atom(depth);while(['*','/'].includes(peek())){const op=tokens[cursor++];left={op,left,right:atom(depth)};}return left;}
  function sum(depth){let left=product(depth);while(['+','-'].includes(peek())){const op=tokens[cursor++];left={op,left,right:product(depth)};}return left;}
  function comparison(depth){let left=sum(depth);while(['==','~=','<','>','<=','>='].includes(peek())){const op=tokens[cursor++];left={op,left,right:sum(depth)};}return left;}
  function conjunction(depth){let left=comparison(depth);while(peek()==='and'){cursor++;left={op:'and',left,right:comparison(depth)};}return left;}
  function expressionRoot(depth){if(!condition)return sum(depth);let left=conjunction(depth);while(peek()==='or'){cursor++;left={op:'or',left,right:conjunction(depth)};}return left;}
  const roots=[expressionRoot(0)];while(!condition&&peek()===','){cursor++;roots.push(sum(0));}
  if(cursor!==tokens.length)throw new Error('Unsupported command syntax or trailing tokens');
  return (readVariable,callFunction)=>{
    const reads=[],calls=[];
    function evaluate(node){
      let result;
      if(Object.hasOwn(node,'value')&&!node.op)result=node.value;
      else if(node.call){
        if(typeof callFunction!=='function')throw new Error('Explicit numeric function binding required');
        const args=node.args.map(evaluate);if(!args.every(Number.isFinite))throw new Error('Numeric function arguments required');result=callFunction(node.call,[...args]);calls.push({name:node.call,args,value:result});
      }
      else if(node.name){if(typeof readVariable!=='function')throw new Error('Live variable resolver required');result=readVariable(node.name);reads.push({name:node.name,value:result});}
      else if(node.op==='not')result=evaluate(node.value)===false;
      else if(node.op==='negate'){const value=evaluate(node.value);if(!Number.isFinite(value))throw new Error('Numeric unary operand required');result=-value;}
      else {
        const a=evaluate(node.left);
        if(node.op==='and')result=a===false?a:evaluate(node.right);
        else if(node.op==='or')result=a!==false?a:evaluate(node.right);
        else {
          const b=evaluate(node.right);
          if(node.op==='==')result=a===b;
          else if(node.op==='~=')result=a!==b;
          else {
            if(!Number.isFinite(a)||!Number.isFinite(b))throw new Error('Numeric arithmetic or ordered-comparison operands required');
            result=node.op==='+'?a+b:node.op==='-'?a-b:node.op==='*'?a*b:node.op==='/'?a/b:node.op==='<'?a<b:node.op==='>'?a>b:node.op==='<='?a<=b:a>=b;
          }
        }
      }
      if(!Number.isFinite(result)&&!(condition&&typeof result==='boolean'))throw new Error(`Unknown or nonfinite command value${node.name?' '+node.name:''}`);
      return result;
    }
    return {values:roots.map(evaluate),reads,calls};
  };
}
export function compileNumericCommand(expression,options){return compileCommand(expression,options,false);}
export function compileCommandCondition(expression,options){
  const evaluate=compileCommand(expression,options,true);
  return (readVariable,callFunction)=>{const result=evaluate(readVariable,callFunction);return {...result,passed:result.values[0]===true};};
}
