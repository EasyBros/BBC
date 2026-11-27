import { callRpc, loadAll } from '../data.js';
import { attendeeEmoji, makePairings } from '../pairing.js';
import { copyToClipboard, dateWithWeekday, escapeHtml, today } from '../util.js';

const root=document.querySelector('#match-placeholder');const safe=escapeHtml;
let data;let sessionId=null;let selected=new Set();let attendanceOrder=[];let saveTimer=null;let currentDate=today();let pairingResult=null;
const activeMembers=()=>data.members.filter((member)=>member.is_active!==false);
const display=(member)=>member.nickname?`${member.name} (${member.nickname})`:member.name;

function draw(){
 const readonly=currentDate<today();
 root.innerHTML=`<div class="match-date-row"><label>날짜 선택<input id="attendance-date" class="form-control" type="date" value="${safe(currentDate)}" max="${today()}"></label><span id="save-state"></span></div>
 <section class="match-block"><div class="match-heading"><div><h2>출석부</h2><p>${readonly?'과거 출석부는 조회만 가능합니다.':'오늘 출석하는 멤버를 선택하세요.'}</p></div><div class="match-actions"><button class="btn btn-outline-secondary" id="select-all" ${readonly?'disabled':''}>전체 선택</button><button class="btn btn-outline-secondary" id="select-none" ${readonly?'disabled':''}>전체 해제</button></div></div><p id="attendance-count"></p><div class="attendance-grid" id="attendance-list"></div></section>
 <section class="match-block"><div class="match-heading"><h2 id="attendee-heading">오늘 출석자</h2><button class="btn btn-outline-secondary" id="copy-attendance">📋 복사</button></div><div id="attendee-tags" class="attendee-tags"></div></section>
 <section class="match-block pairing-block"><div class="match-heading"><div><h2>짝배</h2><p>출석자를 무작위로 섞어 코트별 경기를 구성합니다.</p></div></div><div class="pairing-controls"><label>코트 수<input class="form-control" id="court-count" type="number" min="1" max="20" value="2"></label><button class="btn btn-primary" id="start-pairing">짝배 시작!</button></div><div id="pairing-output"></div></section>`;
 document.querySelector('#attendance-date').addEventListener('change',(event)=>{currentDate=event.target.value||today();loadDate().then(draw).catch((error)=>toast(error.message,'danger'));});
 document.querySelector('#select-all').addEventListener('click',()=>{selected=new Set(activeMembers().map((member)=>member.id));renderAttendance();renderAttendees();scheduleSave();});
 document.querySelector('#select-none').addEventListener('click',()=>{selected.clear();renderAttendance();renderAttendees();scheduleSave();});
 document.querySelector('#copy-attendance').addEventListener('click',copyAttendance);
 document.querySelector('#start-pairing').addEventListener('click',startPairing);
 renderAttendance();renderAttendees();
}

async function loadDate(){
 let session=data.sessions.find((row)=>row.date===currentDate);
 if(!session&&currentDate===today()){
   session=await callRpc('ensure_session',{p_date:currentDate});
   data=await loadAll({force:true});session=data.sessions.find((row)=>row.date===currentDate)||session;
 }
 sessionId=session?.id??null;
 const rows=sessionId?data.attendance.filter((row)=>row.session_id===sessionId).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))):[];
 selected=new Set(rows.map((row)=>row.member_id));attendanceOrder=rows.map((row)=>row.member_id);
}

function renderAttendance(){
 const readonly=currentDate<today();
 const root=document.querySelector('#attendance-list');
 root.innerHTML=activeMembers().map((member)=>{const on=selected.has(member.id);return `<button type="button" class="attendance-card ${on?'is-selected':''}" data-member="${safe(member.id)}" ${readonly?'disabled':''}><span class="attendance-name">${safe(display(member))}</span>${on?'<span class="attendance-check">🏸 출석 ✓</span>':''}</button>`;}).join('')||'<div class="empty-state">등록된 멤버가 없습니다.</div>';
 root.querySelectorAll('[data-member]').forEach((button)=>button.addEventListener('click',()=>{const id=Number(button.dataset.member);if(selected.has(id)){selected.delete(id);attendanceOrder=attendanceOrder.filter((item)=>item!==id);}else{selected.add(id);attendanceOrder.push(id);}renderAttendance();renderAttendees();scheduleSave();}));
 document.querySelector('#attendance-count').textContent=`${selected.size}명 출석`;
}

function renderAttendees(){
 const ordered=attendanceOrder.filter((id)=>selected.has(id)).concat([...selected].filter((id)=>!attendanceOrder.includes(id)));
 const names=ordered.map((id)=>activeMembers().find((member)=>member.id===id)).filter(Boolean);
 document.querySelector('#attendee-heading').textContent=`오늘 출석자 (${names.length}명)`;
 document.querySelector('#attendee-tags').innerHTML=names.map((member)=>`<span class="attendee-tag">${attendeeEmoji(member.id)} ${safe(display(member))}</span>`).join('')||'<span class="text-muted">출석자가 없습니다.</span>';
}

function scheduleSave(){
 if(currentDate<today()||!sessionId)return;
 clearTimeout(saveTimer);const state=document.querySelector('#save-state');state.textContent='저장 대기';
 saveTimer=setTimeout(async()=>{state.textContent='저장 중...';try{const result=await callRpc('set_attendance',{p_session_id:Number(sessionId),p_member_ids:[...selected].map(Number)});state.textContent='저장됨';if(result){const date=new Date(result);state.textContent=`저장됨 · ${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'}).format(date)}`;}setTimeout(()=>{state.textContent='';},2000);data=await loadAll({force:true});}catch(error){state.textContent='저장 실패';toast(error.message||'출석을 저장하지 못했습니다.','danger');}},1000);
}

function attendanceCopy(){
 const ordered=attendanceOrder.filter((id)=>selected.has(id)).concat([...selected].filter((id)=>!attendanceOrder.includes(id)));
 const names=ordered.map((id)=>activeMembers().find((member)=>member.id===id)).filter(Boolean);
 const finalTime=attendanceOrder.length?new Date(data.attendance.filter((row)=>row.session_id===sessionId).reduce((latest,row)=>row.created_at>latest?row.created_at:latest,'')||Date.now()):new Date();
 const time=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'}).format(finalTime);
 return `🏸오늘 출석자 (${names.length}명)\n━━━━━━━━━━━━━━━━━━\n${names.map((member)=>`${attendeeEmoji(member.id)} ${display(member)}`).join('\n')}\n━━━━━━━━━━━━━━━━━━\n⏰ 최종 입력 시간 : ${time}\n🔗 출석부 링크: ${location.origin}${location.pathname.replace(/[^/]*$/,'')}match.html`;
}
async function copyAttendance(){try{await copyToClipboard(attendanceCopy());toast('출석 명단을 복사했습니다.','success');}catch(error){toast(error.message,'danger');}}

function startPairing(){
 const count=Number(document.querySelector('#court-count').value);
 const players=attendanceOrder.filter((id)=>selected.has(id)).concat([...selected].filter((id)=>!attendanceOrder.includes(id))).map((id)=>activeMembers().find((member)=>member.id===id)).filter(Boolean);
 try{pairingResult=makePairings(players,count);renderPairing();}catch(error){toast(error.message,'warning');}
}
function renderPairing(){
 const host=document.querySelector('#pairing-output');if(!pairingResult)return;
 host.innerHTML=`<div class="pairing-result-heading"><h3>짝배 결과 (${pairingResult.total_games}경기)</h3><div><button class="btn btn-outline-secondary" id="copy-pairing">📋 복사</button> <button class="btn btn-outline-secondary" id="reshuffle">다시 섞기</button></div></div>${pairingResult.rounds.map((round)=>`<section class="pairing-round"><h4>${round.number}라운드 <span>${round.number===1?'':`동시 진행 ${round.matches.length}경기`}</span></h4><div class="pairing-grid">${round.matches.map((game)=>`<article class="pairing-card"><div class="pairing-code">코드 ${safe(game.code)} · 코트 ${game.court}</div><p>A팀: ${safe(display(game.team_a[0]))} / ${safe(display(game.team_a[1]))}</p><strong>VS</strong><p>B팀: ${safe(display(game.team_b[0]))} / ${safe(display(game.team_b[1]))}</p></article>`).join('')}</div></section>`).join('')}${pairingResult.waiting.length?`<div class="waiting-box">⏳ 대기: ${pairingResult.waiting.map((member)=>safe(display(member))).join(', ')}</div>`:''}`;
 document.querySelector('#reshuffle').addEventListener('click',startPairing);document.querySelector('#copy-pairing').addEventListener('click',copyPairing);
}
function pairingCopy(){return `🏸 짝배 결과\n━━━━━━━━━━━━━━━━━━\n${pairingResult.rounds.map((round)=>`【${round.number}라운드】 (${round.matches.length}경기 동시 진행)\n${round.matches.map((game)=>`[코드 ${game.code}] 코트 ${game.court}\n  A팀: ${display(game.team_a[0])} / ${display(game.team_a[1])}\n  B팀: ${display(game.team_b[0])} / ${display(game.team_b[1])}`).join('\n')}`).join('\n')}\n${pairingResult.waiting.length?`⏳ 대기: ${pairingResult.waiting.map(display).join(', ')}\n`:''}━━━━━━━━━━━━━━━━━━`;}
async function copyPairing(){try{await copyToClipboard(pairingCopy());toast('짝배 결과를 복사했습니다.','success');}catch(error){toast(error.message,'danger');}}
function toast(message,type){window.showToast?.(message,type);}

async function boot(){data=await loadAll({force:true});await loadDate();draw();}
boot().catch((error)=>toast(error.message||'출석부를 불러오지 못했습니다.','danger'));
