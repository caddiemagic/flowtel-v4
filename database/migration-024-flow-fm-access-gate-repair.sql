-- Flowtel v0.10.3 — Flow FM Access Gate Repair
--
-- Purpose:
-- Broaden the Flow FM self-service gate so authenticated users with a profile row
-- can save their own Flow FM assignments and Priestess Profile drafts even when
-- membership/role fields vary across beta data.
--
-- Consent and role boundaries remain preserved for viewing other members and
-- mentor/admin review actions. This function only answers: can the current user
-- tend their own Flow FM forms?

create or replace function public.flow_fm_current_user_can_tend_assignments()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
    );
$$;

grant execute on function public.flow_fm_current_user_can_tend_assignments() to authenticated;

comment on function public.flow_fm_current_user_can_tend_assignments() is
  'v0.10.3 repair: authenticated users with a profile row can tend their own Flow FM forms. Cross-member visibility and review permissions remain consent/role guarded elsewhere.';
