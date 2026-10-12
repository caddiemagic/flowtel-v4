-- Optional $69 verified purchase + separate branded welcome outbox.
-- Preserves current player access. No blanket paywall switch or automatic VIP grant.
begin;
create table public.caddie_magic_membership_orders(order_id text primary key,user_id uuid not null references auth.users(id),buyer_email text not null,product_id text not null,payment_state text not null check(payment_state in ('PAID','REFUNDED','REVOKED')),verified_at timestamptz not null default now(),preserved_existing_access boolean not null default false);
alter table public.caddie_magic_membership_orders enable row level security;
revoke all on public.caddie_magic_membership_orders from public,anon,authenticated;
grant select on public.caddie_magic_membership_orders to authenticated;
grant all on public.caddie_magic_membership_orders to service_role;
create policy "Read own Kingdom purchase" on public.caddie_magic_membership_orders for select to authenticated using(user_id=auth.uid() or public.flowtel_current_user_is_admin_or_owner());
create table public.caddie_magic_purchase_attempts(id uuid primary key default gen_random_uuid(),ip_hash text not null,attempted_at timestamptz not null default now());
create index on public.caddie_magic_purchase_attempts(ip_hash,attempted_at desc);
alter table public.caddie_magic_purchase_attempts enable row level security;
revoke all on public.caddie_magic_purchase_attempts from public,anon,authenticated;
create function public.caddie_magic_begin_purchase_check(p_ip_hash text) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if coalesce(p_ip_hash,'') !~ '^[a-f0-9]{64}$' then raise exception 'Invalid request';end if;
 perform pg_advisory_xact_lock(hashtext(p_ip_hash));
 if (select count(*) from public.caddie_magic_purchase_attempts where ip_hash=p_ip_hash and attempted_at>=now()-interval '1 hour')>=8 then raise exception 'Please wait before checking again';end if;
 insert into public.caddie_magic_purchase_attempts(ip_hash) values(p_ip_hash);return true;
end;$$;
revoke all on function public.caddie_magic_begin_purchase_check(text) from public,anon,authenticated;grant execute on function public.caddie_magic_begin_purchase_check(text) to service_role;
create function public.caddie_magic_apply_paid_membership(p_user_id uuid,p_email text,p_order_id text,p_product_id text) returns boolean language plpgsql security definer set search_path=public,auth as $$
declare v_access public.flowtel_product_access%rowtype;
begin
 if coalesce(p_order_id,'')='' or coalesce(p_product_id,'')='' or not exists(select 1 from auth.users where id=p_user_id and lower(email)=lower(trim(p_email))) then raise exception 'Verified purchase identity mismatch';end if;
 perform pg_advisory_xact_lock(hashtext(p_user_id::text));
 select * into v_access from public.flowtel_product_access where user_id=p_user_id for update;
 if v_access.user_id is not null and not v_access.caddie_magic_access and exists(select 1 from public.caddie_magic_player_profiles where user_id=p_user_id) then raise exception 'Existing player access requires owner review';end if;
 if exists(select 1 from public.caddie_magic_membership_orders where order_id=p_order_id and user_id<>p_user_id) then raise exception 'Purchase is assigned to another account';end if;
 insert into public.caddie_magic_membership_orders values(p_order_id,p_user_id,lower(trim(p_email)),p_product_id,'PAID',now(),coalesce(v_access.caddie_magic_access,false) and not exists(select 1 from public.caddie_magic_membership_orders where user_id=p_user_id)) on conflict(order_id) do update set payment_state='PAID',verified_at=now();
 insert into public.flowtel_product_access(user_id,caddie_magic_access,flowtel_access,access_role,access_source) values(p_user_id,true,false,'player','kingdom-paid-membership') on conflict(user_id) do update set caddie_magic_access=true,updated_at=now();
 return true;
end;$$;
revoke all on function public.caddie_magic_apply_paid_membership(uuid,text,text,text) from public,anon,authenticated;grant execute on function public.caddie_magic_apply_paid_membership(uuid,text,text,text) to service_role;
create function public.caddie_magic_revoke_refunded_membership(p_user_id uuid,p_order_id text) returns boolean language plpgsql security definer set search_path=public as $$
begin
 update public.caddie_magic_membership_orders set payment_state='REFUNDED',verified_at=now() where order_id=p_order_id and user_id=p_user_id;
 if found and not exists(select 1 from public.caddie_magic_membership_orders where user_id=p_user_id and (payment_state='PAID' or preserved_existing_access)) then
  update public.flowtel_product_access set caddie_magic_access=false,updated_at=now() where user_id=p_user_id and access_role not in ('owner','admin');
 end if;return true;
end;$$;
revoke all on function public.caddie_magic_revoke_refunded_membership(uuid,text) from public,anon,authenticated;grant execute on function public.caddie_magic_revoke_refunded_membership(uuid,text) to service_role;
create table public.flowtel_branded_email_outbox(id uuid primary key default gen_random_uuid(),delivery_key text not null unique,recipient_email text not null,brand text not null check(brand in ('flowtel','kingdom')),membership_label text not null,first_name text,created_at timestamptz not null default now(),sent_at timestamptz,provider_id text,last_error text);
alter table public.flowtel_branded_email_outbox enable row level security;
revoke all on public.flowtel_branded_email_outbox from public,anon,authenticated;grant all on public.flowtel_branded_email_outbox to service_role;
create table public.flowtel_membership_webhook_events(event_id text primary key,order_id text not null,received_at timestamptz not null default now(),processed_at timestamptz);
alter table public.flowtel_membership_webhook_events enable row level security;
revoke all on public.flowtel_membership_webhook_events from public,anon,authenticated;grant all on public.flowtel_membership_webhook_events to service_role;
commit;
