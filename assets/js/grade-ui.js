const gradeFiles = Object.freeze({ 'S조':'s.svg', 'A조':'a.svg', 'B조':'b.svg', 'C조':'c.svg', 'D조':'d.svg', '초심':'beginner.svg' });
let openPicker = null;
let outsideListenerReady = false;
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

export function gradeImageMarkup(grade, className='grade-image') {
  const file=gradeFiles[grade]||gradeFiles['초심'];
  const label=gradeFiles[grade]?grade:'초심';
  return `<img class="${className}" src="assets/img/grades/${file}" alt="${escapeHtml(label)}" title="${escapeHtml(label)}">`;
}

export function enhanceGradeSelect(select) {
  if(!select||select.dataset.gradeEnhanced==='true')return;
  select.dataset.gradeEnhanced='true';
  const picker=document.createElement('div');picker.className='grade-picker';
  const button=document.createElement('button');button.type='button';button.className='grade-picker-trigger';button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');
  const menu=document.createElement('div');menu.className='grade-picker-menu';menu.setAttribute('role','listbox');menu.hidden=true;
  const optionButtons=[];
  for(const option of select.options){
    const item=document.createElement('button');item.type='button';item.className='grade-picker-option';item.setAttribute('role','option');item.setAttribute('aria-label',option.textContent.trim());item.dataset.value=option.value;
    if(gradeFiles[option.value])item.innerHTML=gradeImageMarkup(option.value,'grade-picker-image');else item.innerHTML=`<span class="grade-picker-all">${escapeHtml(option.textContent.trim())}</span>`;
    item.addEventListener('click',()=>{select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));close();button.focus();});
    menu.append(item);optionButtons.push([item,option]);
  }
  function refresh(){const option=select.selectedOptions[0];if(!option)return;button.innerHTML=gradeFiles[option.value]?gradeImageMarkup(option.value,'grade-picker-image'):`<span class="grade-picker-all">${escapeHtml(option.textContent.trim())}</span>`;button.setAttribute('aria-label',option.textContent.trim());for(const [item,row] of optionButtons){const selected=row.value===select.value;item.setAttribute('aria-selected',String(selected));item.classList.toggle('is-selected',selected);}}
  function open(){menu.hidden=false;button.setAttribute('aria-expanded','true');}
  function close(){menu.hidden=true;button.setAttribute('aria-expanded','false');}
  button.addEventListener('click',()=>menu.hidden?open():close());
  button.addEventListener('keydown',(event)=>{if(event.key==='ArrowDown'){event.preventDefault();open();optionButtons[0]?.[0].focus();}});
  menu.addEventListener('keydown',(event)=>{if(event.key==='Escape'){close();button.focus();}if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const buttons=optionButtons.map(([item])=>item);const index=buttons.indexOf(document.activeElement);buttons[(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}});
  if(!outsideListenerReady){document.addEventListener('click',(event)=>{if(openPicker&&!openPicker.contains(event.target))openPicker.__close();});outsideListenerReady=true;}
  select.addEventListener('change',refresh);
  picker.append(button,menu);select.after(picker);select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');refresh();
}
