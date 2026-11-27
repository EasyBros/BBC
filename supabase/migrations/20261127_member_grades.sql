-- Replace divisions with member and notice grades. Existing members start at 초심 and
-- can be assigned their actual grade in the member editor.
alter table public.members add column if not exists grade text not null default '초심';
alter table public.members drop column if exists league;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='members_grade_allowed' and conrelid='public.members'::regclass) then
    alter table public.members add constraint members_grade_allowed check (grade in ('초심','D조','C조','B조','A조','S조'));
  end if;
end $$;
alter table public.notices add column if not exists grade text;
alter table public.notices drop column if exists league;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='notices_grade_allowed' and conrelid='public.notices'::regclass) then
    alter table public.notices add constraint notices_grade_allowed check (grade is null or grade in ('초심','D조','C조','B조','A조','S조'));
  end if;
end $$;
grant update(grade) on public.members to authenticated;
update public.settings set value='"❄️ Winter is coming! 12월 동계 시즌 개막 예정 🏸"'::jsonb
where key='season_teaser_text' and value::text ilike '%Winter is coming%Winter i%';
