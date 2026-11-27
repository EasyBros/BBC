function matchName(raw, members) {
  const active = members.filter((member) => member.is_active !== false);
  const exact = active.filter((member) => member.name === raw || member.display_name === raw);
  if (exact.length === 1) return exact[0].id;
  if (exact.length > 1) return null;

  const withoutSurname = active.filter((member) => member.name.length > 1 && member.name.slice(1) === raw);
  if (withoutSurname.length === 1) return withoutSurname[0].id;
  if (withoutSurname.length > 1) return null;

  const nickname = active.filter((member) => member.nickname && member.nickname === raw);
  return nickname.length === 1 ? nickname[0].id : null;
}

export function parseGames(text, members) {
  const games = [];
  const lines = String(text ?? '').split(/\r?\n/);
  const linePattern = /^(\S+)\s+(\S+)\s+(\d{1,2})\s+(\d{1,2})\s+(\S+)\s+(\S+)$/;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(linePattern);
    if (!match) continue;
    const [, playerA1, playerA2, scoreA, scoreB, playerB1, playerB2] = match;
    const a = Number(scoreA);
    const b = Number(scoreB);
    if (a < 0 || a > 30 || b < 0 || b > 30 || a === b) continue;
    games.push({
      team_a_ids: [matchName(playerA1, members), matchName(playerA2, members)],
      team_b_ids: [matchName(playerB1, members), matchName(playerB2, members)],
      score_a: a,
      score_b: b,
      raw_line: rawLine,
    });
  }
  return games;
}

function normalizedTeam(ids) { return [...ids].map(Number).sort((a, b) => a - b); }

export function gameSignature(game) {
  const teamA = normalizedTeam(game.team_a_ids ?? game.team_a ?? []);
  const teamB = normalizedTeam(game.team_b_ids ?? game.team_b ?? []);
  const scoreA = Number(game.score_a ?? game.team_a_score);
  const scoreB = Number(game.score_b ?? game.team_b_score);
  const order = teamA[0] - teamB[0] || teamA[1] - teamB[1];
  const aFirst = order <= 0;
  const teams = aFirst ? [teamA, teamB] : [teamB, teamA];
  const scores = aFirst ? [scoreA, scoreB] : [scoreB, scoreA];
  return `${JSON.stringify(teams)}|${scores[0]}|${scores[1]}`;
}

export function findDuplicates(games, existing = []) {
  const seen = new Set(existing.map(gameSignature));
  const prior = new Set();
  return games.map((game) => {
    const signature = gameSignature(game);
    const isExisting = seen.has(signature);
    const isBatchDuplicate = !isExisting && prior.has(signature);
    prior.add(signature);
    return { ...game, signature, duplicate: isExisting || isBatchDuplicate, duplicate_type: isExisting ? 'existing' : isBatchDuplicate ? 'batch' : null };
  });
}

export function parseGamesWithDuplicates(text, members, existing = []) {
  return findDuplicates(parseGames(text, members), existing);
}
