-- DRAFT ONLY: Flowtel Mentorship Client Suite
-- Do not apply until server authentication, entitlement and RLS review.
-- Isolated new tables; no changes to existing Flowtel tables.

create table if not exists public.flowtel_mentorship_offerings (
 id uuid primary key default gen_random_uuid(),
 offering_key text not null unique,
 title text not null,
 price_cents integer not null check (price_cents >= 0),
 duration_months integer,
 duration_days integer,
 activation_minutes integer not null default 0 check (activation_minutes >= 0),
 empowerment_count integer not null default 0 check (empowerment_count >= 0),
 empowerment_minutes integer not null default 0 check (empowerment_minutes >= 0),
 cadence_days integer,
 flexible_count integer not null default 0 check (flexible_count >= 0),
 flexible_minutes integer not null default 0 check (flexible_minutes >= 0),
 telegram_days integer not null default 0 check (telegram_days >= 0),
 telegram_months integer not null default 0 check (telegram_months >= 0),
 booking_mode text not null check (booking_mode in ('approval_required','acuity_flexible')),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.flowtel_mentorship_enrollments (
 id uuid primary key default gen_random_uuid(),
 client_user_id uuid references auth.users(id),
 invited_email text,
 offering_id uuid not null references public.flowtel_mentorship_offerings(id),
 offering_snapshot jsonb not null,
 starts_on date,
 ends_on date,
 support_starts_on date,
 support_ends_on date,
 status text not null default 'draft' check (status in ('draft','invited','active','paused','completed','archived','cancelled')),
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint enrollment_identity check (client_user_id is not null or invited_email is not null)
);
create index if not exists flowtel_mentorship_enrollments_client_idx on public.flowtel_mentorship_enrollments(client_user_id);
create table if not exists public.flowtel_mentorship_sessions (
 id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references public.flowtel_mentorship_enrollments(id) on delete cascade,
 session_number integer not null check (session_number > 0),
 session_kind text not null check (session_kind in ('activation','empowerment','flexible')),
 duration_minutes integer not null check (duration_minutes > 0),
 scheduled_at timestamptz,
 timezone text not null default 'America/Los_Angeles',
 appointment_id uuid references public.flowtel_external_appointments(id),
 status text not null default 'proposed' check (status in ('proposed','unscheduled','confirmed','completed','cancelled','missed')),
 created_at timestamptz not null default now(),
 unique(enrollment_id,session_number),
 unique(appointment_id)
);
create table if not exists public.flowtel_mentorship_monthly_focus (
 id uuid primary key default gen_random_uuid(),
 enrollment_id uuid not null references public.flowtel_mentorship_enrollments(id) on delete cascade,
 focus_month date not null,
 client_visible_focus text not null default '',
 private_mentor_notes text not null default '',
 updated_at timestamptz not null default now(),
 unique(enrollment_id,focus_month)
);
create table if not exists public.flowtel_mentorship_replays (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.flowtel_mentorship_sessions(id) on delete cascade,
 title text not null,
 storage_path text not null,
 visible_to_client boolean not null default false,
 created_at timestamptz not null default now()
);
-- Deliberate deny-by-default policies. Owner/client endpoints must authorize
-- independently before accessing data with server-side credentials.
alter table public.flowtel_mentorship_offerings enable row level security;
alter table public.flowtel_mentorship_enrollments enable row level security;
alter table public.flowtel_mentorship_sessions enable row level security;
alter table public.flowtel_mentorship_monthly_focus enable row level security;
alter table public.flowtel_mentorship_replays enable row level security;
revoke all on public.flowtel_mentorship_offerings, public.flowtel_mentorship_enrollments,
 public.flowtel_mentorship_sessions, public.flowtel_mentorship_monthly_focus,
 public.flowtel_mentorship_replays from anon, authenticated;
-- Seed reusable catalog, update metadata only if newly inserted.
insert into public.flowtel_mentorship_offerings
(offering_key,title,price_cents,duration_months,duration_days,activation_minutes,
 empowerment_count,empowerment_minutes,cadence_days,flexible_count,flexible_minutes,
 telegram_days,telegram_months,booking_mode)
values
('womb_activation','Womb Activation',77700,null,14,180,0,0,null,0,0,14,0,'approval_required'),
('sacred_self_study','Sacred Self-Study',377700,3,null,180,6,90,14,0,0,0,3,'approval_required'),
('kundalini_creatrix','The Kundalini Creatrix',577700,9,null,180,18,90,14,0,0,0,9,'approval_required'),
('four_sessions','Four 45-Minute Sessions',39900,null,null,0,0,0,null,4,45,0,0,'acuity_flexible')
on conflict (offering_key) do nothing;
-- Month-based Telegram support uses telegram_months; calculate actual
-- support dates on the server with calendar-month semantics.
