// Recovered PC 144 command/effect arithmetic only. Not a battle simulator.
// Caller must resolve event eligibility and target state at command execution.
// Snapshot plan assumes initially clear branch markers and no intervening state
// changes. Use old-embers-steps.mjs for live per-effect condition evaluation.
export function oldEmbersCommand(input) {
  const numeric = ['castDamage', 'remainingStacks', 'immueChangeHp', 'beChangeHpLimit'];
  const flags = ['triggerEligible', 'hasState66314', 'hasState62317', 'targetHpIsZero'];
  const keys = ['build', 'damageType', ...numeric, ...flags];
  if (!input || keys.some(k => !(k in input)) || Object.keys(input).some(k => !keys.includes(k)))
    throw new Error('Missing or unknown Old Embers input');
  if (input.build !== 'pc-res144-build51') throw new Error('Unsupported combat build');
  for (const k of numeric) if (!Number.isFinite(input[k]) || input[k] < 0)
    throw new Error('Invalid nonnegative input: ' + k);
  if (!Number.isSafeInteger(input.remainingStacks)) throw new Error('Stacks must be safe integers');
  for (const k of flags) if (typeof input[k] !== 'boolean') throw new Error('Invalid boolean: ' + k);
  if (!['ACTIVE', 'PASSIVE', 'TENTACLE', 'HP_REMOVE', 'PURE', 'FIXED'].includes(input.damageType))
    throw new Error('Unknown internal damage category');
  const factor = {ACTIVE: 1, TENTACLE: 1, PASSIVE: 0.5, FIXED: 0.5}[input.damageType];
  const result = {
    status: 'UNVERIFIED', scope: 'Old Embers command plan before property callbacks and death handling',
    finalDamage: null, triggerAmount: null, hpChangeRequest: null, stacksConsumed: 0,
    remainingStacks: input.remainingStacks, evidence: ['PC144:OldEmbers'],
    unresolvedDependencies: ['Independent gameplay validation', 'Property callbacks and death handling', 'Statistics ownership attribution'],
  };
  if (!input.triggerEligible || input.hasState66314 || input.hasState62317 || factor === undefined || input.remainingStacks === 0)
    return result;
  const amount = input.castDamage * factor;
  const selected = Math.min(amount, input.remainingStacks);
  result.triggerAmount = amount;
  result.stacksConsumed = Math.min(Math.ceil(Math.abs(selected)), input.remainingStacks);
  result.remainingStacks -= result.stacksConsumed;
  // BEChangeAttr skips HP-zero targets. Later stack commands remain separate.
  if (!input.targetHpIsZero) {
    let value = Math.ceil(-3 * selected);
    if (value < 0 && input.immueChangeHp > 0) value = 0;
    else if (value < 0 && input.beChangeHpLimit > 0) value = -Math.min(-value, input.beChangeHpLimit);
    result.hpChangeRequest = value === 0 ? 0 : value;
  }
  return result;
}
