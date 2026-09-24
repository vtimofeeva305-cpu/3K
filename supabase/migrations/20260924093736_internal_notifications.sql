-- Applied to mkyrpoucfxnevccohabl as 20260924093736_internal_notifications.
create table three_k.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references three_k.members(user_id),
  kind text not null check (kind in ('clients','leads','deals')),
  context_id text not null,
  task_id uuid references three_k.client_tasks(id),
  event text not null check (event in ('assigned','rescheduled','completed','reopened')),
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on three_k.notifications(recipient_id,id desc);
create index notifications_unread_idx on three_k.notifications(recipient_id,id desc) where read_at is null;
create index notifications_task_idx on three_k.notifications(task_id);
alter table three_k.notifications enable row level security;
revoke all on three_k.notifications from public,anon,authenticated,service_role;
grant select,insert on three_k.notifications to service_role;
grant update(read_at) on three_k.notifications to service_role;
revoke all on sequence three_k.notifications_id_seq from public,anon,authenticated;
grant usage,select on sequence three_k.notifications_id_seq to service_role;

-- Triggers share the originating transaction, including rollback and API retries.
create function three_k.notify_assignment() returns trigger
language plpgsql set search_path='' as $$
declare
  target_kind text;
  target_id text;
begin
  if tg_table_name='client_tasks' then
    target_kind := case when new.client_id is not null then 'clients' when new.lead_id is not null then 'leads' else 'deals' end;
    target_id := coalesce(new.client_id,new.lead_id,new.deal_id);
    if tg_op='INSERT' or new.assignee_id is distinct from old.assignee_id then
      insert into three_k.notifications(recipient_id,kind,context_id,task_id,event,title,body)
      values (new.assignee_id,target_kind,target_id,new.id,'assigned','Вам назначена задача',new.title);
    elsif new.due_date is distinct from old.due_date then
      insert into three_k.notifications(recipient_id,kind,context_id,task_id,event,title,body)
      values (new.assignee_id,target_kind,target_id,new.id,'rescheduled','Изменён срок задачи',new.title || ' · ' || new.due_date::text);
    end if;
    if tg_op='UPDATE' and (new.completed_at is null) is distinct from (old.completed_at is null)
      and new.created_by is not null and new.created_by<>new.assignee_id then
      insert into three_k.notifications(recipient_id,kind,context_id,task_id,event,title,body)
      values (new.created_by,target_kind,target_id,new.id,
        case when new.completed_at is null then 'reopened' else 'completed' end,
        case when new.completed_at is null then 'Задача возвращена в работу' else 'Задача выполнена' end,new.title);
    end if;
  elsif new.assignee_id is not null and (tg_op='INSERT' or new.assignee_id is distinct from old.assignee_id) then
    target_kind := case when tg_table_name='leads' then 'leads' else 'deals' end;
    insert into three_k.notifications(recipient_id,kind,context_id,event,title,body)
    values (new.assignee_id,target_kind,new.id,'assigned',
      case when tg_table_name='leads' then 'Вам назначен лид' else 'Вам назначена сделка' end,new.id || ' · ' || new.client);
  end if;
  return new;
end;
$$;
revoke all on function three_k.notify_assignment() from public,anon,authenticated;
create trigger leads_notify_assignment after insert or update of assignee_id on three_k.leads
for each row execute function three_k.notify_assignment();
create trigger deals_notify_assignment after insert or update of assignee_id on three_k.deals
for each row execute function three_k.notify_assignment();
create trigger tasks_notify_changes after insert or update of assignee_id,due_date,completed_at on three_k.client_tasks
for each row execute function three_k.notify_assignment();
