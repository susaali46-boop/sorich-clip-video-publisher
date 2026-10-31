-- OAuth secrets are stored separately from workspace-readable social account metadata.
-- The application encrypts the token payload with AES-256-GCM before inserting it.
create table if not exists public.oauth_credentials (
  id uuid primary key default gen_random_uuid(),
  social_account_id uuid not null unique references public.social_accounts(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('youtube', 'tiktok', 'instagram', 'facebook')),
  encrypted_payload text not null,
  token_expires_at timestamptz,
  refresh_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists oauth_credentials_workspace_idx on public.oauth_credentials(workspace_id);
alter table public.oauth_credentials enable row level security;
revoke all on table public.oauth_credentials from anon, authenticated;
grant all on table public.oauth_credentials to service_role;
comment on table public.oauth_credentials is 'Server-only encrypted OAuth token vault. No anon/authenticated RLS policies; service_role only.';
