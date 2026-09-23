const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-crm-api-token",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-max-age": "86400",
};

const leads = [
  {
    id: "L-2481",
    client: "Дмитрий Кузнецов",
    phone: "+7 921 334-18-90",
    city: "Санкт-Петербург",
    time: "09:42",
    source: "Авито",
    listing: "Can-Am Maverick X3 X rs Turbo RR 2024",
    category: "Багги",
    price: "5 950 000 ₽",
    manager: "Анна",
    status: "Новый",
    nextTask: "Ответить в Авито и уточнить способ оплаты",
  },
  {
    id: "L-2479",
    client: "Илья Соколов",
    phone: "+7 916 443-77-12",
    city: "Москва",
    time: "10:18",
    source: "Авито",
    listing: "Sea-Doo RXT-X 325",
    category: "Гидроцикл",
    price: "2 780 000 ₽",
    manager: "Олег",
    status: "В работе",
    nextTask: "Посчитать доставку и вернуться до 13:00",
  },
  {
    id: "L-2474",
    client: "ООО Север",
    phone: "+7 812 707-40-66",
    city: "Архангельск",
    time: "Вчера",
    source: "Авито",
    listing: "Can-Am Defender MAX HD10 Limited",
    category: "Мотовездеход",
    price: "4 420 000 ₽",
    manager: "Мария",
    status: "Сделка создана",
    nextTask: "Подготовить КП и зафиксировать резерв",
  },
];

const deals = [
  {
    id: "D-1059",
    client: "ООО Север",
    company: "ООО Север",
    product: "Can-Am Defender MAX HD10 Limited",
    amount: "8 840 000 ₽",
    stage: "Ожидается оплата",
    manager: "Мария Лебедева",
    task: "Проверить поступление оплаты",
    due: "Сегодня, 16:00",
    status: "open",
    virtual: false,
  },
  {
    id: "D-1058",
    client: "Илья Соколов",
    company: "Физлицо",
    product: "Sea-Doo RXT-X 325",
    amount: "2 780 000 ₽",
    stage: "Подбор",
    manager: "Олег Романов",
    task: "Отправить варианты доставки",
    due: "Сегодня, 13:00",
    status: "open",
    virtual: false,
  },
  {
    id: "D-1054",
    client: "Дмитрий Кузнецов",
    company: "ИП Кузнецов Д.А.",
    product: "Can-Am Maverick X3 X rs Turbo RR",
    amount: "5 950 000 ₽",
    stage: "Квалификация",
    manager: "Анна Волкова",
    task: "Уточнить форму оплаты",
    due: "Сегодня, 12:30",
    status: "open",
    virtual: true,
  },
];

const clients = [
  {
    id: "C-104",
    form: "Физлицо",
    name: "Алексей Орлов",
    displayName: "Алексей Орлов",
    inn: "781245690112",
    phone: "+7 911 214-55-09",
    email: "a.orlov@example.ru",
  },
  {
    id: "C-101",
    form: "ИП",
    name: "Кузнецов Дмитрий Андреевич",
    displayName: "ИП Кузнецов Д.А.",
    inn: "780512345678",
    phone: "+7 921 334-18-90",
    email: "dk@kuznetsov.pro",
  },
  {
    id: "C-102",
    form: "ООО",
    name: "Север",
    displayName: "ООО Север",
    inn: "2901309488",
    phone: "+7 812 707-40-66",
    email: "info@sever-base.ru",
  },
];

const managers = [
  { id: "maria", name: "Мария Лебедева", initials: "МЛ", schedule: "09:00-18:00", focus: "Юрлица и крупные сделки" },
  { id: "anna", name: "Анна Волкова", initials: "АВ", schedule: "10:00-19:00", focus: "Багги и квадроциклы" },
  { id: "oleg", name: "Олег Романов", initials: "ОР", schedule: "09:00-18:00", focus: "Гидроциклы и доставка" },
];

const reportSummary = {
  period: "Сентябрь 2026",
  leads: 64,
  totalDeals: 31,
  inWork: 18,
  closed: 13,
  revenue: "42,8 млн ₽",
  margin: "9,6 млн ₽",
  conversion: "20,3%",
};

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

function notFound(pathname) {
  return json({ error: "not_found", message: `Route ${pathname} was not found` }, { status: 404 });
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function nextId(prefix, items) {
  const numericIds = items
    .map((item) => Number(String(item.id).replace(`${prefix}-`, "")))
    .filter(Number.isFinite);
  return `${prefix}-${Math.max(...numericIds, 0) + 1}`;
}

function createLead(payload) {
  if (!payload?.client || !payload?.phone) {
    return json(
      { error: "validation_error", message: "Fields client and phone are required" },
      { status: 422 },
    );
  }

  const lead = {
    id: nextId("L", leads),
    client: String(payload.client),
    phone: String(payload.phone),
    city: String(payload.city || "Не указан"),
    time: "Только что",
    source: String(payload.source || "CRM API"),
    listing: String(payload.listing || "Модель уточняется"),
    category: String(payload.category || "Новая заявка"),
    price: String(payload.price || "Цена уточняется"),
    manager: String(payload.manager || "Не назначен"),
    status: "Новый",
    nextTask: String(payload.nextTask || "Связаться с клиентом в течение 15 минут"),
  };

  leads.unshift(lead);
  return json({ data: lead }, { status: 201 });
}

function createDeal(payload) {
  if (!payload?.client || !payload?.product) {
    return json(
      { error: "validation_error", message: "Fields client and product are required" },
      { status: 422 },
    );
  }

  const deal = {
    id: nextId("D", deals),
    client: String(payload.client),
    company: String(payload.company || payload.client),
    product: String(payload.product),
    amount: String(payload.amount || "0 ₽"),
    stage: String(payload.stage || "Квалификация"),
    manager: String(payload.manager || "Не назначен"),
    task: String(payload.task || "Проверить наличие и связаться с клиентом"),
    due: String(payload.due || "Сегодня, 18:00"),
    status: "open",
    virtual: Boolean(payload.virtual),
  };

  deals.unshift(deal);
  return json({ data: deal }, { status: 201 });
}

export async function handler(request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === "GET" && ["/", "/health"].includes(pathname)) {
    return json({ ok: true, service: "crm-api", version: "1.0.0" });
  }

  if (request.method === "GET" && pathname === "/leads") return json({ data: leads });
  if (request.method === "GET" && pathname === "/deals") return json({ data: deals });
  if (request.method === "GET" && pathname === "/clients") return json({ data: clients });
  if (request.method === "GET" && pathname === "/managers") return json({ data: managers });
  if (request.method === "GET" && pathname === "/reports/summary") return json({ data: reportSummary });

  if (request.method === "POST" && pathname === "/leads") return createLead(await readJson(request));
  if (request.method === "POST" && pathname === "/deals") return createDeal(await readJson(request));

  return notFound(pathname);
}

if (globalThis.Deno?.serve) {
  Deno.serve(handler);
}
