import {compileNumericCommand} from './command-expressions.mjs';
import {importCommandRows} from './import-command-rows.mjs';

const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const stateTypes=new Set(['BEAddState','BESubStateLayer','BERemoveState']);

// Converts version-pinned State rows into the narrow definition schema used by
// the setup runner. Callers retain only facts that are genuinely live at cast
// time; catalog expressions and maxima cannot be replaced through the request.
export function assembleCatalogStateDefinitions({command,variables,stateCatalog,runtime}){
  if(!variables||Array.isArray(variables)||Object.values(variables).some(value=>!Number.isFinite(value)))throw new Error('Finite setup variables required for state assembly');
  if(!stateCatalog||Array.isArray(stateCatalog)||!Array.isArray(runtime))throw new Error('State catalog and runtime state facts required');
  const required=[];
  for(const row of importCommandRows(command).rows){
    if(!stateTypes.has(row.Type))continue;
    const result=compileNumericCommand(String(row.Para))(name=>Object.hasOwn(variables,name)?variables[name]:undefined);
    const stateId=result.values[0];
    if(!Number.isSafeInteger(stateId))throw new Error('Setup state ID must resolve to an integer');
    if(!required.includes(stateId))required.push(stateId);
  }
  const facts=new Map();
  for(const item of runtime){
    if(!exact(item,['id','skillLevel','casterRoleId','specialValue','banned'])||!Number.isSafeInteger(item.id)||facts.has(item.id)||!Number.isSafeInteger(item.skillLevel)||item.skillLevel<1||!Number.isSafeInteger(item.casterRoleId)||!Number.isFinite(item.specialValue)||typeof item.banned!=='boolean')throw new Error('Unique explicit runtime facts required for each setup state');
    facts.set(item.id,item);
  }
  if(required.length!==facts.size||required.some(id=>!facts.has(id)))throw new Error('Runtime state facts must exactly match command state IDs');
  return required.map(id=>{
    const row=stateCatalog[String(id)],fact=facts.get(id);
    if(!row||typeof row!=='object'||Array.isArray(row)||!Object.hasOwn(row,'MaxLayer')||!Number.isFinite(Number(row.MaxLayer))||Number(row.MaxLayer)<0)throw new Error(`Catalog State ${id} lacks a supported MaxLayer`);
    const properties=row.ExistProperty??{};
    if(!properties||typeof properties!=='object'||Array.isArray(properties)||Object.entries(properties).some(([property,expression])=>!property||!['string','number'].includes(typeof expression)))throw new Error(`Catalog State ${id} has unsupported ExistProperty data`);
    return {...fact,maximum:String(row.MaxLayer),properties:Object.entries(properties).map(([property,expression])=>({property,expression:String(expression)}))};
  });
}
