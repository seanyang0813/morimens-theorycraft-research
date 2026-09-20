// PC 144 Passive effect arithmetic, before BeHit. No state or HP simulation.
export function passivePreHit(input) {
  const numeric = ['baseDamage', 'passive1', 'passive2', 'passive3', 'dimensionFixPer'];
  const keys = ['build', 'targetDead', ...numeric];
  if (!input || keys.some(k => !(k in input)) || Object.keys(input).some(k => !keys.includes(k)))
    throw new Error('Missing or unknown Passive input');
  if (input.build !== 'pc-res144-build51') throw new Error('Unsupported combat build');
  for (const k of numeric) if (!Number.isFinite(input[k])) throw new Error('Invalid numeric input: ' + k);
  if (typeof input.targetDead !== 'boolean') throw new Error('Invalid targetDead');
  const result = {status: 'UNVERIFIED', finalDamage: null, preHitDamage: null,
    scope: 'One Passive effect before BeHit; explicit resolved properties',
    evidence: ['PC144:PassivePreHit'],trace:[],
    unresolvedDependencies: ['Independent gameplay validation', 'Target property reconstruction', 'BeHit and HP resolution']};
  if (input.targetDead) return result;
  let multiplier = 1;
  for (const k of ['passive1', 'passive2', 'passive3']) multiplier *= 1 + input[k] / 100;
  result.trace.push({stage:'resolved Passive base',value:input.baseDamage},{stage:'Passive target multiplier product',value:multiplier});
  let value = Math.ceil(input.baseDamage * multiplier);
  result.trace.push({stage:'first ceiling',value});
  if (value > 0) value *= 1 + input.dimensionFixPer / 100;
  result.trace.push({stage:'dimension modifier on positive rounded value',value});
  result.preHitDamage = Math.max(1, Math.ceil(value));
  result.trace.push({stage:'final ceiling, minimum 1',value:result.preHitDamage});
  if (!Number.isSafeInteger(result.preHitDamage)) throw new Error('Result exceeds safe integer range');
  return result;
}
