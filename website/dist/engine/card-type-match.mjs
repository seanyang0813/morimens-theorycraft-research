export const ultimateEnergyCardTypes=Object.freeze([
  'Card_Skill',
  'Card_Defend',
  'Card_Extend',
  'Card_Strike',
]);

function validateTypes(value,label){
  if(!Array.isArray(value)||value.some(type=>typeof type!=='string'))throw new Error(`${label} must be a string array`);
}

// BattleCardServer:CardTypeMatch returns true when any requested type occurs in
// the card's complete type list. Duplicate values do not change the result.
export function cardTypeMatch(cardTypes,query){
  validateTypes(cardTypes,'Card types');
  const requested=Array.isArray(query)?query:[query];
  validateTypes(requested,'Requested card types');
  return requested.some(type=>cardTypes.includes(type));
}

export function matchesUltimateEnergyCardTypes(cardTypes){
  return cardTypeMatch(cardTypes,ultimateEnergyCardTypes);
}
