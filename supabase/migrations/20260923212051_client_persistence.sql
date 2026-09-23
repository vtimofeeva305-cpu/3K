-- Version matches the applied Supabase migration.
alter table three_k.clients
  alter column id set default ('C-' || gen_random_uuid()::text),
  add column address text not null default '',
  add column passport text not null default '',
  add column legal_address text not null default '',
  add column kpp text not null default '',
  add column bik text not null default '',
  add column bank text not null default '',
  add column account text not null default '',
  add column director text not null default '',
  add column version integer not null default 1 check (version > 0),
  add column updated_at timestamptz not null default now(),
  add column created_by uuid references three_k.members(user_id) on delete set null,
  add column request_id uuid unique;
create index clients_created_by_idx on three_k.clients(created_by);
create index clients_directory_idx on three_k.clients(display_name, id);

create table three_k.client_events (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references three_k.clients(id),
  actor_id uuid references three_k.members(user_id) on delete set null,
  action text not null check (action in ('created', 'updated')),
  changed_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index client_events_client_time_idx on three_k.client_events(client_id, created_at desc);
create index client_events_actor_idx on three_k.client_events(actor_id);
alter table three_k.client_events enable row level security;
revoke all on three_k.client_events from public, anon, authenticated;
grant select, insert on three_k.client_events to service_role;

create table three_k.client_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references three_k.clients(id),
  title text not null check (length(btrim(title)) between 1 and 500),
  due_date date not null,
  assignee_id uuid not null references three_k.members(user_id),
  completed_at timestamptz,
  version integer not null default 1,
  request_id uuid not null unique,
  created_at timestamptz not null default now()
);
create index client_tasks_client_idx on three_k.client_tasks(client_id, due_date, id);
create index client_tasks_assignee_idx on three_k.client_tasks(assignee_id, due_date);
alter table three_k.client_tasks enable row level security;
revoke all on three_k.client_tasks from public, anon, authenticated;
grant select, insert, update on three_k.client_tasks to service_role;
