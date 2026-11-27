const gradeFiles = Object.freeze({ 'S조':'s.svg', 'A조':'a.svg', 'B조':'b.svg', 'C조':'c.svg', 'D조':'d.svg', '초심':'beginner.svg' });
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

export function gradeImageMarkup(grade, className='grade-image') {
  const file=gradeFiles[grade]||gradeFiles['초심'];
  const label=gradeFiles[grade]?grade:'초심';
  return `<img class="${className}" src="assets/img/grades/${file}" alt="${escapeHtml(label)}" title="${escapeHtml(label)}">`;
}
