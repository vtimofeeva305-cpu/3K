import { AccessError, accessRoute, createAccessRepository } from "./access.js";

const FUNCTION_SLUG = "three-k-api";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-max-age": "86400",
};

let sqlClientPromise;

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...corsHeaders,
      ...jsonHeaders,
      ...init.headers,
    },
  });
}

function normalizePath(pathname) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const prefixes = [`/functions/v1/${FUNCTION_SLUG}`, `/${FUNCTION_SLUG}`];

  for (const prefix of prefixes) {
    if (normalized === prefix) return "/";
    if (normalized.startsWith(`${prefix}/`)) return normalized.slice(prefix.length);
  }

  return normalized;
}

function requiredText(payload, field) {
  const value = payload?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function moneyToNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("ru-RU").format(Number(value || 0))} ₽`;
}

function mapLead(row) {
  return {
    id: row.id,
    client: row.client,
    phone: row.phone,
    city: row.city,
    time: row.display_time,
    source: row.source,
    listing: row.listing,
    category: row.category,
    price: formatMoney(row.price),
    manager: row.manager,
    status: row.status,
    nextTask: row.next_task,
  };
}

function mapDeal(row) {
  return {
    id: row.id,
    client: row.client,
    company: row.company,
    product: row.product,
    amount: formatMoney(row.amount),
    stage: row.stage,
    manager: row.manager,
    task: row.task,
    due: row.due,
    status: row.status,
    virtual: row.virtual,
  };
}

function mapClient(row) {
  return {
    id: row.id,
    form: row.form,
    name: row.name,
    displayName: row.display_name,
    inn: row.inn,
    phone: row.phone,
    email: row.email,
  };
}

async function getSql() {
  if (!sqlClientPromise) {
    sqlClientPromise = (async () => {
      const connectionString = globalThis.Deno?.env?.get("SUPABASE_DB_URL");
      if (!connectionString) throw new Error("SUPABASE_DB_URL is not configured");

      const { default: postgres } = await import("npm:postgres@3.4.7");
      return postgres(connectionString, {
        prepare: false,
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
      });
    })();
  }

  return sqlClientPromise;
}

export const databaseRepository = {
  async listLeads() {
    const sql = await getSql();
    const rows = await sql`
      select id, client, phone, city, display_time, source, listing, category,
             price, manager, status, next_task
      from three_k.leads
      order by created_at desc
    `;
    return rows.map(mapLead);
  },

  async listDeals() {
    const sql = await getSql();
    const rows = await sql`
      select id, client, company, product, amount, stage, manager, task, due,
             status, virtual
      from three_k.deals
      order by created_at desc
    `;
    return rows.map(mapDeal);
  },

  async listClients() {
    const sql = await getSql();
    const rows = await sql`
      select id, form, name, display_name, inn, phone, email
      from three_k.clients
      order by created_at desc
    `;
    return rows.map(mapClient);
  },

  async listManagers() {
    const sql = await getSql();
    return sql`
      select id, name, initials, schedule, focus
      from three_k.managers
      order by sort_order, name
    `;
  },

  async reportSummary() {
    const sql = await getSql();
    const [row] = await sql`
      select period, leads, total_deals, in_work, closed, revenue, margin, conversion
      from three_k.report_summaries
      where id = 'current'
    `;

    if (!row) return null;

    return {
      period: row.period,
      leads: row.leads,
      totalDeals: row.total_deals,
      inWork: row.in_work,
      closed: row.closed,
      revenue: row.revenue,
      margin: row.margin,
      conversion: row.conversion,
    };
  },

  async createLead(payload) {
    const sql = await getSql();
    const [row] = await sql`
      insert into three_k.leads (
        client, phone, city, display_time, source, listing, category,
        price, manager, status, next_task
      ) values (
        ${payload.client}, ${payload.phone}, ${payload.city}, 'Только что',
        ${payload.source}, ${payload.listing}, ${payload.category},
        ${moneyToNumber(payload.price)}, ${payload.manager}, 'Новый', ${payload.nextTask}
      )
      returning id, client, phone, city, display_time, source, listing, category,
                price, manager, status, next_task
    `;
    return mapLead(row);
  },

  async createDeal(payload) {
    const sql = await getSql();
    const [row] = await sql`
      insert into three_k.deals (
        client, company, product, amount, stage, manager, task, due, status, virtual
      ) values (
        ${payload.client}, ${payload.company}, ${payload.product},
        ${moneyToNumber(payload.amount)}, ${payload.stage}, ${payload.manager},
        ${payload.task}, ${payload.due}, 'open', ${payload.virtual}
      )
      returning id, client, company, product, amount, stage, manager, task, due,
                status, virtual
    `;
    return mapDeal(row);
  },
};

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function authenticateSupabaseUser(request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const supabaseUrl = globalThis.Deno?.env?.get("SUPABASE_URL");
  const configuredKeys = JSON.parse(
    globalThis.Deno?.env?.get("SUPABASE_PUBLISHABLE_KEYS") || "{}",
  );
  const configuredDefault = configuredKeys.default;
  const publishableKey = configuredDefault
    ? globalThis.Deno?.env?.get(configuredDefault) || configuredDefault
    : globalThis.Deno?.env?.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !publishableKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      authorization,
      apikey: publishableKey,
    },
  });

  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? user : null;
}

export function createHandler(repository = databaseRepository, authenticate = authenticateSupabaseUser, access = createAccessRepository(getSql)) {
  return async function handler(request) {
    const url = new URL(request.url);
    const pathname = normalizePath(url.pathname);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === "GET" && ["/", "/health"].includes(pathname)) {
      return json({ ok: true, service: "3K", function: FUNCTION_SLUG, version: "1.0.0" });
    }

    try {
      const user = await authenticate(request);
      if (!user) {
        return json(
          { error: "unauthorized", message: "A valid Supabase user session is required" },
          { status: 401 },
        );
      }

      const member = await access.member(user.id);
      const accessPayload = request.method === "POST" && !["/leads", "/deals"].includes(pathname)
        ? await readJson(request) : null;
      const result = await accessRoute(access, user, member, request.method, pathname, accessPayload);
      if (result !== undefined) return json({ data: result });

      if (request.method === "GET" && pathname === "/leads") {
        return json({ data: await repository.listLeads() });
      }
      if (request.method === "GET" && pathname === "/deals") {
        return json({ data: await repository.listDeals() });
      }
      if (request.method === "GET" && pathname === "/clients") {
        return json({ data: await repository.listClients() });
      }
      if (request.method === "GET" && pathname === "/managers") {
        return json({ data: await repository.listManagers() });
      }
      if (request.method === "GET" && pathname === "/reports/summary") {
        return json({ data: await repository.reportSummary() });
      }

      if (request.method === "POST" && pathname === "/leads") {
        const payload = await readJson(request);
        const client = requiredText(payload, "client");
        const phone = requiredText(payload, "phone");
        if (!client || !phone) {
          return json(
            { error: "validation_error", message: "Fields client and phone are required" },
            { status: 422 },
          );
        }

        const lead = await repository.createLead({
          client,
          phone,
          city: requiredText(payload, "city") || "Не указан",
          source: requiredText(payload, "source") || "3K API",
          listing: requiredText(payload, "listing") || "Модель уточняется",
          category: requiredText(payload, "category") || "Новая заявка",
          price: payload?.price || 0,
          manager: member.role === "manager" ? member.name : requiredText(payload, "manager") || "Не назначен",
          nextTask: requiredText(payload, "nextTask") || "Связаться с клиентом в течение 15 минут",
        });
        return json({ data: lead }, { status: 201 });
      }

      if (request.method === "POST" && pathname === "/deals") {
        const payload = await readJson(request);
        const client = requiredText(payload, "client");
        const product = requiredText(payload, "product");
        if (!client || !product) {
          return json(
            { error: "validation_error", message: "Fields client and product are required" },
            { status: 422 },
          );
        }

        const deal = await repository.createDeal({
          client,
          company: requiredText(payload, "company") || client,
          product,
          amount: payload?.amount || 0,
          stage: requiredText(payload, "stage") || "Квалификация",
          manager: member.role === "manager" ? member.name : requiredText(payload, "manager") || "Не назначен",
          task: requiredText(payload, "task") || "Проверить наличие и связаться с клиентом",
          due: requiredText(payload, "due") || "Сегодня, 18:00",
          virtual: Boolean(payload?.virtual),
        });
        return json({ data: deal }, { status: 201 });
      }

      return json(
        { error: "not_found", message: `Route ${pathname} was not found` },
        { status: 404 },
      );
    } catch (error) {
      if (error instanceof AccessError) return json({ error: "access_error", message: error.message }, { status: error.status });
      console.error("3K API request failed", error);
      return json(
        { error: "internal_error", message: "The 3K backend could not process the request" },
        { status: 500 },
      );
    }
  };
}

export const handler = createHandler();

if (globalThis.Deno?.serve) {
  Deno.serve(handler);
}
