// One copied-original effect iteration, before BeHit. No HP or event simulation.
const supportedBuilds=new Set(['pc-res144-build51','pc-res150-build51','pc-res151-build51']);
export function fixedPurePreHit(input) {
  if (!input || !['FIXED', 'PURE'].includes(input.category)) throw new Error('Expected FIXED or PURE');
  const numeric = input.category === 'FIXED'
    ? ['baseDamage', 'dimensionFixPer', 'fixed1', 'fixed2', 'fixed3', 'fixed4', 'fixed5']
    : ['baseDamage'];
  const keys = ['build', 'category', 'targetDead', ...numeric];
  if (keys.some(k => !(k in input)) || Object.keys(input).some(k => !keys.includes(k)))
    throw new Error('Missing or unknown damage input');
  if (!supportedBuilds.has(input.build)) throw new Error('Unsupported combat build');
  if (typeof input.targetDead !== 'boolean') throw new Error('Invalid targetDead');
  for (const k of numeric) if (!Number.isFinite(input[k])) throw new Error('Invalid numeric input: ' + k);
  const result = {status: 'UNVERIFIED', finalDamage: null, preHitDamage: null, trace: [],
    scope: 'One ' + input.category + ' effect iteration before BeHit',
    evidenceFixture: input.build==='pc-res144-build51'?'tests/synthetic/original-' + input.category.toLowerCase() + '-runtime.json':'research/evidence/pc-res151-fixed-pure-runtime.json',
    unresolvedDependencies: ['Independent gameplay validation', 'Resolved input reconstruction', 'BeHit, events, and HP resolution']};
  if (input.targetDead) return result;
  let value = input.baseDamage;
  result.trace.push({stage: 'resolved base', value});
  if (input.category === 'PURE') {
    if (value <= 0) return result;
    value = Math.ceil(value);
    result.trace.push({stage: 'positive base ceiling', value});
  } else {
    let multiplier = 1;
    for (let i = 1; i <= 5; i++) multiplier *= 1 + input['fixed' + i] / 100;
    result.trace.push({stage: 'five Fixed target multiplier product', value: multiplier});
    value = Math.ceil(value * multiplier);
    result.trace.push({stage: 'first ceiling', value});
    if (value > 0) value *= 1 + input.dimensionFixPer / 100;
    result.trace.push({stage: 'dimension modifier on positive rounded value', value});
    value = Math.max(1, Math.ceil(value));
    result.trace.push({stage: 'final ceiling, minimum 1', value});
  }
  if (!Number.isSafeInteger(value)) throw new Error('Result exceeds safe integer range');
  result.preHitDamage = value;
  return result;
}
