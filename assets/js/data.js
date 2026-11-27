import { getSupabase } from './supabase.js';

const PAGE_SIZE = 1000;
const DATA_TABLES = ['members', 'seasons', 'sessions', 'attendance', 'v_game_players', 'settings'];
const CHANGED_EVENT = 'bbc:stats-changed';
let cache = null;
let pendingLoad = null;
let holidaysPromise = null;

async function loadHolidayData() {
  if (!holidaysPromise) holidaysPromise = fetch('assets/data/holidays-kr.json').then((response) => {
    if (!response.ok) throw new Error('공휴일 자료를 불러오지 못했습니다.');
    return response.json();
  });
  return holidaysPromise;
}

export async function fetchAll(table, { select = '*', orderBy, ascending = true } = {}) {
  const result = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = getSupabase().from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (orderBy) query = query.order(orderBy, { ascending });
    const { data, error } = await query;
    if (error) throw error;
    result.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return result;
  }
}

export async function loadAll({ force = false } = {}) {
  if (cache && !force) return cache;
  if (pendingLoad) return pendingLoad;
  pendingLoad = Promise.all([Promise.all(DATA_TABLES.map(async (table) => [table, await fetchAll(table)])), loadHolidayData()])
    .then(([entries, holidays]) => {
      cache = Object.fromEntries(entries);
      cache.holidays = holidays;
      window.__statsLoadedAt = Date.now();
      return cache;
    })
    .finally(() => { pendingLoad = null; });
  return pendingLoad;
}

export function markStatsChanged() {
  const at = Date.now();
  localStorage.setItem('bbc.statsChangedAt', String(at));
  cache = null;
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT, { detail: { at } }));
}

export function subscribeStatsChanged(callback, { pollMs = 5000 } = {}) {
  let lastSeen = Number(localStorage.getItem('bbc.statsChangedAt') || 0);
  const check = () => {
    const next = Number(localStorage.getItem('bbc.statsChangedAt') || 0);
    if (next > lastSeen) {
      lastSeen = next;
      cache = null;
      callback({ at: next });
    }
  };
  const local = (event) => { lastSeen = Math.max(lastSeen, event.detail?.at || 0); callback(event.detail); };
  const storage = (event) => { if (event.key === 'bbc.statsChangedAt') check(); };
  const visible = () => {
    if (document.visibilityState === 'visible' && Date.now() - (window.__statsLoadedAt || 0) > pollMs) check();
  };
  window.addEventListener(CHANGED_EVENT, local);
  window.addEventListener('storage', storage);
  document.addEventListener('visibilitychange', visible);
  const timer = setInterval(check, pollMs);
  return () => {
    window.removeEventListener(CHANGED_EVENT, local);
    window.removeEventListener('storage', storage);
    document.removeEventListener('visibilitychange', visible);
    clearInterval(timer);
  };
}

export function filterBy({ league = 'all', seasonId = 'all' } = {}, data = cache) {
  if (!data) throw new Error('loadAll()을 먼저 호출하세요.');
  const activeMembers = data.members.filter((member) => member.is_active !== false);
  const season = seasonId === 'all' || !seasonId ? null : data.seasons.find((row) => String(row.id) === String(seasonId));
  const sessions = data.sessions.filter((row) => !season || (row.date >= season.start_date && row.date <= season.end_date));
  const sessionIds = new Set(sessions.map((row) => row.id));
  let games = data.v_game_players.filter((row) => sessionIds.has(row.session_id));
  let members = activeMembers;
  if (league !== 'all' && league !== '' && league != null) {
    members = activeMembers.filter((row) => Number(row.league) === Number(league));
    const eligibleIds = new Set(members.map((row) => row.id));
    const byGame = new Map();
    for (const row of games) {
      const game = byGame.get(row.game_id) || new Set();
      game.add(row.member_id);
      byGame.set(row.game_id, game);
    }
    const accepted = new Set([...byGame].filter(([, ids]) => ids.size === 4 && [...ids].every((id) => eligibleIds.has(id))).map(([id]) => id));
    games = games.filter((row) => accepted.has(row.game_id));
  }
  const memberIds = new Set(members.map((row) => row.id));
  return {
    members, seasons: data.seasons, sessions,
    attendance: data.attendance.filter((row) => sessionIds.has(row.session_id) && memberIds.has(row.member_id)),
    games, settings: data.settings, selectedSeason: season,
  };
}

export async function callRpc(name, args = {}) {
  const { data, error } = await getSupabase().rpc(name, args);
  if (error) throw error;
  markStatsChanged();
  return data;
}

export async function insertMember(member) {
  const { data, error } = await getSupabase().from('members').insert(member).select().single();
  if (error) throw error;
  markStatsChanged();
  return data;
}

export async function updateMember(id, patch) {
  const { data, error } = await getSupabase().from('members').update(patch).eq('id', id).select().single();
  if (error) throw error;
  markStatsChanged();
  return data;
}
