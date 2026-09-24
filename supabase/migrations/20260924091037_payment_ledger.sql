-- Applied to mkyrpoucfxnevccohabl as 20260924091037_payment_ledger.
create table three_k.payments (
  id uuid primary key default gen_random_uuid(),
  deal_id text not null references three_k.deals(id),
  kind text not null check (kind in ('receipt','refund','reversal')),
  amount numeric(14,2) not null check (amount <> 0),
  paid_on date not null,
  method text not null check (method in ('bank','cash','card')),
  note text not null default '' check (length(note)<=500),
  reverses_id uuid unique,
  actor_id uuid not null references three_k.members(user_id),
  request_id uuid not null unique,
  request_fingerprint text not null,
  created_at timestamptz not null default now(),
  unique(id,deal_id),
  foreign key(reverses_id,deal_id) references three_k.payments(id,deal_id),
  check ((kind='receipt' and amount>0 and reverses_id is null)
    or (kind='refund' and amount<0 and reverses_id is null and length(btrim(note))>0)
    or (kind='reversal' and reverses_id is not null and length(btrim(note))>0))
);
create index payments_deal_idx on three_k.payments(deal_id,created_at desc,id);
create index payments_actor_idx on three_k.payments(actor_id);
alter table three_k.payments enable row level security;
revoke all on three_k.payments from public,anon,authenticated,service_role;
grant select,insert on three_k.payments to service_role;

create function three_k.prevent_payment_mutation() returns trigger
language plpgsql set search_path='' as $$
begin
  raise exception 'Payment ledger is append-only';
end;
$$;
revoke all on function three_k.prevent_payment_mutation() from public,anon,authenticated;
create trigger payments_immutable before update or delete on three_k.payments
for each row execute function three_k.prevent_payment_mutation();
create trigger payments_no_truncate before truncate on three_k.payments
for each statement execute function three_k.prevent_payment_mutation();
