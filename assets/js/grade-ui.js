const gradeIcons = Object.freeze({ 'S조':'👑', 'A조':'💎', 'B조':'🥇', 'C조':'🥈', 'D조':'🥉', '초심':'🌱' });
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

export function gradeEmoji(grade) {
  return gradeIcons[grade] || gradeIcons['초심'];
}

export function gradeImageMarkup(grade, className='grade-emoji') {
  const label=gradeIcons[grade]?grade:'초심';
  return `<span class="${className}" title="${escapeHtml(label)}">${gradeEmoji(label)} ${escapeHtml(label)}</span>`;
}
