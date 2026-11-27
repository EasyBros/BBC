import { loadAll, filterBy, subscribeStatsChanged } from '../data.js';
import { dashboardStats, memberStats, pairStats, bLoveHearts } from '../stats.js';
import { copyToClipboard, escapeHtml, formatPercent, today } from '../util.js';

const $ = (selector) => document.querySelector(selector);
const safe = escapeHtml;
const league = () => localStorage.getItem('currentLeague') || 'all';
const seasonId = () => localStorage.getItem('currentSeason') || 'all';
const rank = (index) => index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : String(index + 1);
let lastStats;

function card(title, icon, href, rows, headings='') {
  return `<section class="card ranking-card"><header><span class="ranking-icon">${icon}</span><div><h3>${title}</h3><small>${headings}</small></div><a href="${href}">전체 보기 →</a></header><div class="ranking-body">${rows||'<div class="empty-state">기록이 없습니다.</div>'}</div></section>`;
}

function renderSummary(stats) {
  const values=[['총 모임',stats.total_sessions,'📅'],['총 경기',stats.total_games,'🏸'],['활동 멤버',stats.total_members,'👥'],['최근 모임',stats.recent_sessions[0]?.date||'기록 없음','✨']];
  $('#summary-cards').innerHTML=values.map(([label,value,icon])=>`<div class="summary-card card"><span class="summary-icon">${icon}</span><div class="summary-label">${label}</div><div class="summary-value">${safe(value)}</div></div>`).join('');
}

function renderSeasonBanner(data) {
  const settings=new Map((data.settings||[]).map((row)=>[row.key,row.value]));
  const teaserEnabled=Boolean(settings.get('season_teaser_enabled'));
  const teaser=String(settings.get('season_teaser_text')||'❄️ Winter is coming! 12월 동계 시즌 개막 예정 🏸');
  const season=data.selectedSeason;
  const emoji={spring:'🌸',summer:'☀️',autumn:'🍂',winter:'❄️'};
  const sessionCount=season?data.sessions.filter((row)=>row.date>=season.start_date&&row.date<=season.end_date).length:0;
  const message=teaserEnabled?`<div class="teaser-mask"><div class="teaser-track">${Array.from({length:3},()=>`<span>${safe(teaser)}</span>`).join('')}</div></div>`:'';
  document.querySelector('#season-banner').innerHTML=`<div><span class="season-icon">🏸</span><div><strong>${season?`${emoji[season.kind]||'🏸'} ${safe(season.name)}`:'BBC 리그'}</strong><p>${season?`${safe(season.start_date)} ~ ${safe(season.end_date)} · ${sessionCount}모임`:'출석과 경기를 기록하고 시즌 흐름을 확인하세요.'}</p></div></div>${message||'<p class="season-teaser">Bulgwang Badminton Club</p>'}`;
}

function renderHighlights(data, stats) {
  const highlights=stats.today_highlights;
  if(!highlights){$('#today-highlights').innerHTML='<div class="card empty-state">오늘 경기가 없습니다 🏸</div>';return;}
  const bestPair=highlights.best_couples[0];
  const cards=[
    ['🏆','BBC Point',highlights.bbc_points.slice(0,3).map((r)=>`${safe(r.member_name)} · ${r.bbc_point}P (승:${r.won}, 패:${r.lost})`).join('<br>')],
    ['🥇','어깨 깡패',highlights.winners.map((r)=>`${safe(r.member_name)} · ${formatPercent(r.win_rate)} (${r.won}승)`).join('<br>')],
    ['👫','Best Couple',bestPair?`${safe(bestPair.member1_name)} & ${safe(bestPair.member2_name)} · ${formatPercent(bestPair.adj_win_rate)} (${bestPair.won}승)`:'기록 없음'],
    ['🧹','Magic Eraser',highlights.erasers.map((r)=>`${safe(r.member_name)} · ${r.total_games}경기 / ${r.lost_games}패`).join('<br>')],
    ['💪','Strong Guy',highlights.strong_guys.map((r)=>`${safe(r.member_name)} · ${r.total_games}경기`).join('<br>')],
  ];
  $('#today-highlights').innerHTML=cards.map(([icon,title,body])=>`<article class="highlight-card"><div>${icon}</div><h3>${title}</h3><p>${body||'기록 없음'}</p></article>`).join('');
}

function renderRankings(data, stats) {
  const members=memberStats(data);
  const pairs=pairStats(data);
  const eligible=members.filter((m)=>m.played>=15).sort((a,b)=>b.adj_win_rate-a.adj_win_rate||b.win_rate-a.win_rate||b.won-a.won||b.played-a.played).slice(0,5);
  const points=[...members].sort((a,b)=>b.bbc_point-a.bbc_point||b.played-a.played).slice(0,5);
  const pairList=pairs.filter((p)=>p.played>=2).slice(0,5);
  const attendance=[...members].sort((a,b)=>b.attendance_rate-a.attendance_rate).slice(0,5);
  const rowset=(rows,fn)=>rows.map((item,index)=>`<div class="rank-row"><span class="rank-no">${rank(index)}</span>${fn(item)}</div>`).join('');
  const pointRows=rowset(points,(p)=>`<span>${safe(p.display_name)}</span><strong>${p.bbc_point}P</strong>`);
  const winRows=rowset(eligible,(p)=>`<span>${safe(p.display_name)} <small>${p.played}경기</small></span><strong>${formatPercent(p.adj_win_rate)}</strong>`);
  const pairRows=rowset(pairList,(p)=>`<span>${safe(p.member1_name)} &amp; ${safe(p.member2_name)} <small>${p.played}경기 ${bLoveHearts(p.adj_win_rate)}♥</small></span><strong>${formatPercent(p.adj_win_rate)}</strong>`);
  const attendanceRows=rowset(attendance,(p)=>`<span>${safe(p.display_name)}</span><strong>${formatPercent(p.attendance_rate)}</strong>`);
  const winnerRows=rowset(stats.top_winners,(p)=>`<span>${safe(p.member_name)} <small>${p.total_games}경기</small></span><strong>${p.winner_count}회</strong>`);
  const eraserRows=rowset(stats.top_erasers,(p)=>`<span>${safe(p.member_name)} <small>${p.total_games}경기</small></span><strong>${p.eraser_count}회</strong>`);
  const recentRows=stats.recent_sessions.map((s)=>`<a class="rank-row recent-row" href="games.html?session=${encodeURIComponent(s.id)}"><span>${safe(s.date)}</span><small>${safe(s.location||'장소 미정')} · 참석 ${s.attendee_count}명 · 경기 ${s.game_count}개</small><strong>상세 →</strong></a>`).join('');
  $('#ranking-cards').innerHTML=[
    card('BBC 포인트 TOP 5','⭐','stats.html?tab=bbc',pointRows,'승×3 + 패×1'),
    card('개인 승률 TOP 5','🏆','stats.html?tab=winrate',winRows,'보정승률 기준 · 15경기 이상'),
    card('복식 조 승률 TOP 5','👥','stats.html?tab=pairs',pairRows,'보정승률 기준'),
    card('출석률 TOP 5','📅','stats.html?tab=attendance',attendanceRows,'경기 참가일 ÷ 평일 수'),
    card('어깨 깡패 TOP 5','🥇','stats.html?tab=winner',winnerRows,'일자별 등극 횟수'),
    card('Magic Eraser TOP 5','🧹','stats.html?tab=eraser',eraserRows,'일자별 등극 횟수'),
    card('최근 모임','🏸','games.html',recentRows,'최근 기록'),
  ].join('');
}

function copyText(stats) {
  const date=today();const h=stats.today_highlights;
  if(!h)return `🏸 Today's Highlight (${date})\n오늘 경기가 없습니다 🏸`;
  const sections=[];
  sections.push(`🏆 BBC Point\n${h.bbc_points.map((p)=>`${p.member_name} ${p.bbc_point}P (승:${p.won}, 패:${p.lost})`).join('\n')}`);
  sections.push(`🥇 어깨 깡패\n${h.winners.map((p)=>`${p.member_name} ${formatPercent(p.win_rate)} (${p.won}승)`).join('\n')}`);
  sections.push(`👫 Best Couple\n${h.best_couples.map((p)=>`${p.member1_name} & ${p.member2_name} 보정승률 ${formatPercent(p.adj_win_rate)} (${p.won}승)`).join('\n')}`);
  sections.push(`🧹 Magic Eraser\n${h.erasers.map((p)=>`${p.member_name} ${p.total_games}경기 / ${p.lost_games}패`).join('\n')}`);
  sections.push(`💪 Strong Guy (${h.strong_guys[0]?.total_games||0}경기)\n${h.strong_guys.map((p)=>p.member_name).join(', ')}`);
  return `🏸 Today's Highlight (${date})\n━━━━━━━━━━━━━━━━━━\n${sections.join('\n\n')}\n━━━━━━━━━━━━━━━━━━\n🔗 대시보드: ${location.origin}${location.pathname.replace(/[^/]*$/,'')}\n📝 경기 입력: ${location.origin}${location.pathname.replace(/[^/]*$/,'')}games.html`;
}

async function render() {
  try {
    const full=await loadAll();const data=filterBy({league:league(),seasonId:seasonId()},full);
    lastStats=dashboardStats(data);renderSeasonBanner(data);renderSummary(lastStats);renderHighlights(data,lastStats);renderRankings(data,lastStats);
  } catch(error) { window.showToast?.(error.message||'데이터를 불러오지 못했습니다.','danger'); }
}

$('#copy-highlights').addEventListener('click',async()=>{try{await copyToClipboard(copyText(lastStats||{today_highlights:null}));window.showToast?.('하이라이트를 복사했습니다.','success');}catch{window.showToast?.('복사하지 못했습니다.','danger');}});
window.addEventListener('leagueChanged',render);window.addEventListener('seasonChanged',render);
subscribeStatsChanged(render);render();
