// Replays fixed enemy pressure. It does not generate enemy actions for a new team.
const integer = (value, name, min = 0) => {
  if (!Number.isSafeInteger(value) || value < min) throw new Error(`${name} must be an integer >= ${min}`);
};
function validate(pressure, input) {
  if (!pressure || !Array.isArray(pressure.enemyHitsToPlayer) || !Array.isArray(pressure.playerMaxHpChanges)) throw new Error('Explicit enemy pressure required');
  if (!input || Object.keys(input).some(key => !['candidateMaxHp','candidateStartingHp','healingPerTurn','blockPerTurn','horizon'].includes(key))) throw new Error('Exact candidate survival inputs required');
  for (const key of ['candidateMaxHp','candidateStartingHp','horizon']) integer(input[key], key, 1);
  for (const key of ['healingPerTurn','blockPerTurn']) integer(input[key], key);
  const coveredTurns = pressure.recordedRounds ?? Math.max(0, ...pressure.enemyHitsToPlayer.map(row => row.turn));
  if (input.candidateStartingHp > input.candidateMaxHp || input.horizon > coveredTurns || input.horizon > 100) throw new Error('Invalid starting HP or horizon beyond the recorded pressure');
  let previousTurn = 0, previousRecord = -1;
  const keys = new Set();
  for (const row of pressure.enemyHitsToPlayer) {
    integer(row.turn, 'hit turn', 1); integer(row.record, 'hit record'); integer(row.incomingBeforeBlock, 'incoming damage');
    const key = `${row.turn}:${row.record}`;
    if (row.turn < previousTurn || row.record <= previousRecord || keys.has(key)) throw new Error('Enemy hits must have unique, ordered records and nondecreasing turns');
    keys.add(key); previousTurn = row.turn; previousRecord = row.record;
  }
  const changes = new Set();
  for (const row of pressure.playerMaxHpChanges) {
    const key = `${row.turn}:${row.record}`;
    if (!keys.has(key) || changes.has(key)) throw new Error('Every max-HP change must bind one unique enemy hit');
    changes.add(key);
  }
}

export function simulateEnemyPressure(pressure, input) {
  validate(pressure, input);
  const changes = new Set(pressure.playerMaxHpChanges.map(row => `${row.turn}:${row.record}`));
  let hp = input.candidateStartingHp, maxHp = input.candidateMaxHp, minimumHp = hp, incomingTotal = 0, healedTotal = 0, absorbedTotal = 0;
  const trace = []; let death = null;
  for (let turn = 1; turn <= input.horizon; turn++) {
    const healed = Math.min(input.healingPerTurn, maxHp - hp); hp += healed; healedTotal += healed;
    let block = input.blockPerTurn;
    for (const row of pressure.enemyHitsToPlayer.filter(row => row.turn === turn)) {
      const hpBefore = hp, maxHpBefore = maxHp, blockBefore = block, absorbed = Math.min(block, row.incomingBeforeBlock);
      block -= absorbed; hp -= row.incomingBeforeBlock - absorbed;
      incomingTotal += row.incomingBeforeBlock; absorbedTotal += absorbed;
      if (hp <= 0) death = {turn, record:row.record};
      const maxHpCutApplied = !death && changes.has(`${turn}:${row.record}`);
      // The source's Equivalent Exchange recurrence is ceil(80% of max HP).
      if (maxHpCutApplied) {maxHp = Math.ceil(maxHp * 0.8); hp = Math.min(hp, maxHp);}
      minimumHp = Math.min(minimumHp, hp);
      trace.push({turn,record:row.record,incoming:row.incomingBeforeBlock,hpBefore,maxHpBefore,blockBefore,absorbed,hpAfter:hp,maxHpAfter:maxHp,blockAfter:block,maxHpCutApplied});
      if (death) break;
    }
    if (death) break;
  }
  return {status:'REPLAY_CONDITIONED_STRESS_TEST', passedFixedPressure:death === null, death, inputs:{...input}, minimumHp, hpAfter:hp, maxHpAfter:maxHp, incomingTotal, healedTotal, absorbedTotal, trace,
    gameplayClear:null, finalDamage:null, limitations:[
      'Fixed recorded incoming damage; changed kills, targets, mitigation and team mechanics may change this trace.',
      'Healing at every turn start and fresh expiring Block per turn are explicit hypothetical supplies, not calculated card output.',
      'Twenty-percent maximum-HP cuts follow the source encounter only and apply after surviving the corresponding hit.',
      'No card legality, draw, Keyflare, Compute, Aliemus, Posse, damage rotation or clear simulation.'
    ]};
}

export function minimumBlockForPressure(pressure, input) {
  // Derive a sufficient bound from total incoming per turn; no arbitrary search ceiling.
  validate(pressure, {...input, blockPerTurn:0});
  const byTurn = new Map();
  for (const row of pressure.enemyHitsToPlayer.filter(row => row.turn <= input.horizon)) byTurn.set(row.turn, (byTurn.get(row.turn) ?? 0) + row.incomingBeforeBlock);
  let lo = 0, hi = Math.max(0,...byTurn.values());
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (simulateEnemyPressure(pressure, {...input, blockPerTurn:mid}).passedFixedPressure) hi = mid; else lo = mid + 1;
  }
  const result = simulateEnemyPressure(pressure, {...input, blockPerTurn:lo});
  const below = lo === 0 ? null : simulateEnemyPressure(pressure, {...input, blockPerTurn:lo-1});
  return {status:'REPLAY_CONDITIONED_THRESHOLD', minimumBlockPerTurn:lo, thresholdPass:result, oneBelowPass:below?.passedFixedPressure ?? null, gameplayClear:null};
}
