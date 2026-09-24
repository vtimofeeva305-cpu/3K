-- Applied as 20260923220826_unified_tasks; existing task IDs remain unchanged.
alter table three_k.client_tasks
  alter column client_id drop not null,
  add column lead_id text references three_k.leads(id),
  add column deal_id text references three_k.deals(id),
  add column created_by uuid references three_k.members(user_id),
  add column updated_at timestamptz not null default now(),
  add constraint tasks_one_context check (num_nonnulls(client_id,lead_id,deal_id)=1);
-- Preserve the existing task IDs, deadlines and completion state.
update three_k.client_tasks set created_by=assignee_id;
create index tasks_lead_idx on three_k.client_tasks(lead_id,due_date,id);
create index tasks_deal_idx on three_k.client_tasks(deal_id,due_date,id);
create index tasks_open_due_idx on three_k.client_tasks(due_date,id) where completed_at is null;
create index tasks_creator_idx on three_k.client_tasks(created_by);
create table three_k.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references three_k.client_tasks(id),
  actor_id uuid not null references three_k.members(user_id),
  action text not null,
  created_at timestamptz not null default now()
);
create index task_events_task_idx on three_k.task_events(task_id,created_at desc);
create index task_events_actor_idx on three_k.task_events(actor_id);
alter table three_k.task_events enable row level security;
revoke all on three_k.task_events from public,anon,authenticated,service_role;
grant select,insert on three_k.task_events to service_role;
