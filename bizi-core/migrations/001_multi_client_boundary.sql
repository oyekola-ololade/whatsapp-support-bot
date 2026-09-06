create table if not exists public.bizi_clients (
  client_key text primary key,
  display_name text not null,
  vertical text not null default 'dental_clinic',
  timezone text not null default 'Africa/Lagos',
  locale text not null default 'en-NG',
  currency text not null default 'NGN',
  active boolean not null default true,
  branding jsonb not null default '{}'::jsonb,
  assistant_config jsonb not null default '{}'::jsonb,
  handoff_config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bizi_clients_key_format check (client_key ~ '^[a-z0-9][a-z0-9_-]{1,62}$')
);

alter table public.services add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);
alter table public.service_sales_metadata add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);
alter table public.faq_items add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);
alter table public.clinic_settings add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);
alter table public.availability_rules add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);
alter table public.blocked_dates add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);
alter table public.contacts add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);
alter table public.enquiries add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);
alter table public.appointments add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);
alter table public.activities add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);
alter table public.conversation_sessions add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);
alter table public.staff_profiles add column if not exists client_key text not null default 'favfare' references public.bizi_clients(client_key);

alter table public.services drop constraint if exists services_name_key;
alter table public.services drop constraint if exists services_slug_key;
alter table public.services add constraint services_client_name_key unique (client_key,name);
alter table public.services add constraint services_client_slug_key unique (client_key,slug);

alter table public.availability_rules drop constraint if exists availability_rules_day_of_week_key;
alter table public.availability_rules add constraint availability_rules_client_day_key unique (client_key,day_of_week);

alter table public.contacts drop constraint if exists contacts_whatsapp_id_key;
alter table public.contacts add constraint contacts_client_whatsapp_key unique (client_key,whatsapp_id);

alter table public.clinic_settings drop constraint if exists clinic_settings_pkey;
alter table public.clinic_settings add constraint clinic_settings_pkey primary key (client_key,key);

alter table public.conversation_sessions drop constraint if exists conversation_sessions_pkey;
alter table public.conversation_sessions add constraint conversation_sessions_pkey primary key (client_key,session_id);

create index if not exists idx_services_client_key on public.services(client_key);
create index if not exists idx_faq_items_client_key on public.faq_items(client_key);
create index if not exists idx_availability_rules_client_key on public.availability_rules(client_key);
create index if not exists idx_blocked_dates_client_key on public.blocked_dates(client_key);
create index if not exists idx_contacts_client_key on public.contacts(client_key);
create index if not exists idx_enquiries_client_key on public.enquiries(client_key);
create index if not exists idx_appointments_client_key on public.appointments(client_key);
create index if not exists idx_activities_client_key on public.activities(client_key);
create index if not exists idx_conversation_sessions_client_key on public.conversation_sessions(client_key);
create index if not exists idx_conversation_sessions_session_id on public.conversation_sessions(session_id);
create index if not exists idx_staff_profiles_client_key on public.staff_profiles(client_key);
