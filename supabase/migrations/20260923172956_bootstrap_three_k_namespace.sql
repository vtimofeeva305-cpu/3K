create schema three_k authorization postgres;
comment on schema three_k is 'Isolated backend namespace for the 3K CRM application';

revoke all on schema three_k from public;
revoke all on schema three_k from anon;
revoke all on schema three_k from authenticated;
grant usage on schema three_k to service_role;

create sequence three_k.lead_number_seq start with 1;
create sequence three_k.deal_number_seq start with 1;

create table three_k.project_info (
  id boolean primary key default true check (id),
  name text not null check (name = '3K'),
  api_slug text not null unique,
  created_at timestamptz not null default now()
);

create table three_k.managers (
  id text primary key,
  name text not null,
  initials text not null,
  schedule text not null,
  focus text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table three_k.clients (
  id text primary key,
  form text not null,
  name text not null,
  display_name text not null,
  inn text,
  phone text not null,
  email text,
  created_at timestamptz not null default now()
);

create table three_k.leads (
  id text primary key default ('L-' || nextval('three_k.lead_number_seq')::text),
  client text not null,
  phone text not null,
  city text not null default 'Не указан',
  display_time text not null default 'Только что',
  source text not null default '3K API',
  listing text not null default 'Модель уточняется',
  category text not null default 'Новая заявка',
  price bigint not null default 0 check (price >= 0),
  manager text not null default 'Не назначен',
  status text not null default 'Новый',
  next_task text not null default 'Связаться с клиентом в течение 15 минут',
  created_at timestamptz not null default now()
);

create table three_k.deals (
  id text primary key default ('D-' || nextval('three_k.deal_number_seq')::text),
  client text not null,
  company text not null,
  product text not null,
  amount bigint not null default 0 check (amount >= 0),
  stage text not null default 'Квалификация',
  manager text not null default 'Не назначен',
  task text not null default 'Проверить наличие и связаться с клиентом',
  due text not null default 'Сегодня, 18:00',
  status text not null default 'open',
  virtual boolean not null default false,
  created_at timestamptz not null default now()
);

create table three_k.report_summaries (
  id text primary key,
  period text not null,
  leads integer not null check (leads >= 0),
  total_deals integer not null check (total_deals >= 0),
  in_work integer not null check (in_work >= 0),
  closed integer not null check (closed >= 0),
  revenue text not null,
  margin text not null,
  conversion text not null,
  updated_at timestamptz not null default now()
);

alter sequence three_k.lead_number_seq owned by three_k.leads.id;
alter sequence three_k.deal_number_seq owned by three_k.deals.id;

alter table three_k.project_info enable row level security;
alter table three_k.managers enable row level security;
alter table three_k.clients enable row level security;
alter table three_k.leads enable row level security;
alter table three_k.deals enable row level security;
alter table three_k.report_summaries enable row level security;

revoke all on all tables in schema three_k from public, anon, authenticated;
revoke all on all sequences in schema three_k from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema three_k to service_role;
grant usage, select on all sequences in schema three_k to service_role;

alter default privileges in schema three_k
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema three_k
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema three_k
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema three_k
  grant usage, select on sequences to service_role;

create index leads_created_at_idx on three_k.leads (created_at desc);
create index leads_status_created_at_idx on three_k.leads (status, created_at desc);
create index deals_created_at_idx on three_k.deals (created_at desc);
create index deals_status_created_at_idx on three_k.deals (status, created_at desc);

insert into three_k.project_info (name, api_slug)
values ('3K', 'three-k-api');
