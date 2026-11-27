import { isAdmin } from '../auth.js';
import { getSupabase } from '../supabase.js';
import { escapeHtml } from '../util.js';

const host=document.querySelector('#notice-detail');const id=new URLSearchParams(location.search).get('id');const safe=escapeHtml;
async function boot(){if(!id){host.innerHTML='<div class="empty-state">공지사항을 찾을 수 없습니다.</div>';return;}const{data:notice,error}=await getSupabase().from('notices').select('*').eq('id',Number(id)).maybeSingle();if(error)throw error;if(!notice){host.innerHTML='<div class="empty-state">공지사항을 찾을 수 없습니다.</div>';return;}document.title=`BBC - ${notice.title}`;const admin=await isAdmin();const content=window.DOMPurify?window.DOMPurify.sanitize(notice.content):safe(notice.content);host.innerHTML=`<a class="notice-back" href="notices.html">← 공지사항</a><header class="notice-detail-head"><div>${notice.is_pinned?'📌 고정 ':''}${notice.is_popup?'🔔 팝업':''}</div><h1>${safe(notice.title)}</h1><p>${safe(new Date(notice.created_at).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}))} · ${safe(notice.author||'BBC')}</p></header><article class="notice-content">${content}</article>${admin?`<a class="btn btn-outline-secondary" href="notices.html?edit=${encodeURIComponent(notice.id)}">공지 수정</a>`:''}`;}
boot().catch((error)=>window.showToast?.(error.message||'공지사항을 불러오지 못했습니다.','danger'));
