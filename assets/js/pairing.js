export const EMOJIS = ['🏸','🏃','💪','🔥','⭐','🎯','🏆','⚡','🌟','💥','✨','🤾','💨','🦵','🛡️'];

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function makePairings(attendees, courtCount = 2, random = Math.random) {
  const courts = Math.floor(Number(courtCount));
  if (!Number.isInteger(courts) || courts < 1) throw new Error('코트 수를 확인해 주세요.');
  if (attendees.length < 4) throw new Error('최소 4명 이상 선택해야 합니다.');
  if (attendees.length < courts * 4) throw new Error(`${courts}코트에는 최소 ${courts * 4}명 필요 (현재 ${attendees.length}명)`);
  const players = shuffle(attendees, random);
  const rounds = [];
  let cursor = 0;
  let roundNumber = 1;
  while (players.length - cursor >= 4) {
    const matches = [];
    for (let court = 1; court <= courts && players.length - cursor >= 4; court += 1) {
      const group = players.slice(cursor, cursor + 4);
      cursor += 4;
      matches.push({
        code: roundNumber === 1 ? String(court) : `${roundNumber}-${court}`,
        court,
        team_a: [group[0], group[1]],
        team_b: [group[2], group[3]],
      });
    }
    rounds.push({ number: roundNumber, matches });
    roundNumber += 1;
  }
  return { rounds, waiting: players.slice(cursor), total_games: rounds.reduce((sum, round) => sum + round.matches.length, 0) };
}

export function attendeeEmoji(memberId) {
  const id = Number(memberId) || 0;
  return EMOJIS[((id % EMOJIS.length) + EMOJIS.length) % EMOJIS.length];
}
