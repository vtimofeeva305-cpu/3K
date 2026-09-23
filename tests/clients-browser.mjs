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
    else if (path === "/sales/summary") data = { leads: 0, deals: 0, clients: client ? 1 : 0 };
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
  await page.getByLabel("Новая задача по клиенту", { exact: true }).fill("Перезвонить клиенту");
  await page.getByLabel("Дата задачи по клиенту", { exact: true }).fill("2026-10-01");
  await page.getByRole("button", { name: "Поставить задачу", exact: true }).click();
  await page.getByText("Перезвонить клиенту", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await page.getByRole("button", { name: "Вернуть", exact: true }).waitFor();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: `/tmp/three-k-clients-${width}.png`, fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
  }
  assert.deepEqual(errors, []);
  console.log("Clients: create, reopen, conflict, cancel, task completion, desktop/mobile passed (mock API).");
} finally { await browser.close(); }
