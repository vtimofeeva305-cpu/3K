import assert from "node:assert/strict";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ headless: true });
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5175";
const self = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
try {
  for (const role of ["manager", "rop", "superadmin"]) {
    const context = await browser.newContext();
    await context.addInitScript(() => localStorage.setItem("three-k-auth-session", JSON.stringify({ accessToken: "test", expiresAt: Date.now() + 3600000 })));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let people = [{ id: self, name: "Тестовый сотрудник", role, working: false }, { id: other, name: "Второй сотрудник", role: "manager", working: false }];
    await page.route("**/auth/v1/user", (route) => route.fulfill({ json: { id: self, user_metadata: { name: "Тестовый сотрудник" } } }));
    await page.route("**/functions/v1/three-k-api/**", (route) => {
      const path = new URL(route.request().url()).pathname.split("three-k-api")[1];
      let data;
      if (path === "/me") data = { member: people[0] };
      else if (path === "/team") data = people;
      else if (path === "/assignment-rules") data = {};
      else if (path === "/notifications/count") data = {unread:0};
      else if (path === "/invitations") data = route.request().method() === "POST" ? { token: "a".repeat(64) } : [];
      else if (path.endsWith("/workday")) { people[0].working = true; data = people[0]; }
      else return route.fulfill({ status: 404, json: { message: "Unknown test route" } });
      return route.fulfill({ json: { data } });
    });
    await page.goto(base);
    await page.getByRole("button", { name: "Команда", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Дашборд РОПа", exact: true }).count(), role === "manager" ? 0 : 1);
    assert.equal(await page.getByRole("button", { name: "Пригласить сотрудника" }).count(), role === "manager" ? 0 : 1);
    assert.equal(await page.getByRole("button", { name: "Начать рабочий день", exact: true }).count(), role === "manager" ? 1 : 2);
    assert.equal(await page.getByRole("combobox", { name: "Роль: Второй сотрудник" }).count(), role === "superadmin" ? 1 : 0);
    if (role !== "manager") {
      await page.getByRole("button", { name: "Пригласить сотрудника" }).click();
      await page.getByRole("textbox", { name: "Одноразовая ссылка" }).waitFor();
      assert.match(await page.getByRole("textbox", { name: "Одноразовая ссылка" }).inputValue(), /#invite=a{64}$/);
    }
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `/tmp/3k-${role}-${width}.png`, fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${role} overflows at ${width}`);
    }
    await page.getByRole("button", { name: "Начать рабочий день", exact: true }).first().click();
    await page.getByRole("button", { name: "Завершить рабочий день", exact: true }).waitFor();
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${role}: navigation, permissions, workday, responsive layout passed`);
  }
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem("three-k-auth-session", JSON.stringify({ accessToken: "test", expiresAt: Date.now() + 3600000 })));
  const page = await context.newPage();
  let accepted = false;
  await page.route("**/auth/v1/user", (route) => route.fulfill({ json: { id: self } }));
  await page.route("**/functions/v1/three-k-api/**", (route) => {
    const path = new URL(route.request().url()).pathname.split("three-k-api")[1];
    if (path === "/invitations/accept") {
      assert.equal(route.request().postDataJSON().token, "b".repeat(64));
      accepted = true;
    }
    const member = accepted ? { id: self, name: "Test", role: "manager", working: false } : null;
    return route.fulfill({ json: { data: path === "/me" ? { member } : path === "/team" ? [member] : {} } });
  });
  await page.goto(`${base}/#invite=${"b".repeat(64)}`);
  await page.getByRole("button", { name: "Принять приглашение" }).waitFor();
  assert.equal(new URL(page.url()).hash, "");
  await page.reload();
  await page.getByRole("button", { name: "Принять приглашение" }).click();
  await page.getByRole("button", { name: "Команда", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem("three-k-pending-invite")), null);
  assert.equal(await page.getByRole("button", { name: "Дашборд РОПа", exact: true }).count(), 0);
  await context.close();
  console.log("Invitation survives reload, is accepted explicitly and cleared after use");
} finally { await browser.close(); }
