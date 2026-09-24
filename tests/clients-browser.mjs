import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true });
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5176";
const id = "00000000-0000-4000-8000-000000000001";
const member = { id, name: "Тест", role: "rop", working: true };
let client;
let tasks = [];
let conflict = false;
let creates = 0;
let taskConflict = false;
const taskEvents = [];
const errors = [];
try {
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("three-k-auth-session", JSON.stringify({ accessToken: "test", expiresAt: Date.now() + 3600000 })));
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/auth/v1/user", route => route.fulfill({ json: { id, user_metadata: { name: "Тест" } } }));
  await page.route("**/functions/v1/three-k-api/**", async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.split("three-k-api")[1];
    const write = route.request().method() === "POST";
    const payload = write ? route.request().postDataJSON() : null;
    let data;
    if (path === "/me") data = { member };
    else if (path === "/team") data = [member];
    else if (path === "/assignment-rules") data = {};
    else if (path === "/notifications/count") data = {unread:0};
    else if (path === "/deals" || path === "/leads") data = {items:[],hasMore:false};
    else if (path === "/sales/summary") data = { leads: 0, deals: 0, clients: client ? 1 : 0 };
    else if (path === "/tasks" && write) {
      tasks.push({ id, ...payload, contextId: payload.contextId, label: client.name, version: 1, assignee: member.name, assigneeId: member.id });
      taskEvents.push({id:"event-1",action:"Создана задача",actor:member.name,createdAt:new Date().toISOString()}); data={id};
    }
    else if (path === "/tasks") {
      const today = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Moscow"}).format(new Date());
      const filter=url.searchParams.get("filter");
      data={items:tasks.filter(task=>filter==="completed" ? !!task.completedAt : !task.completedAt && (filter==="active" || filter==="today" && task.date===today || filter==="overdue" && task.date<today || filter==="upcoming" && task.date>today)),hasMore:false};
    }
    else if (path === `/tasks/${id}/history`) data=taskEvents;
    else if (path === `/tasks/${id}` && write) {
      if(taskConflict) return route.fulfill({status:409,json:{message:"Задача изменена другим сотрудником"}});
      Object.assign(tasks[0],payload,{version:tasks[0].version+1});
      if("completed" in payload) tasks[0].completedAt=payload.completed ? new Date().toISOString() : null;
      taskEvents.push({id:crypto.randomUUID(),action:"Задача обновлена",actor:member.name,createdAt:new Date().toISOString()});data={id};
    }
    else if (path === "/clients" && write) { creates++; client = { ...payload, id: "C-1", displayName: payload.name, version: 1 }; data = client; }
    else if (path === "/clients") data = { items: client && (!url.searchParams.get("q") || client.phone.includes(url.searchParams.get("q"))) ? [client] : [], hasMore: false };
    else if (path === "/clients/C-1/tasks" && write) { tasks.push({ id, ...payload, version: 1, assignee: member.name, assigneeId: member.id }); data = { id }; }
    else if (path === "/clients/C-1/tasks") data = tasks;
    else if (path === `/clients/C-1/tasks/${id}` && write) { tasks[0].completedAt = payload.completed ? new Date().toISOString() : null; tasks[0].version++; data = { id }; }
    else if (path === "/clients/C-1" && write) {
      if (conflict) return route.fulfill({ status: 409, json: { message: "Карточку изменил другой сотрудник" } });
      client = { ...payload, displayName: payload.name, version: client.version + 1 }; data = client;
    } else if (path === "/clients/C-1") data = client;
    else return route.fulfill({ status: 404, json: { message: "Unknown route" } });
    return route.fulfill({ json: { data } });
  });
  await page.goto(base);
  await page.getByRole("button", { name: "Клиенты", exact: true }).click();
  await page.getByText("Клиентов пока нет", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Новый клиент", exact: true }).click();
  await page.getByLabel("Название / ФИО", { exact: true }).fill("Клиент проверки");
  await page.getByLabel("Номер телефона", { exact: true }).fill("+79000000001");
  await page.getByLabel("Паспортные данные", { exact: true }).fill("Тестовый реквизит");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.getByRole("heading", { name: "Клиент проверки", exact: true }).waitFor();
  assert.equal(creates, 1);
  await page.reload();
  await page.getByRole("button", { name: "Клиенты", exact: true }).click();
  await page.locator(".client-list-item").first().click();
  await page.getByLabel("Паспортные данные", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("Паспортные данные", { exact: true }).inputValue(), "Тестовый реквизит");
  conflict = true;
  await page.getByLabel("Название / ФИО", { exact: true }).fill("Несохранённое изменение");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "другой сотрудник" }).waitFor();
  assert.equal(await page.getByLabel("Название / ФИО", { exact: true }).inputValue(), "Несохранённое изменение");
  await page.getByRole("button", { name: "Отменить изменения", exact: true }).click();
  assert.equal(await page.getByLabel("Название / ФИО", { exact: true }).inputValue(), "Клиент проверки");
  await page.getByLabel("Новая задача", { exact: true }).fill("Перезвонить клиенту");
  await page.getByLabel("Дата задачи", { exact: true }).fill("2020-01-01");
  await page.getByRole("button", { name: "Поставить задачу", exact: true }).click();
  await page.getByText("Перезвонить клиенту", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await page.getByLabel("Фильтр задач").selectOption("completed");
  await page.getByRole("button", { name: "Вернуть", exact: true }).waitFor();
  await page.getByRole("button", { name: "Вернуть", exact: true }).click();
  await page.getByLabel("Фильтр задач").selectOption("active");
  await page.getByRole("button",{name:"Изменить: Перезвонить клиенту",exact:true}).click();
  await page.getByLabel("Новый срок задачи").fill("2099-01-01");
  taskConflict=true;
  await page.getByRole("button",{name:"Сохранить задачу",exact:true}).click();
  await page.getByRole("alert").filter({hasText:"Задача изменена"}).waitFor();
  assert.equal(await page.getByLabel("Новый срок задачи").inputValue(),"2099-01-01");
  await page.getByRole("button",{name:"Отменить редактирование задачи",exact:true}).click();
  taskConflict=false;
  await page.getByRole("button",{name:"Сегодня",exact:true}).click();
  await page.getByLabel("Фильтр задач").selectOption("overdue");
  await page.getByText("Перезвонить клиенту",{exact:true}).waitFor();
  await page.getByRole("button",{name:"История: Перезвонить клиенту",exact:true}).click();
  await page.getByText("Создана задача",{exact:true}).waitFor();
  await page.getByRole("button",{name:"Изменить: Перезвонить клиенту",exact:true}).click();
  await page.getByLabel("Новый срок задачи").fill("2099-01-01");
  await page.getByRole("button",{name:"Сохранить задачу",exact:true}).click();
  await page.getByText("Нет задач по выбранному фильтру",{exact:true}).waitFor();
  await page.getByLabel("Фильтр задач").selectOption("upcoming");
  await page.getByText("Перезвонить клиенту",{exact:true}).waitFor();
  await page.reload();
  await page.getByLabel("Фильтр задач").selectOption("upcoming");
  await page.getByText("Перезвонить клиенту",{exact:true}).waitFor();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: `/tmp/three-k-tasks-${width}.png`, fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
  }
  await page.getByRole("button",{name:"C-1 · Клиент проверки",exact:true}).click();
  await page.getByRole("heading",{name:"Клиент проверки",exact:true}).waitFor();
  assert.equal(await page.getByLabel("Паспортные данные",{exact:true}).inputValue(),"Тестовый реквизит");
  assert.deepEqual(errors, []);
  console.log("Clients and tasks: creation, completion/reopening, task conflict draft, rescheduling, Today overdue/upcoming, history, reload and desktop/mobile passed (mock API).");
} finally { await browser.close(); }
