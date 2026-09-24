import { AccessError } from "./access.js";
import { validateClient } from "./clients.js";

export const SALES_STAGES = ["Квалификация", "Подбор", "Ожидается оплата", "Связаться позже", "Успешно", "Отказ"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const leader = member => ["rop", "superadmin"].includes(member.role);
const fail = (status, message) => { throw new AccessError(status, message); };
function text(value, required = false, max = 500) {
  if (value == null && !required) return "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) fail(422, "Проверьте обязательные текстовые поля");
  return value.trim();
}
function money(value) {
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(String(value ?? ""))) fail(422, "Сумма должна быть положительным числом с точностью до копеек");
  return Number(value);
}
export function validateSale(payload, kind) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) fail(422, "Некорректная карточка");
  for (const field of ["source", "source_code", "sourceCode", "manager", "assignee_id", "assigneeId", "status", "lead_id"]) {
    if (field in payload) fail(422, "Источник, статус и назначение задаются сервером");
  }
  if (kind === "leads") {
    const client = validateClient({ form: "Физлицо", name: payload.client, phone: payload.phone });
    return { client: client.name, phone: client.phone, city: text(payload.city), listing: text(payload.listing, true),
      message: text(payload.message, false, 2000), price: money(payload.price ?? 0) };
  }
  const clientId = text(payload.clientId, true);
  if (!/^C-[a-z0-9-]{1,64}$/i.test(clientId)) fail(422, "Выберите клиента из справочника");
  const stage = payload.stage ?? "Квалификация";
  if (!SALES_STAGES.includes(stage)) fail(422, "Неизвестный этап сделки");
  if (typeof payload.virtual !== "boolean") fail(422, "Укажите тип сделки");
  const vin = text(payload.vin).toUpperCase();
  if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) fail(422, "VIN должен содержать 17 допустимых символов");
  const closeDate = payload.closeDate || null;
  if (closeDate && (typeof closeDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(closeDate) || !Number.isFinite(Date.parse(closeDate)) || new Date(closeDate).toISOString().slice(0, 10) !== closeDate)) fail(422, "Проверьте дату закрытия");
  const lossReason = text(payload.lossReason);
  if (stage === "Отказ" && !lossReason) fail(422, "Укажите причину отказа");
  return { client_id: clientId, product: text(payload.product, !payload.virtual) || "Модель уточняется", amount: money(payload.amount), stage,
    virtual: payload.virtual, vin, close_date: closeDate, loss_reason: stage === "Отказ" ? lossReason : "" };
}
function checkVersion(row, version) {
  if (row.version !== version) fail(409, "Карточка уже изменена. Обновите её перед сохранением.");
}
function canEdit(row, member) {
  if (!leader(member) && row.assignee_id !== member.id) fail(403, "Изменять карточку может ответственный или руководитель");
}
function map(row) {
  return { id: row.id, clientId: row.client_id, client: row.client, phone: row.phone, city: row.city,
    source: row.source, listing: row.listing, message: row.message, price: Number(row.price || 0),
    product: row.product, amount: Number(row.amount || 0), stage: row.stage, status: row.status,
    assigneeId: row.assignee_id, manager: row.assignee_name || "Не назначен", version: row.version,
    leadId: row.lead_id, virtual: row.virtual, vin: row.vin, closeDate: row.close_date || "",
    lossReason: row.loss_reason, createdAt: row.created_at, closedAt: row.closed_at };
}
export function createSalesRepository(getSql) {
  // Table names are selected exclusively from these fixed repository branches.
  async function row(tx, kind, id, lock = false) {
    const rows = kind === "leads"
      ? lock ? await tx`select * from three_k.leads where id=${id} for update` : await tx`select l.*, m.display_name as assignee_name from three_k.leads l left join three_k.members m on m.user_id=l.assignee_id where l.id=${id}`
      : lock ? await tx`select * from three_k.deals where id=${id} for update` : await tx`select d.*, d.close_date::text as close_date, m.display_name as assignee_name from three_k.deals d left join three_k.members m on m.user_id=d.assignee_id where d.id=${id}`;
    if (!rows[0]) fail(404, "Карточка не найдена");
    return rows[0];
  }
  async function event(tx, kind, id, actor, action) {
    await tx`insert into three_k.sales_events(lead_id,deal_id,actor_id,action) values (${kind === "leads" ? id : null},${kind === "deals" ? id : null},${actor},${action})`;
  }
  async function assign(tx, source) {
    const [rule] = await tx`select member_id from three_k.assignment_rules where source=${source} for share`;
    if (!rule) return null;
    const [person] = await tx`select user_id from three_k.members where user_id=${rule.member_id} and working for share`;
    return person?.user_id || null;
  }
  async function clientForLead(tx, data, actor) {
    await tx`select pg_advisory_xact_lock(hashtextextended(${`three_k:client:${data.phone}`}, 0))`;
    const digits = data.phone.slice(1);
    const matches = await tx`select id from three_k.clients where regexp_replace(phone, '[^0-9]', '', 'g') in (${digits},${digits.startsWith("7") ? `8${digits.slice(1)}` : digits}) limit 2`;
    if (matches.length > 1) fail(409, "Найдено несколько клиентов с этим телефоном. Устраните дубли в справочнике.");
    if (matches[0]) return matches[0].id;
    const [client] = await tx`insert into three_k.clients(form,name,display_name,phone,created_by) values ('Физлицо',${data.client},${data.client},${data.phone},${actor}) returning id`;
    await tx`insert into three_k.client_events(client_id,actor_id,action,changed_fields) values (${client.id},${actor},'created',${tx.array(["name", "phone"])})`;
    return client.id;
  }
  return {
    async summary() {
      const sql = await getSql();
      const [counts] = await sql`select (select count(*)::int from three_k.leads) as leads,
        (select count(*)::int from three_k.deals) as deals, (select count(*)::int from three_k.clients) as clients`;
      return counts;
    },
    async board({ q, status }) {
      const sql = await getSql();
      const rows = await sql`with ranked as (
        select d.*, d.close_date::text as close_date_text, m.display_name as assignee_name,
          count(*) over (partition by d.stage) as stage_count,
          sum(d.amount) over (partition by d.stage) as stage_amount,
          row_number() over (partition by d.stage order by d.created_at desc,d.id desc) as position
        from three_k.deals d left join three_k.members m on m.user_id=d.assignee_id
        where (${status === ""} or d.status=${status})
          and (${q === ""} or strpos(lower(d.client || ' ' || d.product || ' ' || d.id || ' ' || d.vin),lower(${q}))>0)
      ) select * from ranked where position<=30 order by stage,position`;
      const columns = new Map(SALES_STAGES.map(stage => [stage,{stage,total:0,amount:0,items:[],hasMore:false}]));
      for (const row of rows) {
        if (!columns.has(row.stage)) columns.set(row.stage,{stage:row.stage,items:[]});
        const column = columns.get(row.stage);
        column.total = Number(row.stage_count); column.amount = Number(row.stage_amount);
        column.hasMore = column.total > 30;
        column.items.push(map({...row,close_date:row.close_date_text}));
      }
      return { columns: [...columns.values()] };
    },
    async list(kind, { q, status, offset, clientId, stage = "" }) {
      const sql = await getSql();
      const rows = kind === "leads" ? await sql`select l.*, m.display_name as assignee_name from three_k.leads l left join three_k.members m on m.user_id=l.assignee_id
        where (${status === ""} or l.status=${status}) and (${clientId === ""} or l.client_id=${clientId})
        and (${q === ""} or strpos(lower(l.client || ' ' || l.phone || ' ' || l.listing || ' ' || l.id),lower(${q}))>0)
        order by l.created_at desc,l.id desc limit 31 offset ${offset}`
        : await sql`select d.*, d.close_date::text as close_date, m.display_name as assignee_name from three_k.deals d left join three_k.members m on m.user_id=d.assignee_id
        where (${status === ""} or d.status=${status}) and (${clientId === ""} or d.client_id=${clientId})
        and (${stage === ""} or d.stage=${stage})
        and (${q === ""} or strpos(lower(d.client || ' ' || d.product || ' ' || d.id || ' ' || d.vin),lower(${q}))>0)
        order by d.created_at desc,d.id desc limit 31 offset ${offset}`;
      return { items: rows.slice(0,30).map(map), hasMore: rows.length > 30 };
    },
    async get(kind, id) {
      const sql = await getSql();
      const record = map(await row(sql, kind, id));
      record.events = await sql`select e.id,e.action,e.created_at as "createdAt",m.display_name as actor from three_k.sales_events e join three_k.members m on m.user_id=e.actor_id where e.lead_id=${kind === "leads" ? id : null} or e.deal_id=${kind === "deals" ? id : null} order by e.created_at desc,e.id limit 100`;
      if (kind === "leads") {
        const [deal] = await sql`select id from three_k.deals where lead_id=${id}`;
        record.dealId = deal?.id || null;
      }
      return record;
    },
    async create(kind, data, member, requestId, source = "phone") {
      const sql = await getSql();
      const id = await sql.begin(async tx => {
        await tx`select pg_advisory_xact_lock(hashtextextended(${`three_k:sales:${requestId}`},0))`;
        const [existing] = kind === "leads" ? await tx`select id,created_by from three_k.leads where request_id=${requestId}` : await tx`select id,created_by from three_k.deals where request_id=${requestId}`;
        if (existing) {
          if (existing.created_by !== member.id) fail(409, "Идентификатор запроса уже использован");
          return existing.id;
        }
        const assignee = await assign(tx, source);
        let created;
        if (kind === "leads") {
          const clientId = await clientForLead(tx, data, member.id);
          [created] = await tx`insert into three_k.leads ${tx({ ...data, client_id: clientId, assignee_id: assignee,
            source_code: source, source: source === "landing" ? "Лендинг BRP" : "Телефон", created_by: member.id, request_id: requestId })} returning id`;
        } else {
          const [client] = await tx`select display_name from three_k.clients where id=${data.client_id}`;
          if (!client) fail(422, "Клиент не найден в справочнике");
          [created] = await tx`insert into three_k.deals ${tx({ ...data, client: client.display_name, company: client.display_name,
            assignee_id: assignee, source: "CRM: создано вручную", created_by: member.id, request_id: requestId,
            status: ["Успешно", "Отказ"].includes(data.stage) ? "closed" : "open",
            closed_at: ["Успешно", "Отказ"].includes(data.stage) ? new Date() : null })} returning id`;
        }
        await event(tx, kind, created.id, member.id, "Создано");
        return created.id;
      });
      return this.get(kind, id);
    },
    async take(kind, id, version, member, target) {
      const sql = await getSql();
      await sql.begin(async tx => {
        const previous = await row(tx,kind,id,true);
        checkVersion(previous,version);
        if (target !== member.id && !leader(member)) fail(403,"Назначать другого сотрудника может руководитель");
        if (previous.assignee_id && previous.assignee_id !== member.id && !leader(member)) fail(403,"Карточка уже назначена другому сотруднику");
        if (previous.status === "Сделка создана" || previous.status === "closed") fail(409,"Закрытую карточку нельзя переназначить");
        const [person] = await tx`select user_id from three_k.members where user_id=${target} and working for share`;
        if (!person) fail(409,"Ответственный должен начать рабочий день");
        if (kind === "leads") await tx`update three_k.leads set assignee_id=${target},status='В работе',first_response_at=coalesce(first_response_at,now()),version=version+1,updated_at=now() where id=${id}`;
        else await tx`update three_k.deals set assignee_id=${target},version=version+1,updated_at=now() where id=${id}`;
        await event(tx,kind,id,member.id,"Назначен ответственный");
      });
      return this.get(kind,id);
    },
    async moveStage(id, stage, lossReason, version, member) {
      if (!SALES_STAGES.includes(stage)) fail(422,"Неизвестный этап сделки");
      const reason = text(lossReason);
      if (stage === "Отказ" && !reason) fail(422,"Укажите причину отказа");
      const sql = await getSql();
      await sql.begin(async tx => {
        const previous = await row(tx,"deals",id,true);
        canEdit(previous,member); checkVersion(previous,version);
        const nextReason = stage === "Отказ" ? reason : "";
        if (previous.stage === stage && previous.loss_reason === nextReason) return;
        const closed = ["Успешно","Отказ"].includes(stage);
        await tx`update three_k.deals set stage=${stage},loss_reason=${nextReason},
          status=${closed ? "closed" : "open"},closed_at=case when ${closed} then coalesce(closed_at,now()) else null end,
          version=version+1,updated_at=now() where id=${id}`;
        await event(tx,"deals",id,member.id,`Этап: ${previous.stage} → ${stage}`);
      });
      return this.get("deals",id);
    },
    async updateDeal(id, data, version, member) {
      const sql = await getSql();
      await sql.begin(async tx => {
        const previous = await row(tx,"deals",id,true);
        canEdit(previous,member); checkVersion(previous,version);
        if (previous.client_id && previous.client_id !== data.client_id) fail(422,"Изменение клиента связанной сделки запрещено");
        const [client] = await tx`select display_name from three_k.clients where id=${data.client_id}`;
        if (!client) fail(422,"Клиент не найден");
        const closed = ["Успешно","Отказ"].includes(data.stage);
        await tx`update three_k.deals set ${tx({ ...data, client:client.display_name, company:client.display_name,
          status:closed ? "closed" : "open", closed_at: closed ? previous.closed_at || new Date() : null })},version=version+1,updated_at=now() where id=${id}`;
        await event(tx,"deals",id,member.id,previous.stage !== data.stage ? `Этап: ${data.stage}` : "Карточка обновлена");
      });
      return this.get("deals",id);
    },
    async convert(id, version, member) {
      const sql = await getSql();
      const dealId = await sql.begin(async tx => {
        const lead = await row(tx,"leads",id,true);
        canEdit(lead,member);
        const [existing] = await tx`select id from three_k.deals where lead_id=${id}`;
        if (existing) return existing.id;
        checkVersion(lead,version);
        const identity = validateClient({ form: "Физлицо", name: lead.client, phone: lead.phone });
        const clientId = lead.client_id || await clientForLead(tx, { ...lead, phone: identity.phone }, member.id);
        const [client] = await tx`select display_name from three_k.clients where id=${clientId}`;
        const [deal] = await tx`insert into three_k.deals(client_id,client,company,product,amount,assignee_id,lead_id,source,created_by)
          values (${clientId},${client.display_name},${client.display_name},${lead.listing},${lead.price},${lead.assignee_id},${id},${lead.source},${member.id}) returning id`;
        await tx`update three_k.leads set client_id=${clientId},status='Сделка создана',version=version+1,updated_at=now() where id=${id}`;
        await event(tx,"leads",id,member.id,`Создана сделка ${deal.id}`);
        await event(tx,"deals",deal.id,member.id,`Создано из лида ${id}`);
        return deal.id;
      });
      return this.get("deals",dealId);
    },
  };
}

export async function salesRoute(repository, member, method, url, path, payload) {
  if (path === "/sales/summary" && method === "GET") return repository.summary();
  if (path === "/deals/board" && method === "GET") return repository.board({q:(url.searchParams.get("q") || "").trim().slice(0,200),status:url.searchParams.get("status") || ""});
  const landing = path === "/intake/landing";
  const match = path.match(/^\/(leads|deals)(?:\/([LD]-[a-z0-9-]{1,64})(?:\/(take|convert|stage))?)?$/i);
  if (!match && !landing) return undefined;
  const [, rawKind = "leads", id, action] = match || [];
  const kind = rawKind.toLowerCase();
  if (method === "GET" && !landing && !action) {
    if (id) return repository.get(kind,id);
    const offset = Number(url.searchParams.get("offset") || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) fail(422,"Некорректная страница");
    return repository.list(kind,{ q:(url.searchParams.get("q") || "").trim().slice(0,200),status:url.searchParams.get("status") || "",clientId:url.searchParams.get("clientId") || "",stage:(url.searchParams.get("stage") || "").slice(0,500),offset });
  }
  if (method !== "POST") fail(405,"Метод не поддерживается");
  if (!id) {
    const data = validateSale(payload,kind);
    if (!uuid.test(payload.requestId || "")) fail(422,"Не указан идентификатор запроса");
    return repository.create(kind,data,member,payload.requestId,landing ? "landing" : "phone");
  }
  if (!Number.isSafeInteger(payload?.version) || payload.version < 1) fail(422,"Версия карточки обязательна");
  if (action === "take") {
    const target = payload.memberId || member.id;
    if (!uuid.test(target)) fail(422,"Некорректный ответственный");
    return repository.take(kind,id,payload.version,member,target);
  }
  if (action === "convert" && kind === "leads") return repository.convert(id,payload.version,member);
  if (action === "stage" && kind === "deals") return repository.moveStage(id,payload.stage,payload.lossReason,payload.version,member);
  if (!action && kind === "deals") return repository.updateDeal(id,validateSale(payload,kind),payload.version,member);
  fail(405,"Метод не поддерживается");
}
