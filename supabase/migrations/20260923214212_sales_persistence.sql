-- Applied to mkyrpoucfxnevccohabl as 20260923214212_sales_persistence.
alter table three_k.leads
  add column client_id text references three_k.clients(id),
  add column assignee_id uuid references three_k.members(user_id),
  add column source_code text not null default 'legacy' check (source_code in ('legacy','phone','landing','avito')),
  add column message text not null default '',
  add column version integer not null default 1,
  add column updated_at timestamptz not null default now(),
  add column first_response_at timestamptz,
  add column created_by uuid references three_k.members(user_id),
  add column request_id uuid unique;

alter table three_k.deals
  add column client_id text references three_k.clients(id),
  add column assignee_id uuid references three_k.members(user_id),
  add column lead_id text unique references three_k.leads(id),
  add column source text not null default 'Историческая запись',
  add column vin text not null default '',
  add column close_date date,
  add column closed_at timestamptz,
  add column loss_reason text not null default '',
  add column version integer not null default 1,
  add column updated_at timestamptz not null default now(),
  add column created_by uuid references three_k.members(user_id),
  add column request_id uuid unique;

alter table three_k.leads alter column price type numeric(14,2);
alter table three_k.deals alter column amount type numeric(14,2);

create table three_k.sales_events (
  id uuid primary key default gen_random_uuid(),
  lead_id text references three_k.leads(id),
  deal_id text references three_k.deals(id),
  actor_id uuid not null references three_k.members(user_id),
  action text not null,
  created_at timestamptz not null default now(),
  check (lead_id is not null or deal_id is not null)
);
alter table three_k.sales_events enable row level security;
revoke all on three_k.sales_events from public, anon, authenticated;
grant select, insert on three_k.sales_events to service_role;
create index sales_events_lead_idx on three_k.sales_events(lead_id, created_at desc);
create index sales_events_deal_idx on three_k.sales_events(deal_id, created_at desc);
create index leads_client_idx on three_k.leads(client_id);
create index leads_assignee_idx on three_k.leads(assignee_id, created_at desc);
create index deals_client_idx on three_k.deals(client_id);
create index deals_assignee_idx on three_k.deals(assignee_id, created_at desc);
