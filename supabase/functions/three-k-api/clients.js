import { AccessError } from "./access.js";

const fields = { form: "form", name: "name", phone: "phone", inn: "inn", email: "email",
  address: "address", passport: "passport", legalAddress: "legal_address", kpp: "kpp",
  bik: "bik", bank: "bank", account: "account", director: "director" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizePhone(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "8") digits = `7${digits.slice(1)}`;
  return digits ? `+${digits}` : "";
}

export function validateClient(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new AccessError(422, "Некорректные данные клиента");
  const result = {};
  for (const [key, column] of Object.entries(fields)) {
    const value = payload[key] ?? "";
    if (typeof value !== "string" || value.length > (key === "passport" ? 1000 : 500)) throw new AccessError(422, `Некорректное поле: ${key}`);
    result[column] = value.trim();
  }
  if (!["Физлицо", "ИП", "ООО"].includes(result.form)) throw new AccessError(422, "Выберите ОПФ клиента");
  if (!result.name) throw new AccessError(422, "Укажите название или ФИО");
  if (!/^[+\d\s().-]+$/.test(result.phone)) throw new AccessError(422, "Укажите корректный телефон");
  result.phone = normalizePhone(result.phone);
  if (!/^\+\d{10,15}$/.test(result.phone)) throw new AccessError(422, "Укажите корректный телефон");
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new AccessError(422, "Проверьте адрес почты");
  if (result.inn && !/^\d{10}(\d{2})?$/.test(result.inn)) throw new AccessError(422, "ИНН должен содержать 10 или 12 цифр");
  for (const [field, length, label] of [["kpp", 9, "КПП"], ["bik", 9, "БИК"], ["account", 20, "Расчётный счёт"]]) {
    if (result[field] && !new RegExp(`^\\d{${length}}$`).test(result[field])) throw new AccessError(422, `${label}: требуется ${length} цифр`);
  }
  result.display_name = result.name;
  return result;
}

function mapClient(row) {
  const client = { id: row.id, displayName: row.display_name, version: row.version, updatedAt: row.updated_at };
  for (const [key, column] of Object.entries(fields)) client[key] = row[column] || "";
  return client;
}

export function createClientRepository(getSql) {
  return {
    async tasks(clientId) {
      const sql = await getSql();
      return sql`select t.id, t.title, t.due_date::text as date, t.completed_at as "completedAt", t.version,
        t.assignee_id as "assigneeId", m.display_name as assignee
        from three_k.client_tasks t join three_k.members m on m.user_id = t.assignee_id
        where t.client_id = ${clientId} order by t.due_date, t.id limit 500`;
    },
    async createTask(clientId, payload, actor) {
      const sql = await getSql();
      const [row] = await sql`insert into three_k.client_tasks(client_id, title, due_date, assignee_id, request_id)
        select id, ${payload.title}, ${payload.date}::date, ${actor}, ${payload.requestId}
        from three_k.clients where id = ${clientId}
        on conflict(request_id) do update set request_id = excluded.request_id
        where client_tasks.assignee_id = ${actor} and client_tasks.client_id = ${clientId}
        returning id`;
      if (!row) throw new AccessError(409, "Клиент недоступен или запрос уже использован");
      return row;
    },
    async completeTask(clientId, taskId, payload, member) {
      const sql = await getSql();
      const [row] = await sql`update three_k.client_tasks
        set completed_at = case when ${payload.completed} then now() else null end, version = version + 1
        where id = ${taskId} and client_id = ${clientId} and version = ${payload.version}
        and (assignee_id = ${member.id} or ${["rop", "superadmin"].includes(member.role)}) returning id`;
      if (!row) throw new AccessError(409, "Задача изменена или у вас нет прав на её изменение. Обновите список.");
      return row;
    },
    async list({ q, limit, offset }) {
      const sql = await getSql();
      const digits = q.replace(/\D/g, "");
      const rows = await sql`select id, form, name, display_name, phone, inn, version from three_k.clients
        where ${q === ""} or strpos(lower(display_name), lower(${q})) > 0
        or (${digits.length >= 3} and (strpos(regexp_replace(phone, '[^0-9]', '', 'g'), ${digits}) > 0 or strpos(coalesce(inn, ''), ${digits}) > 0))
        order by display_name, id limit ${limit + 1} offset ${offset}`;
      return { items: rows.slice(0, limit).map(row => ({ id: row.id, form: row.form, name: row.name,
        displayName: row.display_name, phone: row.phone, inn: row.inn, version: row.version })), hasMore: rows.length > limit };
    },
    async get(id) {
      const sql = await getSql();
      const [row] = await sql`select * from three_k.clients where id = ${id}`;
      if (!row) throw new AccessError(404, "Клиент не найден");
      return mapClient(row);
    },
    async create(data, actor, requestId) {
      const sql = await getSql();
      return sql.begin(async tx => {
        // Serialize retries and matching identities before checking for duplicates.
        for (const key of [requestId, data.phone, data.inn].filter(Boolean).sort()) {
          await tx`select pg_advisory_xact_lock(hashtextextended(${`three_k:client:${key}`}, 0))`;
        }
        const [existing] = await tx`select * from three_k.clients where request_id = ${requestId}`;
        if (existing) {
          if (existing.created_by !== actor) throw new AccessError(409, "Повторите создание с новой формой");
          return mapClient(existing);
        }
        const phoneDigits = data.phone.slice(1);
        const [duplicate] = await tx`select id from three_k.clients
          where regexp_replace(phone, '[^0-9]', '', 'g') in (${phoneDigits}, ${phoneDigits.startsWith('7') ? `8${phoneDigits.slice(1)}` : phoneDigits})
          or (${data.inn !== ""} and inn = ${data.inn}) limit 1`;
        if (duplicate) throw new AccessError(409, "Клиент с таким телефоном или ИНН уже есть. Найдите его в справочнике.");
        const [row] = await tx`insert into three_k.clients ${tx({ ...data, created_by: actor, request_id: requestId })} returning *`;
        await tx`insert into three_k.client_events(client_id, actor_id, action, changed_fields)
          values (${row.id}, ${actor}, 'created', ${tx.array(Object.keys(data))})`;
        return mapClient(row);
      });
    },
    async update(id, data, version, actor) {
      const sql = await getSql();
      return sql.begin(async tx => {
        for (const key of [data.phone, data.inn].filter(Boolean).sort()) {
          await tx`select pg_advisory_xact_lock(hashtextextended(${`three_k:client:${key}`}, 0))`;
        }
        const [previous] = await tx`select * from three_k.clients where id = ${id} for update`;
        if (!previous) throw new AccessError(404, "Клиент не найден");
        if (previous.version !== version) throw new AccessError(409, "Карточку изменил другой сотрудник. Обновите её перед сохранением.");
        if (previous.phone !== data.phone || (previous.inn || "") !== data.inn) {
          const phoneDigits = data.phone.slice(1);
          const [duplicate] = await tx`select id from three_k.clients where id <> ${id} and (
            regexp_replace(phone, '[^0-9]', '', 'g') in (${phoneDigits}, ${phoneDigits.startsWith('7') ? `8${phoneDigits.slice(1)}` : phoneDigits})
            or (${data.inn !== ""} and inn = ${data.inn})) limit 1`;
          if (duplicate) throw new AccessError(409, "Другой клиент уже использует этот телефон или ИНН");
        }
        const changed = Object.keys(data).filter(key => (previous[key] || "") !== data[key]);
        if (!changed.length) return mapClient(previous);
        const [row] = await tx`update three_k.clients set ${tx(data)}, version = version + 1, updated_at = now()
          where id = ${id} returning *`;
        await tx`insert into three_k.client_events(client_id, actor_id, action, changed_fields)
          values (${id}, ${actor}, 'updated', ${tx.array(changed)})`;
        return mapClient(row);
      });
    },
  };
}

export async function clientRoute(repository, member, method, url, path, payload) {
  if (path !== "/clients" && !path.startsWith("/clients/")) return undefined;
  if (path === "/clients") {
    if (method === "GET") {
      const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
      const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
      if (!Number.isSafeInteger(limit) || !Number.isSafeInteger(offset)) throw new AccessError(422, "Некорректная страница");
      return repository.list({ q: (url.searchParams.get("q") || "").trim().slice(0, 200), limit, offset });
    }
    if (method === "POST") {
      const data = validateClient(payload);
      if (!uuid.test(payload.requestId || "")) throw new AccessError(422, "Не указан идентификатор запроса");
      return repository.create(data, member.id, payload.requestId);
    }
  } else {
    const task = path.match(/^\/clients\/(C-[a-z0-9-]{1,64})\/tasks(?:\/([0-9a-f-]{36}))?$/i);
    if (task) {
      if (method === "GET" && !task[2]) return repository.tasks(task[1]);
      if (method === "POST" && !task[2]) {
        const title = typeof payload?.title === "string" ? payload.title.trim() : "";
        if (!title || title.length > 500) throw new AccessError(422, "Укажите задачу до 500 символов");
        const date = payload?.date;
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new AccessError(422, "Укажите корректную дату задачи");
        if (!uuid.test(payload.requestId || "")) throw new AccessError(422, "Не указан идентификатор запроса");
        return repository.createTask(task[1], { title, date, requestId: payload.requestId }, member.id);
      }
      if (method === "POST" && uuid.test(task[2] || "")) {
        if (typeof payload?.completed !== "boolean" || !Number.isSafeInteger(payload?.version) || payload.version < 1) throw new AccessError(422, "Некорректный статус задачи");
        return repository.completeTask(task[1], task[2], payload, member);
      }
      throw new AccessError(405, "Метод не поддерживается");
    }
    const id = path.slice("/clients/".length);
    if (!/^C-[a-z0-9-]{1,64}$/i.test(id)) throw new AccessError(422, "Некорректный идентификатор клиента");
    if (method === "GET") return repository.get(id);
    if (method === "POST") {
      if (!Number.isSafeInteger(payload?.version) || payload.version < 1) throw new AccessError(422, "Версия карточки обязательна");
      return repository.update(id, validateClient(payload), payload.version, member.id);
    }
  }
  throw new AccessError(405, "Метод не поддерживается");
}
