-- Applied to mkyrpoucfxnevccohabl as 20260924102623_inventory.
create table three_k.inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(btrim(name)) between 1 and 200),
  vin text not null default '',
  price numeric(14,2) not null default 0 check(price>=0),
  location text not null default '',
  note text not null default '',
  status text not null default 'available' check(status in ('available','reserved','sold','archived')),
  deal_id text unique references three_k.deals(id),
  version integer not null default 1,
  request_id uuid not null unique,
  created_by uuid not null references three_k.members(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((status in ('reserved','sold'))=(deal_id is not null)),
  check(vin='' or vin ~ '^[A-HJ-NPR-Z0-9]{17}$')
);
create unique index inventory_vin_unique on three_k.inventory(vin) where vin<>'';
create index inventory_status_idx on three_k.inventory(status,created_at desc,id);
create index inventory_creator_idx on three_k.inventory(created_by);
create table three_k.inventory_events (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references three_k.inventory(id),
  actor_id uuid not null references three_k.members(user_id),
  action text not null,
  created_at timestamptz not null default now()
);
create index inventory_events_item_idx on three_k.inventory_events(inventory_id,created_at desc);
create index inventory_events_actor_idx on three_k.inventory_events(actor_id);
alter table three_k.inventory enable row level security;
alter table three_k.inventory_events enable row level security;
revoke all on three_k.inventory,three_k.inventory_events from public,anon,authenticated,service_role;
grant select,insert,update on three_k.inventory to service_role;
grant select,insert on three_k.inventory_events to service_role;
