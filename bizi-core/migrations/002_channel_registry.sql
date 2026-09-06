create table if not exists public.bizi_channels (
  id uuid primary key default gen_random_uuid(),
  client_key text not null references public.bizi_clients(client_key) on delete cascade,
  channel_type text not null,
  provider text not null,
  external_instance_id text,
  public_address text,
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bizi_channels_type_check check (channel_type in ('whatsapp','web_chat','sms','email','other')),
  constraint bizi_channels_status_check check (status in ('active','paused','disconnected','disabled'))
);

create unique index if not exists bizi_channels_provider_instance_key
  on public.bizi_channels(provider,external_instance_id)
  where external_instance_id is not null;

create index if not exists idx_bizi_channels_client on public.bizi_channels(client_key,status);
create index if not exists idx_bizi_channels_provider on public.bizi_channels(provider,status);
