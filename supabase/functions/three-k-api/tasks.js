import { AccessError, isLeader } from "./access.js";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (code,message) => { throw new AccessError(code,message); };
export function validateTask(payload, partial = false) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) fail(422,"Некорректная задача");
  const data = {};
  if (!partial || "title" in payload) {
    if (typeof payload.title !== "string" || !payload.title.trim() || payload.title.length>500) fail(422,"Укажите задачу до 500 символов");
    data.title=payload.title.trim();
  }
  if (!partial || "date" in payload) {
    const date=payload.date;
    if (typeof date!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date) fail(422,"Укажите корректную дату");
    data.due_date=date;
  }
  if ("assigneeId" in payload) {
    if (!uuid.test(payload.assigneeId)) fail(422,"Выберите ответственного");
    data.assignee_id=payload.assigneeId;
  }
  if ("completed" in payload) {
    if (typeof payload.completed!=="boolean") fail(422,"Некорректный статус задачи");
    data.completed=payload.completed;
  }
  if (partial && !Object.keys(data).length) fail(422,"Нет изменений");
  return data;
}
function context(kind,id) {
  const prefix={clients:"C",leads:"L",deals:"D"}[kind];
  if (!prefix || typeof id!=="string" || !new RegExp(`^${prefix}-[a-z0-9-]{1,64}$`,"i").test(id)) fail(422,"Некорректная связь задачи");
  return {kind,id};
}
const contextMatches=(row,c)=>!c || row[{clients:"client_id",leads:"lead_id",deals:"deal_id"}[c.kind]]===c.id;
export function createTaskRepository(getSql) {
  async function log(tx,id,actor,action) {
    await tx`insert into three_k.task_events(task_id,actor_id,action) values (${id},${actor},${action})`;
  }
  return {
    async list(member,{kind="",id="",filter="active",scope="mine",offset=0,limit=30}={}) {
      const sql=await getSql();
      const rows=await sql`select t.id,t.title,t.due_date::text as date,t.assignee_id as "assigneeId",m.display_name as assignee,
        t.completed_at as "completedAt",t.version,
        case when t.client_id is not null then 'clients' when t.lead_id is not null then 'leads' else 'deals' end as kind,
        coalesce(t.client_id,t.lead_id,t.deal_id) as "contextId",coalesce(c.display_name,l.client,d.client) as label,
        (t.completed_at is null and t.due_date<(now() at time zone 'Europe/Moscow')::date) as overdue
        from three_k.client_tasks t join three_k.members m on m.user_id=t.assignee_id
        left join three_k.clients c on c.id=t.client_id left join three_k.leads l on l.id=t.lead_id left join three_k.deals d on d.id=t.deal_id
        where (${kind===""} or (${kind==="clients"} and t.client_id=${id}) or (${kind==="leads"} and t.lead_id=${id}) or (${kind==="deals"} and t.deal_id=${id}))
        and (${kind!=="" || (scope==="team" && isLeader(member))} or t.assignee_id=${member.id})
        and (${filter==="all"} or (${filter==="completed"} and t.completed_at is not null) or (${filter!=="completed"} and t.completed_at is null
          and (${filter==="active"} or (${filter==="today"} and t.due_date=(now() at time zone 'Europe/Moscow')::date)
          or (${filter==="overdue"} and t.due_date<(now() at time zone 'Europe/Moscow')::date)
          or (${filter==="upcoming"} and t.due_date>(now() at time zone 'Europe/Moscow')::date))))
        order by t.due_date,t.id limit ${limit+1} offset ${offset}`;
      return {items:rows.slice(0,limit),hasMore:rows.length>limit};
    },
    async create(c,data,member,requestId) {
      const sql=await getSql();
      return sql.begin(async tx=>{
        await tx`select pg_advisory_xact_lock(hashtextextended(${`three_k:task:${requestId}`},0))`;
        const [existing]=await tx`select * from three_k.client_tasks where request_id=${requestId}`;
        if(existing) {
          if(existing.created_by!==member.id || !contextMatches(existing,c)) fail(409,"Идентификатор запроса уже использован");
          return {id:existing.id};
        }
        const assignee=data.assignee_id || member.id;
        if(assignee!==member.id && !isLeader(member)) fail(403,"Назначать задачи другому сотруднику может руководитель");
        const [person]=await tx`select user_id from three_k.members where user_id=${assignee}`;
        if(!person) fail(422,"Ответственный не найден");
        const [parent]=c.kind==="clients" ? await tx`select id from three_k.clients where id=${c.id} for share`
          : c.kind==="leads" ? await tx`select id,assignee_id from three_k.leads where id=${c.id} for share`
          : await tx`select id,assignee_id from three_k.deals where id=${c.id} for share`;
        if(!parent) fail(404,"Связанная карточка не найдена");
        if(c.kind!=="clients" && parent.assignee_id!==member.id && !isLeader(member)) fail(403,"Задачу может поставить ответственный за карточку или руководитель");
        const [task]=await tx`insert into three_k.client_tasks(client_id,lead_id,deal_id,title,due_date,assignee_id,created_by,request_id)
          values (${c.kind==="clients"?c.id:null},${c.kind==="leads"?c.id:null},${c.kind==="deals"?c.id:null},${data.title},${data.due_date}::date,${assignee},${member.id},${requestId}) returning id`;
        await log(tx,task.id,member.id,"Создана задача");
        return task;
      });
    },
    async update(id,data,version,member,c=null) {
      const sql=await getSql();
      return sql.begin(async tx=>{
        const [old]=await tx`select *,due_date::text as date from three_k.client_tasks where id=${id} for update`;
        if(!old || !contextMatches(old,c)) fail(404,"Задача не найдена");
        if(old.assignee_id!==member.id && !isLeader(member)) fail(403,"Изменять задачу может ответственный или руководитель");
        if(old.version!==version) fail(409,"Задача изменена другим сотрудником. Обновите список.");
        if(data.assignee_id && data.assignee_id!==old.assignee_id && !isLeader(member)) fail(403,"Переназначать задачи может руководитель");
        const target=data.assignee_id || old.assignee_id;
        const [person]=await tx`select user_id,display_name from three_k.members where user_id=${target}`;
        if(!person) fail(422,"Ответственный не найден");
        const completed=data.completed===undefined ? !!old.completed_at : data.completed;
        const title=data.title ?? old.title, date=data.due_date ?? old.date;
        const actions=[];
        if(title!==old.title) actions.push("Изменено название");
        if(date!==old.date) actions.push(`Срок: ${old.date} → ${date}`);
        if(target!==old.assignee_id) actions.push(`Ответственный: ${person.display_name}`);
        if(completed!==!!old.completed_at) actions.push(completed?"Выполнена":"Возвращена в работу");
        if(!actions.length) return {id};
        await tx`update three_k.client_tasks set title=${title},due_date=${date}::date,assignee_id=${target},
          completed_at=case when ${completed} then coalesce(completed_at,now()) else null end,version=version+1,updated_at=now() where id=${id}`;
        await log(tx,id,member.id,actions.join("; "));
        return {id};
      });
    },
    async history(id) {
      const sql=await getSql();
      return sql`select e.id,e.action,e.created_at as "createdAt",m.display_name as actor from three_k.task_events e
        join three_k.members m on m.user_id=e.actor_id where e.task_id=${id} order by e.created_at desc,e.id limit 100`;
    },
  };
}
export async function taskRoute(repo,member,method,url,path,payload) {
  const legacy=path.match(/^\/clients\/(C-[a-z0-9-]{1,64})\/tasks(?:\/([0-9a-f-]{36}))?$/i);
  const match=path.match(/^\/tasks(?:\/([0-9a-f-]{36})(\/history)?)?$/i);
  if(!match && !legacy) return undefined;
  const id=legacy?.[2] || match?.[1];
  if(id && !uuid.test(id)) fail(422,"Некорректная задача");
  const c=legacy ? context("clients",legacy[1]) : null;
  if(method==="GET") {
    if(match?.[2]) return repo.history(id);
    if(id) fail(405,"Метод не поддерживается");
    const kind=c?.kind || url.searchParams.get("kind") || "";
    const contextId=c?.id || url.searchParams.get("contextId") || "";
    if(kind || contextId) context(kind,contextId);
    const filter=url.searchParams.get("filter") || "active",scope=url.searchParams.get("scope") || "mine";
    const offset=Number(url.searchParams.get("offset") || 0);
    if(!["active","today","overdue","upcoming","completed"].includes(filter) || !["mine","team"].includes(scope) || !Number.isSafeInteger(offset) || offset<0) fail(422,"Некорректный фильтр задач");
    if(scope==="team" && !isLeader(member)) fail(403,"Общий список доступен руководителю");
    const result=await repo.list(member,{kind,id:contextId,filter:legacy ? "all" : filter,scope,offset,limit:legacy ? 500 : 30});
    return legacy ? result.items : result;
  }
  if(method!=="POST" || match?.[2]) fail(405,"Метод не поддерживается");
  if(id) {
    if(!Number.isSafeInteger(payload?.version) || payload.version<1) fail(422,"Версия задачи обязательна");
    return repo.update(id,validateTask(payload,true),payload.version,member,c);
  }
  const data=validateTask(payload);
  if(data.completed!==undefined) fail(422,"Новая задача должна быть открыта");
  if(!uuid.test(payload.requestId || "")) fail(422,"Идентификатор запроса обязателен");
  return repo.create(c || context(payload.kind,payload.contextId),data,member,payload.requestId);
}
