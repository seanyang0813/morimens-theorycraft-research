// Community guidance and roster checks. No combat-state inference.
export function selectCommunityTeams(catalog, ids) {
  if (catalog?.schemaVersion !== 1 || catalog.kind !== 'MORIMENS_COMMUNITY_TEAM_CATALOG') throw new Error('Unsupported community catalog');
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length) throw new Error('Unique team IDs required');
  return ids.map(id => {
    const team = catalog.teams.find(row => row.id === id);
    if (!team) throw new Error(`Unknown community team: ${id}`);
    return team;
  });
}

export function analyzeCommunityTeams(catalog, ids, {checkPosse = true} = {}) {
  if (typeof checkPosse !== 'boolean') throw new Error('checkPosse must be boolean');
  const teams = selectCommunityTeams(catalog, ids), resources = new Map();
  for (const team of teams) {
    for (const member of team.members) {
      const key = `character:${member.characterId}`;
      if (!resources.has(key)) resources.set(key, {type:'character', id:member.characterId, name:member.name, teamIds:[]});
      resources.get(key).teamIds.push(team.id);
    }
    if (checkPosse) {
      const key = `posse:${team.posse}`;
      if (!resources.has(key)) resources.set(key, {type:'posse', id:team.posse, name:team.posse, teamIds:[]});
      resources.get(key).teamIds.push(team.id);
    }
  }
  return {kind:'morimens-community-team-plan', analysisTrack:'team-planning', status:'PLANNING_ONLY', teamIds:ids.slice(),
    conflicts:[...resources.values()].filter(row => row.teamIds.length > 1),
    restrictions:teams.flatMap(team => team.restrictions.map(row => ({teamId:team.id,...row}))),
    finalDamage:null, gameplayClear:null, limitations:catalog.limitations.slice()};
}

export function searchCommunityPortfolios(catalog, ids, {checkPosse = true, maxEvaluations = 4096} = {}) {
  const teams = selectCommunityTeams(catalog, ids);
  if (teams.length > 12 || !Number.isSafeInteger(maxEvaluations) || maxEvaluations < 1 || maxEvaluations > 4096 || 2 ** teams.length > maxEvaluations) throw new Error('Complete subset search exceeds explicit cap (at most 12 teams / 4096 subsets)');
  const evaluatedSubsets = 2 ** teams.length, best = []; let maximumTeams = 0;
  for (let mask = 0; mask < evaluatedSubsets; mask++) {
    const subset = teams.filter((_,i) => mask & 2 ** i).map(row => row.id);
    if (analyzeCommunityTeams(catalog, subset, {checkPosse}).conflicts.length) continue;
    if (subset.length > maximumTeams) {maximumTeams = subset.length; best.length = 0;}
    if (subset.length === maximumTeams) best.push(subset);
  }
  return {status:'PLANNING_ONLY', evaluatedSubsets, maximumTeams, portfolios:best,
    optimality:'Maximum number of conflict-free supplied templates, not strongest teams, legal event assignment or optimal account investment.', checkPosse};
}

export function communityBuildPlan(catalog, teamId, buildCatalog) {
  const [team] = selectCommunityTeams(catalog, [teamId]);
  if (catalog.catalogRevision !== buildCatalog.source.revision) throw new Error('Catalog revision mismatch');
  const known = new Set(buildCatalog.characters.map(row => row.id));
  if (team.members.some(row => !known.has(row.characterId))) throw new Error('Unresolved character identity');
  return {schemaVersion:2, kind:'morimens-build-plan', catalogRevision:catalog.catalogRevision, clientBuild:null,
    team:team.members.map((row,i) => ({slotId:`member-${i+1}`,characterId:row.characterId,level:null,gnosticRank:null,advancementTalentId:null,advancementLevel:null,wheelSlots:[]}))};
}
