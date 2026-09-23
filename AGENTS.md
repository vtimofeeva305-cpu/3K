# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Prototype Product Decisions

- Selected visual direction: option 2, "Шоурум и спрос" with product/inventory context as the main navigation anchor.
- Primary navigation now has five operational sections: "Сегодня", "Лиды", "Сделки", "Клиенты", and "Команда". Showroom, individual deal cards, and the public landing prototype remain secondary workflow screens.
- CRM boundary: Avito messages stay in Avito for v1; this prototype records the incoming lead, recognized listing, responsible manager, tasks, and history.
- The prototype exposes operational actions such as "Отправить КП" and "Выставить счёт", but generation of accounting documents, contracts, acts, EDI, and 1C integration remains out of scope.
- Roles: superadmin assigns ROPs; ROP sees the leadership dashboard, invites managers, manages distribution and workdays; managers see other CRM screens and team, but can change only their own workday. Invitations are individual, bearer, single-use, expire after 7 days, and grant manager only. Roles are checked by the backend using verified Telegram-linked membership, never client metadata.
- On mobile only, the five primary navigation actions live in a fixed bottom bar with large touch targets, clear labels, and a visually strong active icon. Desktop navigation remains in the sidebar.
- Deal records must show number, client, VIN, vehicle, total, creation date, paid amount, and planned close date, with separate open and closed views. Virtual deals allow a prepayment before a vehicle or VIN is available.
- Clients are a separate alphabetized directory searchable by phone and INN; client cards contain editable identity, contact, address, passport, and legal/banking details.
- Leads retain a system-detected immutable source and are assigned by source to managers who have started their workday.
- Reporting is a separate leadership screen named "Дашборд РОПа", available from desktop navigation and from "Сегодня" on mobile. Its default view stays summary-first: period KPIs, plan and forecast, inventory and demand, then loss reasons.
- The ROP dashboard uses one global period control (today, yesterday, current week, current month, previous month, or custom dates) and dedicated tabs for the full sales funnel, sortable manager performance, diagnostic manager activity, lead-response speed, attention signals, and marketing attribution.
- Activity metrics explain sales results but are not treated as the primary KPI. Manager detail must connect activity, conversion, overdue work, revenue, gross profit, plan, and forecast.
- Do not add demonstration records or metrics. Source attribution remains system-owned and immutable.

- CRM identity uses the user-supplied 3К vector logo (`src/assets/3k-logo.svg`) and black/white/neutral gray palette: dark desktop sidebar and mobile bottom navigation, light workspace, graphite primary actions. Replace the old BRP brand mark; retain semantic status/error colors and BRP vehicle/source references. Keep the existing 1100px compact sidebar and 760px mobile navigation breakpoints.
