-- Flowtel v0.10.94 / Caddie Magic v0.8.0
-- Additive release. Historical rounds retain unknown length (NULL), not invented 18-hole labels.
begin;
alter table public.caddie_magic_round_logs add column holes_played integer check(holes_played in (9,18)), add column hole_scores integer[], add column round_complete boolean not null default true;
alter table public.caddie_magic_round_logs drop constraint if exists caddie_magic_round_logs_entry_type_check;
alter table public.caddie_magic_round_logs add constraint caddie_magic_round_logs_entry_type_check check((entry_type='round' and score is not null) or (entry_type='reflection' and nullif(btrim(swing_thoughts),'') is not null));
create function public.caddie_magic_validate_hole_scores() returns trigger language plpgsql set search_path=public as $$
declare v_total integer; v_count integer;
begin
 if new.entry_type='reflection' then
  if new.holes_played is not null or new.hole_scores is not null then raise exception 'Swing thoughts do not have hole scores'; end if; return new;
 end if;
 if new.hole_scores is null then
  if not new.round_complete then raise exception 'A partial round requires hole scores'; end if;return new;
 end if;
 if new.holes_played is null or array_length(new.hole_scores,1)<>new.holes_played or array_ndims(new.hole_scores)<>1 then raise exception 'Scores must match 9 or 18 holes'; end if;
 if exists(select 1 from unnest(new.hole_scores) s where s is not null and (s<1 or s>30)) then raise exception 'Hole scores must be whole numbers from 1 to 30'; end if;
 select coalesce(sum(s),0),count(s) into v_total,v_count from unnest(new.hole_scores)s;
 if v_count=0 then raise exception 'Enter at least one hole score'; end if;
 new.score=v_total;new.round_complete=(v_count=new.holes_played);if not new.round_complete then new.share_anonymously=false;end if;return new;
end;$$;
create trigger caddie_magic_hole_scores_check before insert or update on public.caddie_magic_round_logs for each row execute function public.caddie_magic_validate_hole_scores();

-- Assignments are snapshots: target eligibility is checked again at publish time.
create table public.caddie_magic_assignment_batches(
 id uuid primary key, created_by uuid not null references auth.users(id), title text not null check(char_length(title) between 1 and 160), instructions text not null check(char_length(instructions) between 1 and 10000), audience text not null check(audience in ('one','players','experienced','caddies')), due_date date, created_at timestamptz not null default now()
);
create table public.caddie_magic_assignment_recipients(
 batch_id uuid not null references public.caddie_magic_assignment_batches(id), user_id uuid not null references auth.users(id), recipient_name text not null, status text not null default 'assigned' check(status in ('assigned','in_progress','completed')), reflection text not null default '' check(char_length(reflection)<=10000), updated_at timestamptz not null default now(), completed_at timestamptz, reviewed_at timestamptz, reviewed_by uuid references auth.users(id), primary key(batch_id,user_id)
);
alter table public.caddie_magic_assignment_batches enable row level security;
alter table public.caddie_magic_assignment_recipients enable row level security;
revoke all on public.caddie_magic_assignment_batches,public.caddie_magic_assignment_recipients from public,anon,authenticated;
grant select on public.caddie_magic_assignment_batches,public.caddie_magic_assignment_recipients to authenticated;
create policy "Read own assignments" on public.caddie_magic_assignment_recipients for select to authenticated using(public.flowtel_current_user_is_admin_or_owner() or (user_id=auth.uid() and public.flowtel_current_user_has_product_access('caddie_magic')));
create policy "Read assigned batch" on public.caddie_magic_assignment_batches for select to authenticated using(public.flowtel_current_user_is_admin_or_owner() or exists(select 1 from public.caddie_magic_assignment_recipients r where r.batch_id=id and r.user_id=auth.uid() and public.flowtel_current_user_has_product_access('caddie_magic')));
create function public.caddie_magic_assignment_audience(p_audience text,p_user_id uuid default null) returns table(user_id uuid,display_name text,round_count bigint) language plpgsql stable security definer set search_path=public as $$
begin
 if not public.flowtel_current_user_is_admin_or_owner() then raise exception 'Caddie Master access required' using errcode='42501';end if;
 if p_audience not in ('one','players','experienced','caddies') or (p_audience='one' and p_user_id is null) then raise exception 'Choose an audience';end if;
 return query select p.user_id,coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),'Player'),(select count(*) from public.caddie_magic_round_logs l where l.player_profile_id=p.id and l.entry_type='round' and l.round_complete)
 from public.caddie_magic_player_profiles p join public.flowtel_product_access a on a.user_id=p.user_id and a.caddie_magic_access
 where (p_audience in ('players','experienced') or (p_audience='one' and p.user_id=p_user_id) or (p_audience='caddies' and exists(select 1 from public.caddie_magic_caddie_profiles c where c.user_id=p.user_id and c.status='active')))
 and (p_audience<>'experienced' or (select count(*) from public.caddie_magic_round_logs l where l.player_profile_id=p.id and l.entry_type='round' and l.round_complete)>=28)
 order by p.user_id;
end;$$;
revoke all on function public.caddie_magic_assignment_audience(text,uuid) from public,anon;grant execute on function public.caddie_magic_assignment_audience(text,uuid) to authenticated;
create function public.caddie_magic_publish_assignment(p_id uuid,p_title text,p_instructions text,p_audience text,p_user_id uuid,p_expected_ids uuid[],p_due_date date default null) returns integer language plpgsql security definer set search_path=public as $$
declare v_ids uuid[];v_count integer;
begin
 if not public.flowtel_current_user_is_admin_or_owner() then raise exception 'Caddie Master access required' using errcode='42501';end if;
 select array_agg(x.user_id order by x.user_id) into v_ids from public.caddie_magic_assignment_audience(p_audience,p_user_id)x;
 if coalesce(cardinality(v_ids),0)=0 then raise exception 'No eligible recipients';end if;
 if v_ids is distinct from (select array_agg(x order by x) from unnest(p_expected_ids)x) then raise exception 'Recipients changed. Preview again before sending.';end if;
 if exists(select 1 from public.caddie_magic_assignment_batches where id=p_id) then raise exception 'This assignment was already published';end if;
 insert into public.caddie_magic_assignment_batches values(p_id,auth.uid(),trim(p_title),trim(p_instructions),p_audience,p_due_date,now());
 insert into public.caddie_magic_assignment_recipients(batch_id,user_id,recipient_name) select p_id,x.user_id,x.display_name from public.caddie_magic_assignment_audience(p_audience,p_user_id)x;
 get diagnostics v_count=row_count;return v_count;
end;$$;
revoke all on function public.caddie_magic_publish_assignment(uuid,text,text,text,uuid,uuid[],date) from public,anon;grant execute on function public.caddie_magic_publish_assignment(uuid,text,text,text,uuid,uuid[],date) to authenticated;
create function public.caddie_magic_respond_to_assignment(p_batch_id uuid,p_reflection text,p_complete boolean default false) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.flowtel_current_user_has_product_access('caddie_magic') then raise exception 'Kingdom membership required' using errcode='42501';end if;
 if char_length(coalesce(p_reflection,''))>10000 then raise exception 'Reflection is too long';end if;
 update public.caddie_magic_assignment_recipients set reflection=coalesce(p_reflection,''),status=case when p_complete then 'completed' when status='completed' then 'completed' else 'in_progress' end,completed_at=case when p_complete then coalesce(completed_at,now()) else completed_at end,updated_at=now(),reviewed_at=null,reviewed_by=null where batch_id=p_batch_id and user_id=auth.uid();
 if not found then raise exception 'This assignment is not addressed to you' using errcode='42501';end if;return true;
end;$$;
revoke all on function public.caddie_magic_respond_to_assignment(uuid,text,boolean) from public,anon;grant execute on function public.caddie_magic_respond_to_assignment(uuid,text,boolean) to authenticated;
create function public.caddie_magic_review_assignment(p_batch_id uuid,p_user_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not public.flowtel_current_user_is_admin_or_owner() then raise exception 'Caddie Master access required' using errcode='42501';end if;
 update public.caddie_magic_assignment_recipients set reviewed_at=now(),reviewed_by=auth.uid() where batch_id=p_batch_id and user_id=p_user_id;return found;
end;$$;
revoke all on function public.caddie_magic_review_assignment(uuid,uuid) from public,anon;grant execute on function public.caddie_magic_review_assignment(uuid,uuid) to authenticated;

-- Separate VIP entitlement; base membership never grants it.
create table public.caddie_magic_vip_entitlements(user_id uuid primary key references auth.users(id),active boolean not null default false,granted_by uuid references auth.users(id),updated_at timestamptz not null default now());
alter table public.caddie_magic_vip_entitlements enable row level security;
revoke all on public.caddie_magic_vip_entitlements from public,anon,authenticated;grant select on public.caddie_magic_vip_entitlements to authenticated;
create policy "Read own VIP" on public.caddie_magic_vip_entitlements for select to authenticated using(user_id=auth.uid() or public.flowtel_current_user_is_admin_or_owner());
create function public.caddie_magic_set_vip(p_user_id uuid,p_active boolean) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not public.flowtel_current_user_is_admin_or_owner() then raise exception 'Caddie Master access required' using errcode='42501';end if;
 insert into public.caddie_magic_vip_entitlements values(p_user_id,p_active,auth.uid(),now()) on conflict(user_id) do update set active=excluded.active,granted_by=excluded.granted_by,updated_at=now();return true;
end;$$;
revoke all on function public.caddie_magic_set_vip(uuid,boolean) from public,anon;grant execute on function public.caddie_magic_set_vip(uuid,boolean) to authenticated;
create table public.caddie_magic_siren_tracks(id uuid primary key default gen_random_uuid(),title text not null check(char_length(title) between 1 and 160),description text not null default '' check(char_length(description)<=5000),category text not null check(category in ('Meditations','Hypnosis','Breathwork','Siren Calls')),access_tier text not null default 'kingdom' check(access_tier in ('kingdom','vip')),storage_path text not null unique,duration_seconds integer check(duration_seconds>0),published boolean not null default false,created_at timestamptz not null default now());
alter table public.caddie_magic_siren_tracks enable row level security;
revoke all on public.caddie_magic_siren_tracks from public,anon,authenticated;grant select,insert,update,delete on public.caddie_magic_siren_tracks to authenticated;
create policy "Caddie Master manages siren tracks" on public.caddie_magic_siren_tracks for all to authenticated using(public.flowtel_current_user_is_admin_or_owner()) with check(public.flowtel_current_user_is_admin_or_owner());
create policy "Members listen to published tracks" on public.caddie_magic_siren_tracks for select to authenticated using(published and public.flowtel_current_user_has_product_access('caddie_magic') and (access_tier='kingdom' or exists(select 1 from public.caddie_magic_vip_entitlements v where v.user_id=auth.uid() and v.active)));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('caddie-sea-of-sirens','caddie-sea-of-sirens',false,104857600,array['audio/mpeg','audio/mp3','audio/mp4','audio/webm','audio/ogg','audio/wav','audio/x-wav','audio/aac','audio/x-m4a','audio/m4a']) on conflict(id) do nothing;
create policy "Caddie Master uploads siren audio" on storage.objects for insert to authenticated with check(bucket_id='caddie-sea-of-sirens' and public.flowtel_current_user_is_admin_or_owner());
create policy "Caddie Master deletes siren audio" on storage.objects for delete to authenticated using(bucket_id='caddie-sea-of-sirens' and public.flowtel_current_user_is_admin_or_owner());
create policy "Private siren audio reads" on storage.objects for select to authenticated using(bucket_id='caddie-sea-of-sirens' and (public.flowtel_current_user_is_admin_or_owner() or exists(select 1 from public.caddie_magic_siren_tracks t where t.storage_path=name)));
commit;
