import { callRpc, insertMember, loadAll, updateMember } from '../data.js';
import { ensureAdmin, isAdmin, promptAdminLogin } from '../auth.js';
import { dateWithWeekday, escapeHtml, today } from '../util.js';
import { enhanceGradeSelect, gradeImageMarkup } from '../grade-ui.js';

const form=document.querySelector('#member-form');
const modal=bootstrap.Modal.getOrCreateInstance(document.querySelector('#member-modal'));
let members=[];
let admin=false;
const safe=escapeHtml;
enhanceGradeSelect(form.elements.grade);


function visibleMembers() {
  const query=document.querySelector('#member-search').value.trim().toLocaleLowerCase('ko');
  return members.filter((member)=>member.is_active!==false).filter((member)=>`${member.name} ${member.nickname||''}`.toLocaleLowerCase('ko').includes(query));
}

function draw() {
  const rows=visibleMembers();
  document.querySelector('#member-count').textContent=`멤버 ${members.filter((member)=>member.is_active!==false).length}명`;
  document.querySelector('#member-rows').innerHTML=rows.length?rows.map((member)=>`<tr>
    <td><strong>${safe(member.name)}</strong>${member.is_admin?' 👑':''}${member.is_guest?' <span class="badge-muted">게스트</span>':''}</td>
    <td>${safe(member.nickname||'—')}</td><td>${gradeImageMarkup(member.grade||'초심')}</td>
    <td>${safe(dateWithWeekday(member.joined_at))}</td><td><div class="member-actions">
      <button class="btn btn-sm btn-outline-secondary" data-edit="${safe(member.id)}" type="button">수정</button>
      ${admin?`<button class="btn btn-sm btn-outline-danger" data-deactivate="${safe(member.id)}" type="button">삭제</button>`:''}
    </div></td></tr>`).join(''):'<tr><td colspan="5" class="empty-state">등록된 멤버가 없습니다.</td></tr>';
  document.querySelectorAll('[data-edit]').forEach((button)=>button.addEventListener('click',()=>openEdit(button.dataset.edit)));
  document.querySelectorAll('[data-deactivate]').forEach((button)=>button.addEventListener('click',()=>deactivate(button.dataset.deactivate)));
}

async function refresh() {
  const data=await loadAll({force:true});
  members=data.members;
  admin=await isAdmin();
  document.querySelector('#member-admin-option').hidden=!admin;
  draw();
}

function openAdd() {
  form.reset();
  form.elements.id.value='';
  form.elements.joined_at.value=today();
  form.elements.grade.value='초심';
  form.elements.grade.dispatchEvent(new Event('change'));
  document.querySelector('#member-modal-title').textContent='멤버 추가';
  document.querySelector('#member-submit').textContent='추가';
  document.querySelector('#member-admin-option').hidden=true;
  modal.show();
}

function openEdit(id) {
  const member=members.find((row)=>String(row.id)===String(id));
  if(!member)return;
  form.elements.id.value=member.id;
  form.elements.name.value=member.name;
  form.elements.nickname.value=member.nickname||'';
  form.elements.grade.value=member.grade||'초심';
  form.elements.grade.dispatchEvent(new Event('change'));
  form.elements.joined_at.value=member.joined_at||today();
  form.elements.is_admin.checked=Boolean(member.is_admin);
  form.elements.is_guest.checked=Boolean(member.is_guest);
  document.querySelector('#member-admin-option').hidden=!admin;
  document.querySelector('#member-modal-title').textContent='멤버 수정';
  document.querySelector('#member-submit').textContent='저장';
  modal.show();
}

async function saveMember(event) {
  event.preventDefault();
  const values=new FormData(form);
  const id=values.get('id');
  const payload={
    name:String(values.get('name')||'').trim(),
    nickname:String(values.get('nickname')||'').trim()||null,
    grade:String(values.get('grade')||'초심'),
    joined_at:String(values.get('joined_at')||today()),
    is_guest:form.elements.is_guest.checked,
  };
  if(admin)payload.is_admin=form.elements.is_admin.checked;
  const submit=document.querySelector('#member-submit');
  submit.disabled=true;
  try {
    if(id)await updateMember(id,payload);else await insertMember(payload);
    modal.hide();
    window.showToast?.(id?'멤버 정보를 저장했습니다.':'멤버를 추가했습니다.','success');
    await refresh();
  } catch(error) {
    window.showToast?.(error.message||'저장하지 못했습니다.','danger');
  } finally {submit.disabled=false;}
}

async function deactivate(id) {
  const member=members.find((row)=>String(row.id)===String(id));
  if(!member)return;
  if(!window.confirm(`${member.name}을(를) 삭제하시겠습니까?\n멤버가 비활성화되며, 기존 경기 데이터는 그대로 유지됩니다.`))return;
  const verified=await promptAdminLogin();
  if(!verified)return;
  try {
    await ensureAdmin();
    await callRpc('deactivate_member',{p_id:Number(id)});
    window.showToast?.('멤버를 비활성화했습니다.','success');
    await refresh();
  } catch(error) {window.showToast?.(error.message||'멤버를 비활성화하지 못했습니다.','danger');}
}

document.querySelector('#add-member').addEventListener('click',openAdd);
document.querySelector('#member-search').addEventListener('input',draw);
form.addEventListener('submit',saveMember);
refresh().catch((error)=>window.showToast?.(error.message||'멤버를 불러오지 못했습니다.','danger'));
