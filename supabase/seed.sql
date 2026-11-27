-- Optional synthetic demo data. Run only on an empty/demo project.
-- Names and match records are fictional. A session can be created for each weekday.
do $$
declare
 names text[] := array['김민준','이서연','박지훈','최유진','정도윤','한예준','오지호','윤서준','장하준','임지민','신도현','조은우','서하늘','권민서','황지우','안수빈','송재윤','류예린','홍태양','문가온','배지안','백시우','남현우','차다은'];
 ids bigint[] := '{}'; i int; d date; sid bigint; gid bigint; p bigint[]; a_score int; b_score int;
begin
 if exists(select 1 from public.members) then raise notice 'Seed skipped: members already exist.'; return; end if;
 for i in 1..array_length(names,1) loop
  insert into public.members(name,nickname,league,joined_at,is_guest,is_admin)
  values(names[i],case when i in (2,5,9,13,18) then '콕'||i else null end,case when i>12 then 2 else 1 end,current_date - (220-(i*4)),i in (23,24),i=1)
  returning id into sid; ids:=array_append(ids,sid);
 end loop;
 insert into public.seasons(year,kind,name,start_date,end_date,is_active)
 values(extract(year from current_date)::int,'spring',extract(year from current_date)::int||' 춘계',make_date(extract(year from current_date)::int,3,1),make_date(extract(year from current_date)::int,5,31),false),
 (extract(year from current_date)::int,'summer',extract(year from current_date)::int||' 하계',make_date(extract(year from current_date)::int,6,1),make_date(extract(year from current_date)::int,8,31),false),
 (extract(year from current_date)::int,'autumn',extract(year from current_date)::int||' 추계',make_date(extract(year from current_date)::int,9,1),make_date(extract(year from current_date)::int,11,30),true)
 on conflict(year,kind) do nothing;
 for d in select x::date from generate_series(current_date-interval '90 days',current_date,interval '1 day') x where extract(isodow from x) between 1 and 5 order by x limit 40 loop
  insert into public.sessions(date,location) values(d,'불광 체육관') on conflict(date) do update set location=excluded.location returning id into sid;
  for i in 1..8 loop
   insert into public.attendance(session_id,member_id) values(sid,ids[1+floor(random()*24)::int]) on conflict do nothing;
  end loop;
  for i in 1..5 loop
   p:=array(select ids[1+floor(random()*24)::int] from generate_series(1,4));
   if (select count(distinct x) from unnest(p) x)=4 then
    a_score:=21+floor(random()*5)::int; b_score:=10+floor(random()*12)::int;
    if random()<0.5 then
     insert into public.games(session_id,team_a_name,team_b_name,team_a_score,team_b_score) values(sid,'A팀','B팀',a_score,b_score) returning id into gid;
    else
     insert into public.games(session_id,team_a_name,team_b_name,team_a_score,team_b_score) values(sid,'A팀','B팀',b_score,a_score) returning id into gid;
    end if;
    insert into public.game_players(game_id,member_id,team) select gid,p[x],'A' from generate_series(1,2) x;
    insert into public.game_players(game_id,member_id,team) select gid,p[x],'B' from generate_series(3,4) x;
   end if;
  end loop;
 end loop;
end $$;
