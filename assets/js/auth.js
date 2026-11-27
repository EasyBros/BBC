import { ADMIN_EMAIL, CLUB_EMAIL } from './config.js';
import { getSupabase } from './supabase.js';

let adminUserId = null;
let adminResult = false;
let adminCheckedAt = 0;

export async function getSession() {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function isAdmin(force = false) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return false;
  if (!force && userId === adminUserId && Date.now() - adminCheckedAt < 30_000) return adminResult;
  const { data, error } = await getSupabase().from('app_admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  adminUserId = userId;
  adminResult = Boolean(data);
  adminCheckedAt = Date.now();
  return adminResult;
}

export async function signInClub(password) {
  const client = getSupabase();
  if (await getSession()) await client.auth.signOut();
  const { data, error } = await client.auth.signInWithPassword({ email: CLUB_EMAIL, password });
  if (error) throw error;
  adminUserId = null;
  window.dispatchEvent(new Event('bbc:auth-changed'));
  return data.session;
}

export async function signInAdmin(password) {
  const client = getSupabase();
  if (await getSession()) await client.auth.signOut();
  const { data, error } = await client.auth.signInWithPassword({ email: ADMIN_EMAIL, password });
  if (error) throw error;
  adminUserId = null;
  if (!(await isAdmin(true))) {
    await client.auth.signOut();
    throw new Error('관리자 계정이 app_admins에 등록되지 않았습니다.');
  }
  window.dispatchEvent(new Event('bbc:auth-changed'));
  return data.session;
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
  adminUserId = null;
  window.dispatchEvent(new Event('bbc:auth-changed'));
}

export function onAuthChanged(callback) {
  const client = getSupabase();
  const listener = () => getSession().then(callback).catch(() => callback(null));
  window.addEventListener('bbc:auth-changed', listener);
  const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
  return () => {
    window.removeEventListener('bbc:auth-changed', listener);
    data.subscription.unsubscribe();
  };
}

export async function ensureAuthenticated() {
  const session = await getSession();
  if (!session) throw new Error('로그인이 필요합니다.');
  return session;
}

export async function ensureAdmin() {
  await ensureAuthenticated();
  if (!(await isAdmin())) throw new Error('관리자 권한이 필요합니다.');
}

export function mountLoginOverlay({ onLogin } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'auth-overlay';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.innerHTML = '<form class="auth-card"><div class="auth-mark">🏸</div><h1>BBC</h1><p>불광 배드민턴 클럽</p><label for="club-password">동호회 비밀번호</label><input id="club-password" type="password" autocomplete="current-password" required><p class="auth-error" role="alert" hidden></p><button type="submit">입장</button></form>';
  const form = wrap.querySelector('form');
  const input = form.querySelector('input');
  const errorBox = form.querySelector('.auth-error');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    errorBox.hidden = true;
    try {
      await signInClub(input.value);
      wrap.remove();
      await onLogin?.();
    } catch {
      errorBox.textContent = '비밀번호가 올바르지 않습니다.';
      errorBox.hidden = false;
      input.select();
    } finally {
      button.disabled = false;
    }
  });
  document.body.append(wrap);
  input.focus();
  return wrap;
}

export function promptAdminLogin({ onSuccess } = {}) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'auth-modal-backdrop';
    backdrop.innerHTML = '<form class="auth-modal" role="dialog" aria-modal="true"><h2>관리자 인증</h2><p>관리자 기능을 사용하려면 비밀번호를 입력하세요.</p><label for="admin-password">관리자 비밀번호</label><input id="admin-password" type="password" autocomplete="current-password" required><p class="auth-error" role="alert" hidden></p><div class="auth-modal-actions"><button type="button" data-cancel>취소</button><button type="submit">인증</button></div></form>';
    const form = backdrop.querySelector('form');
    const close = (value) => { backdrop.remove(); resolve(value); };
    backdrop.querySelector('[data-cancel]').addEventListener('click', () => close(false));
    backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(false); });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorBox = form.querySelector('.auth-error');
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await signInAdmin(form.querySelector('input').value);
        await onSuccess?.();
        close(true);
      } catch {
        errorBox.textContent = '관리자 비밀번호를 확인해 주세요.';
        errorBox.hidden = false;
      } finally {
        button.disabled = false;
      }
    });
    document.body.append(backdrop);
    form.querySelector('input').focus();
  });
}
