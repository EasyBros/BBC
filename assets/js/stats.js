const DAY_MS = 86_400_000;
const round1 = (value) => Math.round((Number(value) + Number.EPSILON) * 10) / 10;
const ratio = (wins, played, priorWins = 0, priorGames = 0) => played + priorGames ? (wins + priorWins) / (played + priorGames) * 100 : 0;

function rowsOf(data = {}) { return data.games ?? data.v_game_players ?? []; }
function memberMap(data = {}) { return new Map((data.members ?? []).map((member) => [member.id, member])); }
function gameGroups(data = {}) {
  const groups = new Map();
  for (const row of rowsOf(data)) {
    const game = groups.get(row.game_id) ?? { id: row.game_id, session_id: row.session_id, date: row.date, played_at: row.played_at, team_a_score: Number(row.team_a_score), team_b_score: Number(row.team_b_score), winner_team: row.winner_team, team_a_name: row.team_a_name, team_b_name: row.team_b_name, comment: row.comment, players: [] };
    game.players.push(row);
    groups.set(row.game_id, game);
  }
  return [...groups.values()];
}
function teamsOf(game) {
  return {
    A: game.players.filter((row) => row.team === 'A'),
    B: game.players.filter((row) => row.team === 'B'),
  };
}
function displayName(member) {
  if (!member) return '알 수 없음';
  return member.display_name || (member.nickname ? `${member.name} (${member.nickname})` : member.name);
}
function dayBounds(date) {
  const [y,m,d] = date.split('-').map(Number);
  return [Date.UTC(y,m-1,d), Date.UTC(y,m-1,d) + DAY_MS];
}
function weekdayCount(startDate, endDate, holidays = []) {
  if (!startDate || !endDate || startDate > endDate) return 0;
  const excluded = new Set(holidays);
  const [start] = dayBounds(startDate);
  const [end] = dayBounds(endDate);
  let count = 0;
  for (let time = start; time < end; time += DAY_MS) {
    const day = new Date(time).getUTCDay();
    const key = new Date(time).toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !excluded.has(key)) count += 1;
  }
  return count;
}
function plusDays(date, days) {
  const [time] = dayBounds(date);
  return new Date(time + days * DAY_MS).toISOString().slice(0,10);
}
function currentWeekStart(today) {
  const day = new Date(dayBounds(today)[0]).getUTCDay();
  return plusDays(today, -(day === 0 ? 6 : day - 1));
}
function currentMonthStart(today) { return `${today.slice(0,7)}-01`; }
function settingsValue(settings, key, fallback) {
  const row = (settings ?? []).find((item) => item.key === key);
  if (!row) return fallback;
  try { return typeof row.value === 'string' ? JSON.parse(row.value) : row.value; } catch { return row.value; }
}

export function adjustedWinRate(won, played) { return round1(ratio(won, played, 7.5, 15)); }
export function adjustedPairWinRate(won, played) { return round1(ratio(won, played, 2.5, 5)); }
export function winRate(won, played) { return round1(ratio(won, played)); }
export function bbcPoint(won, lost) { return Number(won) * 3 + Number(lost); }
export function bLoveHearts(adjustedRate) { return Math.max(0, Math.min(5, Math.round(Number(adjustedRate) / 20))); }
export { weekdayCount };

function aggregateMembers(data) {
  const members = data.members ?? [];
  const map = new Map(members.map((member) => [member.id, { ...member, display_name: displayName(member), played: 0, won: 0, lost: 0, sessionsPlayed: new Set() }]));
  for (const game of gameGroups(data)) {
    for (const player of game.players) {
      const item = map.get(player.member_id);
      if (!item) continue;
      item.played += 1;
      if (player.team === game.winner_team) item.won += 1; else item.lost += 1;
      item.sessionsPlayed.add(game.session_id);
    }
  }
  return map;
}

function pairAggregates(data) {
  const members = memberMap(data);
  const pairs = new Map();
  for (const game of gameGroups(data)) {
    const teams = teamsOf(game);
    for (const side of ['A','B']) {
      const players = teams[side];
      if (players.length !== 2) continue;
      const ids = players.map((row) => row.member_id).sort((a,b) => a-b);
      const key = `${ids[0]}_${ids[1]}`;
      const item = pairs.get(key) ?? { member1_id: ids[0], member2_id: ids[1], member1_name: displayName(members.get(ids[0])), member2_name: displayName(members.get(ids[1])), played: 0, won: 0, lost: 0, score_diff: 0 };
      item.played += 1;
      const won = side === game.winner_team;
      if (won) item.won += 1; else item.lost += 1;
      item.score_diff += side === 'A' ? game.team_a_score - game.team_b_score : game.team_b_score - game.team_a_score;
      pairs.set(key, item);
    }
  }
  return [...pairs.values()].map((item) => ({ ...item, win_rate: winRate(item.won,item.played), adj_win_rate: adjustedPairWinRate(item.won,item.played) }));
}

function compareRank(a,b) {
  return b.adj_win_rate-a.adj_win_rate || b.win_rate-a.win_rate || b.won-a.won || b.played-a.played || String(a.display_name ?? a.member1_name ?? '').localeCompare(String(b.display_name ?? b.member1_name ?? ''),'ko');
}

function holidayList(data, holidays = {}) {
  const selected = Object.keys(holidays ?? {}).length ? holidays : data.holidays;
  const fromFile = Object.values(selected ?? {}).flat();
  const extra = settingsValue(data.settings,'extra_holidays',[]);
  return [...new Set([...fromFile, ...(Array.isArray(extra) ? extra : [])])];
}

export function pairStats(data) { return pairAggregates(data).sort(compareRank); }

export function memberStats(data, { today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date()), holidays = {} } = {}) {
  const aggregates = aggregateMembers(data);
  const excluded = holidayList(data,holidays);
  const weekStart = currentWeekStart(today);
  const monthStart = currentMonthStart(today);
  const sessions = data.sessions ?? [];
  const attendance = data.attendance ?? [];
  const games = gameGroups(data);
  const out = [];
  for (const member of aggregates.values()) {
    const attended = new Set(attendance.filter((row) => row.member_id === member.id).map((row) => row.session_id));
    const totalStart = member.joined_at > '0000-00-00' ? member.joined_at : today;
    const periods = [
      { prefix:'', start:totalStart, end:today },
      { prefix:'month_', start:member.joined_at > monthStart ? member.joined_at : monthStart, end:today },
      { prefix:'week_', start:member.joined_at > weekStart ? member.joined_at : weekStart, end:today },
    ];
    const result = { id:member.id, name:member.name, nickname:member.nickname, display_name:member.display_name, joined_at:member.joined_at, is_guest:member.is_guest, played:member.played, won:member.won, lost:member.lost, win_rate:winRate(member.won,member.played), adj_win_rate:adjustedWinRate(member.won,member.played), bbc_point:bbcPoint(member.won,member.lost) };
    for (const period of periods) {
      const days = new Set(games.filter((game) => game.date >= period.start && game.date <= period.end && game.players.some((player) => player.member_id === member.id)).map((game) => game.date));
      const startableSessions = sessions.filter((session) => session.date >= period.start && session.date <= period.end);
      const attendedInPeriod = new Set(attendance.filter((row) => row.member_id === member.id && startableSessions.some((session) => session.id === row.session_id)).map((row) => row.session_id));
      const denominator = weekdayCount(period.start,period.end,excluded);
      result[`${period.prefix}total_sessions`] = denominator;
      result[`${period.prefix}attended`] = days.size;
      result[`${period.prefix}attendance_rate`] = denominator ? round1(days.size / denominator * 100) : 0;
      if (period.prefix) {
        const periodGames = games.filter((game) => game.date >= period.start && game.date <= period.end);
        const rows = periodGames.flatMap((game) => game.players.filter((player) => player.member_id === member.id).map((player) => ({ player,game })));
        const wins = rows.filter(({player,game}) => player.team === game.winner_team).length;
        const losses = rows.length - wins;
        result[`${period.prefix}played`] = rows.length;
        result[`${period.prefix}won`] = wins;
        result[`${period.prefix}lost`] = losses;
        result[`${period.prefix}win_rate`] = winRate(wins,rows.length);
        result[`${period.prefix}attended_sessions`] = attendedInPeriod.size;
      }
    }
    out.push(result);
  }
  return out;
}

function dailyGroupHighlights(data) {
  const members = memberMap(data);
  const pairs = pairAggregates(data);
  const games = gameGroups(data);
  const byDate = new Map();
  for (const game of games) {
    const day = byDate.get(game.date) ?? { games:[], members:new Map(), pairIds:new Set() };
    day.games.push(game);
    for (const player of game.players) {
      const item = day.members.get(player.member_id) ?? { member_id:player.member_id, member_name:displayName(members.get(player.member_id)), played:0,won:0,lost:0,bbc_point:0 };
      item.played += 1;
      const won = player.team === game.winner_team;
      if (won) item.won += 1; else item.lost += 1;
      item.bbc_point += won ? 3 : 1;
      day.members.set(player.member_id,item);
    }
    for (const side of ['A','B']) {
      const team = game.players.filter((p) => p.team===side);
      if (team.length===2) day.pairIds.add(team.map((p)=>p.member_id).sort((a,b)=>a-b).join('_'));
    }
    byDate.set(game.date,day);
  }
  return [...byDate].map(([date,day]) => {
    const people = [...day.members.values()];
    const maxPlayed = Math.max(...people.map((person)=>person.played));
    const k = maxPlayed / 2;
    const dynamic = people.map((person)=>({...person,win_rate:winRate(person.won,person.played),adj_win_rate:round1(ratio(person.won,person.played,k/2,k))}));
    const sortHigh = (field) => [...dynamic].sort((a,b)=>b[field]-a[field]);
    const bbcMax = Math.max(...people.map((person)=>person.bbc_point));
    const bestRate = Math.max(...dynamic.map((person)=>person.adj_win_rate));
    const lowRate = Math.min(...dynamic.map((person)=>person.adj_win_rate));
    const pairMap = new Map();
    for (const game of day.games) {
      for (const side of ['A','B']) {
        const team = game.players.filter((player)=>player.team===side);
        if (team.length!==2) continue;
        const ids = team.map((player)=>player.member_id).sort((a,b)=>a-b);
        const key = `${ids[0]}_${ids[1]}`;
        const item = pairMap.get(key) ?? {member1_id:ids[0],member2_id:ids[1],member1_name:displayName(members.get(ids[0])),member2_name:displayName(members.get(ids[1])),played:0,won:0,lost:0,score_diff:0};
        item.played++;
        if(side===game.winner_team)item.won++;else item.lost++;
        item.score_diff += side==='A' ? game.team_a_score-game.team_b_score : game.team_b_score-game.team_a_score;
        pairMap.set(key,item);
      }
    }
    const topPairs = [...pairMap.values()].map((pair)=>({...pair,win_rate:winRate(pair.won,pair.played),adj_win_rate:adjustedPairWinRate(pair.won,pair.played)}));
    const pairRate = topPairs.length ? Math.max(...topPairs.map((pair)=>pair.adj_win_rate)) : 0;
    const losers = dynamic.filter((person)=>person.adj_win_rate===lowRate);
    const erasers = losers.map((person)=>{
      const partnerIds=new Set();
      for(const game of day.games){
        for(const side of ['A','B']){
          const team=game.players.filter((player)=>player.team===side);
          if(side!==game.winner_team && team.some((player)=>player.member_id===person.member_id)) for(const player of team) if(player.member_id!==person.member_id) partnerIds.add(player.member_id);
        }
      }
      return {...person,total_games:person.played,lost_games:person.lost,deleted_partners:[...partnerIds].map((id)=>displayName(members.get(id)))};
    });
    return { date, session_id:day.games[0]?.session_id, bbc_points:people.filter((p)=>p.bbc_point===bbcMax).map((p)=>({...p,member_name:p.member_name})), winners:dynamic.filter((p)=>p.adj_win_rate===bestRate), best_couples:topPairs.filter((pair)=>pair.adj_win_rate===pairRate), erasers, strong_guys:people.filter((p)=>p.played===maxPlayed).map((p)=>({member_id:p.member_id,member_name:p.member_name,total_games:p.played})) };
  }).sort((a,b)=>b.date.localeCompare(a.date));
}

export function dailyHighlights(data) { return dailyGroupHighlights(data); }
export function winners(data) { return dailyGroupHighlights(data).flatMap((day)=>day.winners.map((row)=>({...row,date:day.date,session_id:day.session_id}))); }
export function erasers(data) { return dailyGroupHighlights(data).flatMap((day)=>day.erasers.map((row)=>({...row,date:day.date,session_id:day.session_id}))); }

export function dashboardStats(data, { today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date()) } = {}) {
  const games=gameGroups(data); const sessions=data.sessions??[]; const members=(data.members??[]).filter((m)=>m.is_active!==false);
  const highlights=dailyGroupHighlights(data).find((day)=>day.date===today)??null;
  const countDays=(field)=>{
    const counts=new Map();
    for(const day of dailyGroupHighlights(data)) for(const person of day[field]??[]){const item=counts.get(person.member_id)??{member_id:person.member_id,member_name:person.member_name,count:0,total_games:0,total_won:0,lost_games:0};item.count++;item.total_games+=person.total_games??person.played??0;item.total_won+=person.won??0;item.lost_games+=person.lost_games??person.lost??0;counts.set(person.member_id,item);}
    return [...counts.values()].sort((a,b)=>b.count-a.count||a.member_name.localeCompare(b.member_name,'ko')).slice(0,5).map((item)=>field==='winners'?{member_id:item.member_id,member_name:item.member_name,winner_count:item.count,total_games:item.total_games,total_won:item.total_won}:{member_id:item.member_id,member_name:item.member_name,eraser_count:item.count,total_games:item.total_games,lost_games:item.lost_games});
  };
  const sessionList=[...sessions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map((session)=>({
    ...session,
    game_count:games.filter((game)=>game.session_id===session.id).length,
    attendee_count:new Set((data.attendance??[]).filter((row)=>row.session_id===session.id).map((row)=>row.member_id)).size,
  }));
  return {total_sessions:sessions.length,total_games:games.length,total_members:members.length,recent_sessions:sessionList,today_highlights:highlights,top_winners:countDays('winners'),top_erasers:countDays('erasers')};
}

export function analysis(data, minGames=10, memberId=null) {
  const members=(data.members??[]).filter((member)=>member.is_active!==false);
  const pairs=pairAggregates(data);
  const eligible=members.filter((member)=>pairs.filter((pair)=>(pair.member1_id===member.id||pair.member2_id===member.id)&&pair.played>=minGames).length>0);
  const heatmapMembers=eligible.map((member)=>({id:member.id,display_name:displayName(member),played:pairs.filter((pair)=>pair.member1_id===member.id||pair.member2_id===member.id).reduce((n,pair)=>n+pair.played,0)}));
  const heatmap_cells={};
  for(const pair of pairs) heatmap_cells[`${pair.member1_id}_${pair.member2_id}`]={played:pair.played,won:pair.won,win_rate:pair.win_rate,adj_win_rate:pair.adj_win_rate};
  const target=memberId==null?null:Number(memberId);
  const targetGames=target==null?[]:gameGroups(data).filter((game)=>game.players.some((player)=>player.member_id===target)).sort((a,b)=>a.date.localeCompare(b.date)||String(a.played_at).localeCompare(String(b.played_at)));
  let won=0; let played=0;
  const daily=new Map(); const timeline=[];
  for(const game of targetGames){
    for(const player of game.players.filter((row)=>row.member_id===target)){
      played++; const isWin=player.team===game.winner_team;if(isWin)won++;
      const stats=daily.get(game.date)??{won:0,played:0};stats.played++;if(isWin)stats.won++;daily.set(game.date,stats);
    }
    const todayDaily=daily.get(game.date);
    timeline.push({date:game.date,win_rate:winRate(won,played),adj_win_rate:adjustedWinRate(won,played),daily_win_rate:winRate(todayDaily.won,todayDaily.played),cumulative_played:played,cumulative_won:won});
  }
  return {members:members.map((member)=>({id:member.id,display_name:displayName(member),played:pairs.filter((pair)=>pair.member1_id===member.id||pair.member2_id===member.id).reduce((n,pair)=>n+pair.played,0)})),heatmap_members:heatmapMembers,heatmap_cells,timeline};
}

function rangeForPeriod(period, index, season) {
  const source = season ?? period;
  const start = source?.start_date;
  const end = source?.end_date;
  if (!start || !end) return null;
  if (period === 'season') return { start, end, label:source.name ?? '시즌' };
  if (period === 'month') {
    const monthIndex = Number(index);
    if (!Number.isInteger(monthIndex) || monthIndex < 1 || monthIndex > 3) return null;
    const startMonth = Number(start.slice(5,7));
    const month = ((startMonth - 1 + monthIndex - 1) % 12) + 1;
    const year = Number(start.slice(0,4)) + Math.floor((startMonth - 1 + monthIndex - 1) / 12);
    const monthStart = `${year}-${String(month).padStart(2,'0')}-01`;
    const [y,m] = monthStart.split('-').map(Number);
    const nextMonth = m === 12 ? `${y+1}-01-01` : `${y}-${String(m+1).padStart(2,'0')}-01`;
    const monthEnd = plusDays(nextMonth,-1);
    return {start:monthStart<start?start:monthStart,end:monthEnd>end?end:monthEnd,label:`${monthIndex}월`};
  }
  if (period === 'week') {
    const weekIndex = Number(index);
    if (!Number.isInteger(weekIndex) || weekIndex < 1) return null;
    const firstMonday = currentWeekStart(start);
    const weekStart = plusDays(firstMonday,(weekIndex-1)*7);
    const nextWeek = plusDays(weekStart,7);
    const weekEnd = plusDays(nextWeek,-1);
    if (weekStart>end || weekEnd<start) return null;
    return {start:weekStart<start?start:weekStart,end:weekEnd>end?end:weekEnd,label:`${weekIndex}주차`};
  }
  return null;
}

export function seasonStats(data, season) {
  const start=season?.start_date; const end=season?.end_date;
  if(!start||!end)return {summary:{start_date:null,end_date:null,total_sessions:0,total_games:0,active_members:0,avg_attendees:0,avg_games:0},highlights:{mvp:[],winner:[],bbc:[],eraser:[],strong_guy:[],best_couple:[]},weekly:[]};
  const seasonSessions=(data.sessions??[]).filter((row)=>row.date>=start&&row.date<=end);
  const ids=new Set(seasonSessions.map((row)=>row.id));
  const sourceRows=rowsOf(data).filter((row)=>ids.has(row.session_id));
  const seasonData={...data,sessions:seasonSessions,attendance:(data.attendance??[]).filter((row)=>ids.has(row.session_id)),games:sourceRows};
  const games=gameGroups(seasonData);
  const participated=new Set(sourceRows.map((row)=>row.member_id));
  const attendanceBySession=new Map();
  for(const row of seasonData.attendance){const set=attendanceBySession.get(row.session_id)??new Set();set.add(row.member_id);attendanceBySession.set(row.session_id,set);}
  const dayStats=memberStats(seasonData,{today:end});
  const eligibleMvp=dayStats.filter((row)=>row.played>=5).sort(compareRank).slice(0,1);
  const daily=dailyGroupHighlights(seasonData);
  const countBy=(field)=>{
    const counts=new Map();
    for(const day of daily)for(const person of day[field]){const item=counts.get(person.member_id)??{...person,highlight_count:0};item.highlight_count++;counts.set(person.member_id,item);}
    return [...counts.values()].sort((a,b)=>b.highlight_count-a.highlight_count);
  };
  const pointTotals=new Map();
  const playTotals=new Map();
  for(const game of games)for(const player of game.players){const won=player.team===game.winner_team;const point=pointTotals.get(player.member_id)??{member_id:player.member_id,member_name:displayName(memberMap(data).get(player.member_id)),total_games:0,won_games:0,lost_games:0,bbc_point:0};point.total_games++;if(won){point.won_games++;point.bbc_point+=3;}else{point.lost_games++;point.bbc_point++;}pointTotals.set(player.member_id,point);playTotals.set(player.member_id,(playTotals.get(player.member_id)||0)+1);}
  const baseRows=[...pointTotals.values()].map((row)=>({...row,win_rate:winRate(row.won_games,row.total_games),adj_win_rate:adjustedWinRate(row.won_games,row.total_games)}));
  const dailyCount=(field)=>countBy(field).map((row)=>({...row,total_games:row.played??row.total_games??0,won_games:row.won??row.won_games??0,lost_games:row.lost??row.lost_games??0,win_rate:row.win_rate??0,adj_win_rate:row.adj_win_rate??0,bbc_point:row.bbc_point??0}));
  const strong=[...playTotals].map(([id,total_games])=>({member_id:id,member_name:displayName(memberMap(data).get(id)),total_games})).sort((a,b)=>b.total_games-a.total_games);
  const couples=pairAggregates(seasonData).sort((a,b)=>b.adj_win_rate-a.adj_win_rate||b.score_diff-a.score_diff);
  const bestBBC=baseRows.sort((a,b)=>b.bbc_point-a.bbc_point);
  const weeklyMap=new Map();
  const seasonMonday=currentWeekStart(start);
  for(const session of seasonSessions){const index=Math.floor((dayBounds(session.date)[0]-dayBounds(seasonMonday)[0])/(7*DAY_MS))+1;const row=weeklyMap.get(index)??{date:session.date,games:0,attendees:0};row.games+=games.filter((g)=>g.session_id===session.id).length;row.attendees=Math.max(row.attendees,attendanceBySession.get(session.id)?.size??0);weeklyMap.set(index,row);}
  return {summary:{start_date:start,end_date:end,total_sessions:seasonSessions.length,total_games:games.length,active_members:participated.size,avg_attendees:seasonSessions.length?round1(seasonSessions.reduce((n,s)=>n+(attendanceBySession.get(s.id)?.size??0),0)/seasonSessions.length):0,avg_games:seasonSessions.length?round1(games.length/seasonSessions.length):0},highlights:{mvp:eligibleMvp,winner:dailyCount('winners'),bbc:bestBBC,eraser:dailyCount('erasers'),strong_guy:strong,best_couple:couples},weekly:[...weeklyMap.values()]};
}

export function periodHighlight(data, period, index, season) {
  const bounds=rangeForPeriod(period,index,season);
  if(!bounds)return {highlights:{mvp:[],winner:[],eraser:[],bbc:[],strong:[],couple:[]},available_weeks:[],available_months:[],period_summary:{label:'',start_date:null,end_date:null,total_sessions:0,total_games:0,active_members:0}};
  const sessions=(data.sessions??[]).filter((row)=>row.date>=bounds.start&&row.date<=bounds.end);
  const sessionIds=new Set(sessions.map((row)=>row.id));
  const rows=rowsOf(data).filter((row)=>sessionIds.has(row.session_id));
  const scoped={...data,sessions,attendance:(data.attendance??[]).filter((row)=>sessionIds.has(row.session_id)),games:rows};
  const games=gameGroups(scoped);
  const people=aggregateMembers(scoped);
  const mvp=[...people.values()].map((p)=>({...p,member_name:p.display_name,total_games:p.played,won_games:p.won,lost_games:p.lost,win_rate:winRate(p.won,p.played),adj_win_rate:adjustedWinRate(p.won,p.played),bbc_point:bbcPoint(p.won,p.lost),highlight_count:0})).filter((p)=>p.total_games>=5).sort(compareRank).slice(0,1);
  const daily=dailyGroupHighlights(scoped);
  const topCount=(field)=>{const map=new Map();for(const day of daily)for(const row of day[field]){const item=map.get(row.member_id)??{member_id:row.member_id,member_name:row.member_name,total_games:row.total_games??row.played??0,won_games:row.won??0,lost_games:row.lost??0,win_rate:row.win_rate??0,adj_win_rate:row.adj_win_rate??0,bbc_point:row.bbc_point??0,highlight_count:0,score_diff:row.score_diff??0};item.highlight_count++;map.set(row.member_id,item);}return [...map.values()].sort((a,b)=>b.highlight_count-a.highlight_count);};
  const scoreMap=new Map();
  for(const game of games)for(const player of game.players){const won=player.team===game.winner_team;const row=scoreMap.get(player.member_id)??{member_id:player.member_id,member_name:displayName(memberMap(data).get(player.member_id)),total_games:0,won_games:0,lost_games:0,bbc_point:0};row.total_games++;if(won){row.won_games++;row.bbc_point+=3;}else{row.lost_games++;row.bbc_point++;}scoreMap.set(player.member_id,row);}
  const scores=[...scoreMap.values()].map((row)=>({...row,win_rate:winRate(row.won_games,row.total_games),adj_win_rate:adjustedWinRate(row.won_games,row.total_games),highlight_count:0,score_diff:0}));
  const couples=pairAggregates(scoped).map((row)=>({...row,member_name:`${row.member1_name} & ${row.member2_name}`,total_games:row.played,won_games:row.won,lost_games:row.lost,highlight_count:0})).sort((a,b)=>b.adj_win_rate-a.adj_win_rate||b.score_diff-a.score_diff);
  const strongMap=new Map();for(const game of games)for(const player of game.players)strongMap.set(player.member_id,(strongMap.get(player.member_id)||0)+1);
  const strong=[...strongMap].map(([id,total_games])=>({member_id:id,member_name:displayName(memberMap(data).get(id)),total_games,highlight_count:0})).sort((a,b)=>b.total_games-a.total_games);
  const maxPoint=Math.max(0,...scores.map((row)=>row.bbc_point));
  const bbc=scores.filter((row)=>row.bbc_point===maxPoint&&maxPoint>0);
  const eraser=topCount('erasers');const winner=topCount('winners');
  const weekList=new Set();const monthList=new Set();
  const seasonMonday=currentWeekStart(season.start_date);
  for(const session of data.sessions??[]){if(session.date<season.start_date||session.date>season.end_date)continue;const week=Math.floor((dayBounds(session.date)[0]-dayBounds(seasonMonday)[0])/(7*DAY_MS))+1;weekList.add(week);const [sy,sm]=season.start_date.split('-').map(Number);const [y,m]=session.date.split('-').map(Number);monthList.add(((y-sy)*12+m-sm)+1);}
  return {highlights:{mvp,winner,eraser,bbc,strong,couple:couples},available_weeks:[...weekList].sort((a,b)=>b-a),available_months:[...monthList].sort((a,b)=>b-a),period_summary:{label:`${season.name} ${bounds.label}`,start_date:bounds.start,end_date:bounds.end,total_sessions:sessions.length,total_games:games.length,active_members:new Set(rows.map((row)=>row.member_id)).size}};
}
