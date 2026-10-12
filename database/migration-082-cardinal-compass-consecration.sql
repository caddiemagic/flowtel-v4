begin;
create table public.caddie_magic_compass_submissions (
 id uuid primary key,
 caller_name text not null check(char_length(caller_name) between 1 and 60),
 email text not null check(char_length(email) between 3 and 254),
 north_club text not null check(char_length(north_club) between 1 and 60),
 east_club text not null check(char_length(east_club) between 1 and 60),
 west_club text not null check(char_length(west_club) between 1 and 60),
 south_club text not null check(char_length(south_club) between 1 and 60),
 staff_club text not null default 'Putter' check(staff_club='Putter'),
 status text not null default 'awaiting_consecration' check(status in ('awaiting_consecration','consecrated')),
 consented_at timestamptz not null default now(),
 consent_version text not null default 'compass-consecration-v1',
 submitted_at timestamptz not null default now(),
 consecrated_at timestamptz,
 consecrated_by uuid references auth.users(id),
 ip_hash text not null check(ip_hash ~ '^[a-f0-9]{64}$'),
 constraint consecration_state check ((status='awaiting_consecration' and consecrated_at is null and consecrated_by is null) or (status='consecrated' and consecrated_at is not null and consecrated_by is not null))
);
create index on public.caddie_magic_compass_submissions(ip_hash,submitted_at desc);
alter table public.caddie_magic_compass_submissions enable row level security;
revoke all on public.caddie_magic_compass_submissions from public,anon,authenticated;
grant select (id,caller_name,email,north_club,east_club,west_club,south_club,staff_club,status,submitted_at,consecrated_at,consecrated_by) on public.caddie_magic_compass_submissions to authenticated;
create policy "Concierge reviews compass submissions" on public.caddie_magic_compass_submissions for select to authenticated using(public.flowtel_current_user_is_concierge());
create function public.caddie_magic_submit_public_compass(p_id uuid,p_name text,p_email text,p_clubs text[],p_ip_hash text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
 if p_id is null or char_length(trim(coalesce(p_name,''))) not between 1 and 60 or char_length(trim(coalesce(p_email,''))) not between 3 and 254 or coalesce(p_email,'') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or coalesce(p_ip_hash,'') !~ '^[a-f0-9]{64}$' then raise exception 'Invalid compass submission'; end if;
 if coalesce(array_length(p_clubs,1),0)<>4 or exists(select 1 from unnest(p_clubs) c where c is null or char_length(trim(c)) not between 1 and 60 or c ~* '(putter|putting)') or (select count(distinct regexp_replace(lower(c),'[[:space:]-]','','g')) from unnest(p_clubs)c)<>4 then raise exception 'Enter four different clubs, excluding your putter'; end if;
 perform pg_advisory_xact_lock(hashtext(p_ip_hash));
 if exists(select 1 from public.caddie_magic_compass_submissions where id=p_id and ip_hash=p_ip_hash) then return p_id; end if;
 select count(*) into v_count from public.caddie_magic_compass_submissions where ip_hash=p_ip_hash and submitted_at>=now()-interval '1 hour';
 if v_count>=8 then raise exception 'Please try again later'; end if;
 insert into public.caddie_magic_compass_submissions(id,caller_name,email,north_club,east_club,west_club,south_club,ip_hash) values(p_id,trim(p_name),lower(trim(p_email)),trim(p_clubs[1]),trim(p_clubs[2]),trim(p_clubs[3]),trim(p_clubs[4]),p_ip_hash);
 return p_id;
end; $$;
revoke all on function public.caddie_magic_submit_public_compass(uuid,text,text,text[],text) from public,anon,authenticated;
grant execute on function public.caddie_magic_submit_public_compass(uuid,text,text,text[],text) to service_role;
create function public.caddie_magic_consecrate_compass(p_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.flowtel_current_user_is_concierge() then raise exception 'Only the Concierge may consecrate a compass' using errcode='42501'; end if;
 update public.caddie_magic_compass_submissions set status='consecrated',consecrated_at=now(),consecrated_by=auth.uid() where id=p_id and status='awaiting_consecration';
 return found;
end; $$;
revoke all on function public.caddie_magic_consecrate_compass(uuid) from public,anon;
grant execute on function public.caddie_magic_consecrate_compass(uuid) to authenticated;
commit;
