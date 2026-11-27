export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

export function today(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date);
}

export function dateWithWeekday(value) {
  if (!value) return '';
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const weekday = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'short' }).format(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} (${weekday})`;
}

export async function copyToClipboard(text) {
  const value = String(text ?? '');
  if (navigator.clipboard && window.isSecureContext) {
    try { await navigator.clipboard.writeText(value); return true; } catch { /* use fallback */ }
  }
  const node = document.createElement('textarea');
  node.value = value;
  node.setAttribute('readonly', '');
  node.style.cssText = 'position:fixed;opacity:0;left:-9999px';
  document.body.append(node);
  node.select();
  const copied = document.execCommand('copy');
  node.remove();
  if (!copied) throw new Error('클립보드에 복사하지 못했습니다.');
  return true;
}

export function progressBar(value, { max = 100, label = '', color = '' } = {}) {
  const number = Number(value);
  const width = Number.isFinite(number) && max > 0 ? Math.max(0, Math.min(100, number / max * 100)) : 0;
  const visibleLabel = escapeHtml(label || `${number || 0}%`);
  const styles = [`width:${width.toFixed(1)}%`];
  if (color) styles.push(`--bar-color:${escapeHtml(color)}`);
  return `<div class="progress-wrap" aria-label="${visibleLabel}"><div class="progress-track"><span class="progress-fill" style="${styles.join(';')}"></span></div><span class="progress-label">${visibleLabel}</span></div>`;
}

export function hearts(count, max = 5) {
  const active = Math.max(0, Math.min(max, Math.round(Number(count) || 0)));
  return `<span class="hearts" aria-label="하트 ${active}개">${'❤️'.repeat(active)}<span class="heart-muted">${'❤️'.repeat(max - active)}</span></span>`;
}

export function formatNumber(value) { return new Intl.NumberFormat('ko-KR').format(Number(value) || 0); }
export function formatPercent(value, digits = 1) {
  const number = Number(value);
  return `${(Number.isFinite(number) ? number : 0).toFixed(digits)}%`;
}
