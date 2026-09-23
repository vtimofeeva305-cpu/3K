create table three_k.members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_subject text not null unique,
  display_name text not null,
  role text not null check (role in ('superadmin', 'rop', 'manager')),
  working boolean not null default false,
  created_at timestamptz not null default now()
);

create table three_k.invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_by uuid references three_k.members(user_id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  revoked_at timestamptz,
  check (expires_at > created_at)
);
create index invitations_created_by_idx on three_k.invitations(created_by);
create index invitations_used_by_idx on three_k.invitations(used_by);

create table three_k.assignment_rules (
  source text primary key check (source in ('avito', 'landing', 'phone')),
  member_id uuid not null references three_k.members(user_id) on delete cascade
);
create index assignment_rules_member_idx on three_k.assignment_rules(member_id);

alter table three_k.members enable row level security;
alter table three_k.invitations enable row level security;
alter table three_k.assignment_rules enable row level security;
revoke all on three_k.members, three_k.invitations, three_k.assignment_rules from public, anon, authenticated;
grant select, insert, update, delete on three_k.members, three_k.invitations, three_k.assignment_rules to service_role;

-- Bootstrap the first superadmin separately using a verified auth identity.
-- No personal identities or demonstration records belong in this migration.
