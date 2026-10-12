// Bounded mechanics/feasibility check for D-Tide Season 71.
// This deliberately does not simulate combat damage or predict a clear.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const skills = JSON.parse(readFileSync(new URL('../research/extracted/config/Skill.json', import.meta.url)));
const awakeners = JSON.parse(readFileSync(new URL('../research/extracted/config/AwakerConfig.json', import.meta.url)));
const relics = JSON.parse(readFileSync(new URL('../research/extracted/config/RelicConfig.json', import.meta.url)));
assert.equal(relics['70771'].StatePara['1'], 60);
assert.equal(relics['78668'].StatePara['1'], 1);
assert.equal(relics['78668'].StatePara['2'], 1);
for (const id of ['94450', '15569', '15570', '15585', '15595']) assert.equal(awakeners[id].School, 1);
assert.equal(skills['122484'].OriginalCoefficient['1'], 0.3);
assert.equal(skills['4138'].OriginalCoefficient['0']['1'], 0.15);
assert.equal(skills['122484'].Type['2'], 'Card_Strike');
assert.equal(skills['122484'].Cost, '3-PlayerRole.GetStateLayer(124035)');
const lancet = {extraHitsPerStrike: 2, coefficientPerHit: 0.60, triggerCapPerTurn: 3};
const strikeCases = [0, 1, 2, 3, 4].map((strikes) => ({
  strikes,
  extraHits: lancet.extraHitsPerStrike * Math.min(strikes, lancet.triggerCapPerTurn),
  extraRawAtkCoefficient: +(lancet.extraHitsPerStrike * lancet.coefficientPerHit * Math.min(strikes, lancet.triggerCapPerTurn)).toFixed(2),
}));
// Jade Imprint exhausts one eligible card in hand, then puts one base copy
// into each of the draw pile, hand, and discard pile.
const jade = {before: {hand: 1, draw: 0, discard: 0}, after: {hand: 1, draw: 1, discard: 1}, netCopies: 2};
// Conditional card-line calculation using level-one OriginalCoefficient rows.
// These are BattleAtkForce coefficients, NOT finished hit damage. An immediate
// second play needs Ramona's available Posse to fetch the discard copy for 0.
const cardLines = [
  {name: 'one-SSR Storm Strike', team: ['Mouchette', 'Ramona', 'Doll', 'Ogier'],
    skillId: 122484, firstTwoHitCounts: [5, 5], baseCoefficientPerHit: 0.3},
  {name: 'all-SR Queen\'s Sword', team: ['Lotan', 'Ramona', 'Doll', 'Ogier'],
    skillId: 4138, firstTwoHitCounts: [2, 3], baseCoefficientPerHit: 0.15},
].map((line) => ({...line,
  conditionalTwoPlayHits: line.firstTwoHitCounts.reduce((a, b) => a + b, 0),
  conditionalTwoPlayBaseBAFCoefficient: +(line.firstTwoHitCounts.reduce((a, b) => a + b, 0) * line.baseCoefficientPerHit).toFixed(2),
  requirements: ['eligible card in hand at Rouse', 'Ramona Posse available',
    'one ordinary play affordable', 'all hits on target'],
}));
// Kaiden's displayed 25.1M boss HP is abbreviated; both interpretations are
// shown until a live boss property snapshot resolves the display semantics.
const displayedBossHpMillions = 25.1;
const damageRequirement = [8, 10, 12].map((turns) => ({
  turns,
  ifDisplayIsWholeEncounterMillionsPerTurn: +(displayedBossHpMillions / turns).toFixed(4),
  ifDisplayIsFirstBarMillionsPerTurn: +(displayedBossHpMillions * 3 / turns).toFixed(4),
}));
console.log(JSON.stringify({status: 'CONSTRAINTS_ONLY', strikeCases, jade, cardLines, damageRequirement,
  unresolved: ['current exact boss HP', 'whether displayed HP is first bar or whole encounter',
    'build properties', 'card draw and energy', 'enemy mitigation', 'survival and other relics']}, null, 2));
