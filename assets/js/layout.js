import { APP_TITLE, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config.js';
import { getSession, isAdmin, mountLoginOverlay, onAuthChanged, signOut } from './auth.js';
import { fetchAll, filterBy, loadAll, markStatsChanged } from './data.js';
import { dashboardStats, periodHighlight } from './stats.js';
import { dateWithWeekday, escapeHtml, today } from './util.js';
import { enhanceGradeSelect } from './grade-ui.js';

const links = [
  ['dashboard','speedometer2','대시보드','index.html'],['members','people','멤버','members.html'],
  ['games','controller','경기 입력','games.html'],['match','clipboard-check','출석&짝','match.html'],
  ['stats','bar-chart','통계','stats.html'],['analysis','graph-up','분석','analysis.html'],
  ['notices','megaphone','공지','notices.html'],['admin','gear','관리','admin.html'],
];
let layoutReady = false;
let authUnsubscribe = null;
let billboardTimer = null;
let lastLayoutData = null;
let resizeBound = false;

export function showToast(message,type='info') {
  let stack=document.querySelector('.toast-stack');
  if(!stack){stack=document.createElement('div');stack.className='toast-stack';document.body.append(stack);}
  const toast=document.createElement('div');toast.className=`app-toast ${type}`;toast.textContent=String(message);
  stack.append(toast);window.setTimeout(()=>toast.remove(),2800);
}
window.showToast=showToast;
window.markStatsChanged=markStatsChanged;

function renderShell() {
  document.title=`${APP_TITLE} - ${document.body.dataset.pageTitle||'BBC'}`;
  if(!document.querySelector('.app-nav')){
    const header=document.createElement('header');header.className='app-nav';
    header.innerHTML='<div class="nav-inner"><a class="brand" href="index.html"><span class="brand-mark">🏸</span><span>BBC</span></a><button class="nav-toggle" type="button" aria-label="메뉴 열기" aria-expanded="false"><i class="bi bi-list"></i></button><nav class="nav-links" aria-label="주 메뉴"></nav><div class="nav-controls"><span class="admin-chip" hidden>👑 관리자 모드</span><select class="grade-select" aria-label="급수 선택"><option value="all">전체 급수</option><option value="S조">👑 S조 · 최상급</option><option value="A조">💎 A조</option><option value="B조">🥇 B조</option><option value="C조">🥈 C조</option><option value="D조">🥉 D조</option><option value="초심">🌱 초심</option></select><select class="season-select" aria-label="시즌 선택"><option value="all">전체(역대)</option></select><button class="nav-action theme-toggle" type="button" aria-label="테마 변경"><i class="bi bi-sun-fill"></i></button><button class="nav-action signout" type="button" aria-label="로그아웃"><i class="bi bi-box-arrow-right"></i></button></div></div>';
    document.body.prepend(header);
  }
  if(!document.querySelector('.app-footer')){const footer=document.createElement('footer');footer.className='app-footer';footer.textContent='BBC · Bulgwang Badminton Club';document.body.append(footer);}
  if(!document.querySelector('.toast-stack')){const stack=document.createElement('div');stack.className='toast-stack';document.body.append(stack);}
}

function setTheme(theme) {
  const normalized=theme==='light'?'light':'dark';
  document.documentElement.classList.toggle('theme-light',normalized==='light');
  document.documentElement.classList.toggle('theme-dark',normalized==='dark');
  localStorage.setItem('theme',normalized);
  const icon=document.querySelector('.theme-toggle i');
  if(icon)icon.className=`bi ${normalized==='dark'?'bi-sun-fill':'bi-moon-stars-fill'}`;
}

async function fillSelectors({admin=false}={}) {
  const nav=document.querySelector('.nav-links');const page=document.body.dataset.page||'dashboard';
  nav.innerHTML=links.filter(([, , ,href])=>href!=='admin.html'||admin).map(([key,icon,label,href])=>`<a class="nav-link ${page===key?'active':''}" href="${href}"${page===key?' aria-current="page"':''}><i class="bi bi-${icon}"></i><span>${label}</span></a>`).join('');
  const data=await loadAll();
  lastLayoutData=data;
  const gradeSelect=document.querySelector('.grade-select');
  localStorage.removeItem('currentLeague');let storedGrade=localStorage.getItem('currentGrade')||'all';if(![...gradeSelect.options].some((option)=>option.value===storedGrade))storedGrade='all';gradeSelect.value=storedGrade;
  localStorage.setItem('currentGrade',storedGrade);
  enhanceGradeSelect(gradeSelect);
  gradeSelect.dispatchEvent(new Event('change'));
  gradeSelect.onchange=()=>{localStorage.setItem('currentGrade',gradeSelect.value);window.dispatchEvent(new CustomEvent('gradeChanged',{detail:{grade:gradeSelect.value}}));};
  const seasons=[...data.seasons].sort((a,b)=>b.start_date.localeCompare(a.start_date));
  const seasonSelect=document.querySelector('.season-select');
  const todayText=today();
  const current=seasons.find((season)=>season.start_date<=todayText&&season.end_date>=todayText);
  let storedSeason=localStorage.getItem('currentSeason');
  if(storedSeason===null){storedSeason=current?String(current.id):'all';localStorage.setItem('currentSeason',storedSeason);}
  seasonSelect.innerHTML='<option value="all">전체(역대)</option>'+seasons.map((season)=>`<option value="${escapeHtml(season.id)}">${escapeHtml(season.name)}</option>`).join('');
  seasonSelect.value=seasons.some((row)=>String(row.id)===storedSeason)?storedSeason:'all';
  seasonSelect.onchange=()=>{localStorage.setItem('currentSeason',seasonSelect.value);const selected=seasons.find((row)=>String(row.id)===seasonSelect.value);document.body.className=document.body.className.replace(/\bseason-\w+/g,'').trim();if(selected)document.body.classList.add(`season-${selected.kind}`);updateKingZone(data,selected);window.dispatchEvent(new CustomEvent('seasonChanged',{detail:{seasonId:seasonSelect.value}}));};
  seasonSelect.dispatchEvent(new Event('change'));
  updateKingZone(data,seasons.find((row)=>String(row.id)===seasonSelect.value));
  if(!resizeBound){window.addEventListener('resize',()=>{const selected=seasons.find((row)=>String(row.id)===seasonSelect.value);updateKingZone(lastLayoutData,selected);});resizeBound=true;}
}

function updateKingZone(data,season) {
  clearInterval(billboardTimer);
  document.querySelector('#king-zone')?.remove();
  if(!season||season.kind!=='winter'||!matchMedia('(min-width: 1400px)').matches){document.querySelector('#winter-scene')?.remove();delete window.kingBillboard;return;}
  const filtered=filterBy({grade:localStorage.getItem('currentGrade')||'all',seasonId:season.id},data);
  const todayHighlights=dashboardStats(filtered).today_highlights;
  const point=todayHighlights?.bbc_points?.[0];
  const seasons=data.seasons||[];
  const weekly=periodHighlight(data,'week',Math.max(1,(periodHighlight(data,'week',1,season).available_weeks||[])[1]||1),season).highlights.mvp?.[0];
  const monthly=periodHighlight(data,'month',Math.max(1,(periodHighlight(data,'month',1,season).available_months||[])[1]||1),season).highlights.mvp?.[0];
  const billboard=document.createElement('div');billboard.id='king-zone';billboard.innerHTML=`<aside class="king-side king-left"><div class="king-led">👑 KING ZONE <i></i></div><div class="king-display"><img src="assets/img/king-left.svg" alt="King Zone 겨울 이미지"><div class="king-copy"><strong>👑 KING OF KINGS</strong><span>이번 시즌 왕좌의 주인은</span></div><div class="king-copy"><strong>❄️ WINTER SEASON</strong><span>${escapeHtml(season.year)} 동계 시즌 하이라이트</span></div><div class="king-copy"><strong>🏸 BBC LEAGUE</strong><span>승부는 기록으로 남는다</span></div></div><div class="king-plaque">KING OF KINGS</div><div class="king-dots" data-side="left"></div></aside><aside class="king-side king-right"><div class="king-led">👑 KING ZONE <i></i></div><div class="king-display"><img src="assets/img/king-right.svg" alt="BBC 시즌 하이라이트"><div class="king-copy king-live" data-live="today"><strong>🌟 TODAY'S HIGHLIGHT</strong><span>${escapeHtml(point?.member_name||'오늘 경기 준비 중')}</span><small>${point?`Today's BBC ${point.bbc_point}P · 승${point.won} 패${point.lost}`:'오늘 경기 준비 중'}</small></div><div class="king-copy king-live" data-live="week"><strong>🏆 WEEKLY MVP</strong><span>${escapeHtml(weekly?.member_name||'이번 주 최고 보정승률')}</span><small>${weekly?`주간 MVP · 보정승률 ${weekly.adj_win_rate}% · ${weekly.total_games}경기 · ${weekly.total_games?'시즌 기록':''}`:'이번 주 최고 보정승률'}</small></div><div class="king-copy king-live" data-live="month"><strong>🏆 MONTHLY MVP</strong><span>${escapeHtml(monthly?.member_name||'이번 달 최고 보정승률')}</span><small>${monthly?`월간 MVP · 보정승률 ${monthly.adj_win_rate}% · ${monthly.total_games}경기`:'이번 달 최고 보정승률'}</small></div></div><div class="king-plaque">SEASON LIVE</div><div class="king-dots" data-side="right"></div></aside>`;
  document.body.append(billboard);
  if(!document.querySelector('#winter-scene')){const scene=document.createElement('div');scene.id='winter-scene';scene.setAttribute('aria-hidden','true');scene.innerHTML='<span></span><span></span><span></span>';document.body.prepend(scene);}
  let active=0;const sides=['left','right'];
  for(const side of sides){const dots=billboard.querySelector(`[data-side="${side}"]`);dots.innerHTML=[0,1,2].map((index)=>`<button type="button" aria-label="슬라이드 ${index+1}" data-slide="${index}" class="${index===0?'active':''}"></button>`).join('');dots.querySelectorAll('button').forEach((button)=>button.addEventListener('click',()=>show(Number(button.dataset.slide))));}
  const show=(index)=>{active=index%3;billboard.querySelectorAll('.king-copy').forEach((copy)=>copy.classList.remove('active'));billboard.querySelectorAll('.king-copy').forEach((copy,index)=>{if(index%3===active)copy.classList.add('active');});billboard.querySelectorAll('.king-dots button').forEach((dot)=>dot.classList.toggle('active',Number(dot.dataset.slide)===active));};
  billboard.querySelectorAll('.king-live').forEach((node,index)=>{if(index===0)node.classList.add('active');});show(0);
  const start=()=>{clearInterval(billboardTimer);billboardTimer=setInterval(()=>show((active+1)%3),5000);};
  billboard.addEventListener('mouseenter',()=>clearInterval(billboardTimer));billboard.addEventListener('mouseleave',start);start();
  window.kingBillboard={setToday:(names,sub)=>setLive('today',names,sub),setMvp:(period,names,sub)=>setLive(period,names,sub)};
  function setLive(period,names,sub){const node=billboard.querySelector(`[data-live="${period}"]`);if(!node)return;node.querySelector('span').textContent=Array.isArray(names)?names.join(', '):String(names??'');node.querySelector('small').textContent=String(sub??'');node.querySelector('span').classList.toggle('small-name',String(names??'').length>8);}
}

function bindNav() {
  const nav=document.querySelector('.app-nav');const toggle=nav.querySelector('.nav-toggle');
  toggle.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));});
  nav.querySelector('.theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.classList.contains('theme-light')?'dark':'light'));
  nav.querySelector('.signout').addEventListener('click',async()=>{try{await signOut();}catch{showToast('로그아웃하지 못했습니다.','danger');}});
}

async function showLatestPopup() {
  const dismissedKeyPrefix='popup_dismissed_';
  const grade=localStorage.getItem('currentGrade')||'all';
  const notices=await fetchAll('notices',{orderBy:'created_at',ascending:false});
  const notice=notices.find((row)=>row.is_popup&&(row.grade==null||grade==='all'||row.grade===grade)&&localStorage.getItem(`${dismissedKeyPrefix}${row.id}`)!==today());
  if(!notice)return;
  const backdrop=document.createElement('div');backdrop.className='auth-modal-backdrop notice-popup-backdrop';
  const sanitized=window.DOMPurify?window.DOMPurify.sanitize(notice.content):escapeHtml(notice.content).replace(/\n/g,'<br>');
  const dialog=document.createElement('section');dialog.className='notice-popup';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
  dialog.innerHTML=`<div class="notice-popup-head">공지사항</div><div class="notice-popup-body"><h2>${escapeHtml(notice.title)}</h2><time>${escapeHtml(dateWithWeekday(notice.created_at))}</time><div class="notice-popup-content">${sanitized}</div><label><input type="checkbox" class="dismiss-today"> 오늘 그만 보기</label><div class="notice-popup-actions"><a href="notice.html?id=${encodeURIComponent(notice.id)}">자세히 보기</a><button type="button" class="btn btn-primary popup-close">닫기</button></div></div>`;
  backdrop.append(dialog);document.body.append(backdrop);
  const close=()=>{if(dialog.querySelector('.dismiss-today').checked)localStorage.setItem(`${dismissedKeyPrefix}${notice.id}`,today());backdrop.remove();};
  dialog.querySelector('.popup-close').addEventListener('click',close);
  dialog.querySelector('a').addEventListener('click',close);
  backdrop.addEventListener('click',(event)=>{if(event.target===backdrop)close();});
}

async function syncSession(session) {
  document.querySelector('.auth-overlay')?.remove();
  if(!session){mountLoginOverlay({onLogin:()=>initLayout()});return;}
  try {
    const admin=await isAdmin(true);
    document.querySelector('.admin-chip').hidden=!admin;
    await fillSelectors({admin});
    if(admin){
      let button=document.querySelector('.admin-exit');
      if(!button){button=document.createElement('button');button.type='button';button.className='admin-exit nav-action';button.textContent='모드 종료';document.querySelector('.nav-controls').prepend(button);}
      button.hidden=false;button.onclick=async()=>{await signOut();};
    }else document.querySelector('.admin-exit')?.remove();
    if(!layoutReady){layoutReady=true;window.setTimeout(()=>showLatestPopup().catch(()=>{}),800);}
  } catch(error) {
    showToast(error.message||'데이터를 불러오지 못했습니다.','danger');
  }
}

export async function initLayout() {
  renderShell();bindNav();setTheme(localStorage.getItem('theme')||'dark');
  const configured=Boolean(SUPABASE_URL&&SUPABASE_PUBLISHABLE_KEY);
  window.BBC_CONFIG_READY=configured;
  if(!configured){showToast('Supabase URL과 Publishable key를 assets/js/config.js에 설정하세요.','warning');return;}
  if(!authUnsubscribe)authUnsubscribe=onAuthChanged((session)=>{syncSession(session).catch((error)=>showToast(error.message,'danger'));});
  try{await syncSession(await getSession());}catch(error){showToast(error.message||'Supabase 연결에 실패했습니다.','danger');}
}

export { dateWithWeekday };
