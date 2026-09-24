# 3K: implementation status

## Current increment: showroom and inventory

Inbound landing/Avito integrations are explicitly deferred by the user until
credentials are available. No external intake endpoint or secret was added.

Deployed migration 20260924102623_inventory and three-k-api v10 with JWT verification.
Only three_k inventory and inventory_events were added; existing business rows
and neighboring apps were not modified. No sample inventory was inserted.

- Today links to Showroom and Inventory on desktop and mobile.
- One record per physical unit: model, optional unique VIN, asking price, location,
  note, status and persisted audit history. Search and paginated status filters.
- Leaders create/edit available units and archive/restore them without deletion.
- Managers reserve for their own open deals; leaders can reserve for any open deal.
  Database uniqueness enforces one unit per deal and one deal per reserved unit.
- Row locks, version checks and atomic audit entries protect reservation, release
  and delivery. Duplicate VIN or competing reservations return a conflict.
- Delivery requires a successfully closed deal and preserves its inventory link.
  Reopening a sale does not silently undo physical delivery. Physical returns are
  not part of this increment; ordinary release only applies to reserved units.
- Inventory and deal cards link to each other. The stock reservation does not
  overwrite agreed deal product/VIN/amount fields; the linked unit is shown separately.
- Dirty forms guard navigation, failed saves retain drafts and refresh is explicit.

Verification: 37 Node tests, actual repository SQL against isolated PostgreSQL/PGlite,
inventory and sales/kanban browser flows including bidirectional navigation and
desktop/mobile screenshots, production/Sites builds, deployed file comparison,
live read-only grants/RLS and empty-table checks. Browser HTTP is mocked. Actual
authenticated role acceptance and concurrent multi-connection races remain pending.
Frontend remains local rather than published to GitHub Pages.

Private tables intentionally have no client policies/grants; the only scoped
security-advisor notice is
[RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Previous increment: internal notifications

Deployed migration 20260924093736_internal_notifications and three-k-api v9 with
JWT verification. New objects and triggers are confined to three_k. Existing
records were not backfilled and no sample notifications were created in production.

- Persistent recipient-only feed, unread count, all/unread filters and cursor pagination.
- Individual read/unread toggles and a bounded "read displayed" batch. Notifications
  arriving after the page load are not accidentally included in a read batch.
- Assignment notifications for leads, deals and tasks, including reassignment.
- Task deadline changes notify the assignee; completion/reopening notify the creator
  when creator and assignee differ. Notifications do not guess an actor identity.
- Source-table triggers run inside the source transaction; failed operations roll
  back notifications, no-op assignment writes and successful API retries add no duplicates.
- Context links open client/lead/deal cards. Cancelling dirty-form navigation keeps
  the notification unread. Completed tasks remain accessible through card filters.
- Badge refreshes on panel open/close, focus, visibility changes and every 30 seconds
  while visible. List refresh is explicit; no external push or Telegram delivery.
- Errors/retry, empty state, keyboard Escape/outside close and mobile panel support.

Verification: 34 Node tests; isolated PostgreSQL/PGlite notification/payment suites;
notification, payment, client/task and sales/kanban browser flows; desktop/mobile
screenshots; production/Sites build; deployed file equality and live read-only grant,
RLS, trigger and empty-table checks. Browser API calls are mocked. Live authenticated
two-user delivery and true multi-connection races remain acceptance checks.
Frontend remains local, not published to GitHub Pages.

RLS without policies is intentional for the private table: anon/authenticated have
no direct grants; API queries scope by verified member even for leadership roles.
[Advisor reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
Scheduled deadline reminders, browser push and Telegram messages are separate work.

## Previous increment: payment ledger

Deployed migration 20260924091037_payment_ledger and three-k-api v8 with JWT
verification. Only three_k objects were added; shared Auth and other apps were
not changed. Existing deals remain intact and no live payment rows were inserted.
CLI is unavailable, so the SQL was tested locally, applied through MCP, and saved
under the canonical server-generated migration timestamp.

- Deal cards show total, net paid, outstanding balance and overpayment.
- Manual receipts and refunds record amount, date, method, note and actor.
- Corrections append an opposite entry referencing the original, require a reason,
  and cannot cancel an entry twice or cancel a cancellation. Enter a replacement
  receipt/refund separately when an amount/date/method was wrong.
- Updates/deletes/truncation of ledger entries are blocked by database triggers.
- NUMERIC arithmetic stays in PostgreSQL and API money values are decimal strings.
- Owner/leader-only writes lock the deal, validate its version, append the operation,
  increment the version and record history in one transaction. Refunds/corrections
  cannot make net paid negative; overpayment is visible rather than silently capped.
- Request IDs deduplicate successful requests with lost responses and reject reuse
  for different operations. Future payment dates are rejected using Moscow time.
- Virtual deals can be saved before selecting a vehicle or VIN, allowing prepayment.
- Drafts survive failed writes; explicit refresh updates the expected version.
  Unsaved card/task changes block payment entry. Payment drafts guard navigation.

Verification: 31 Node tests; isolated PostgreSQL/PGlite payment and sales suites;
payment, sales/kanban and client/task browser flows on desktop/mobile; production
and Sites builds; deployed file equality; live read-only totals and grants checks.
Browser HTTP uses mocks, including a committed payment with a lost response.
Live authenticated payments and true multi-connection races remain unverified.
Frontend is local, not published to GitHub Pages. This is bookkeeping inside the
CRM only: no bank transfers, acquiring or accounting-document generation.

Security advisor's only three_k notice is expected
[RLS enabled without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy):
these tables are private, no anon/authenticated grants, membership checked by API.
Pre-existing notices in other schemas/shared Auth are outside this increment.

## Previous increment: linked sales and deal kanban

Deployed three-k-api v7 with JWT verification; no schema migration required.
Only sales.js changed remotely; access, clients, tasks and the entrypoint match v6.
Auth providers, redirect configuration and neighboring applications were untouched.

- Client cards list linked deals/leads by exact client ID, with pagination and navigation.
- Sale cards link back to the client; converted deals link to the originating lead.
- Deals offer list and kanban views, sharing search and open/closed filters.
- Each column has server-calculated totals and amounts, with 30 cards per batch.
  Existing noncanonical stages remain visible instead of hiding legacy records.
- Drag/drop and accessible stage selects persist through a dedicated endpoint.
- Refusal requires a reason; closure/reopening update status and timestamps.
- Stage-only writes preserve sale fields, require ownership/leader permission and
  an expected version, and commit history atomically. Conflicts do not move cards.
- Open dirty cards block board mutations; pending refusal participates in navigation
  and unload protection. No production sample rows were created.

Verification: 28 Node tests, isolated PostgreSQL/PGlite sales and task suites,
Playwright sales/kanban/link/manager-ownership and client/task regression flows,
desktop/mobile screenshots, production/Sites builds and remote file equality.
Browser HTTP is mocked. Live authenticated acceptance and multi-connection races
remain unverified. Frontend changes are local, not published to GitHub Pages.

## Previous increment: unified tasks and Today

Deployed migration 20260923220826_unified_tasks and three-k-api v6 with JWT
verification. Existing client_tasks rows/IDs remain in place; the table now supports
exactly one client, lead or deal context. Legacy client-task endpoints still work.

- Shared task UI in client, lead and deal cards; actual task feed on Today.
- Today, overdue, upcoming, active and completed filters; bounded pagination.
- Server-side business dates use Europe/Moscow. Deadlines are dates, not times.
- Managers see their own global feed; leaders can select the whole team.
  Context cards show shared tasks, but only assignees/leaders can modify them.
- Titles, deadlines, completion/reopening and leader-only reassignment persist.
- Future tasks may be assigned to off-duty members; lead assignment rules are unchanged.
- Metadata history is committed atomically, retries do not duplicate tasks, and
  version conflicts preserve UI drafts. No destructive task deletion is exposed.
- Today task context links open the corresponding client/lead/deal card.
- Dirty task forms participate in navigation confirmation and unload protection.

Verification: 27 Node tests; actual PostgreSQL/PGlite repository tests covering
legacy preservation, all three contexts, permission checks, Moscow date filters,
idempotency, stale writes, rollback and private grants; browser client/task flow
and sales regression at desktop/mobile widths; production build. Browser tests
use mocked HTTP, and no test rows were inserted into the production database.
Authenticated live role acceptance and multi-connection contention remain unverified.
Security advisor reports no policies for private three_k tables, intentionally:
anon/authenticated have no table grants and API membership/ownership checks gate access.

## Previous increment: leads and deals

Implemented and deployed:
- Private schema migration 20260923214212_sales_persistence; three-k-api v5,
  including access.js, clients.js and sales.js. JWT verification remains enabled.
- Persistent paginated lists, detail cards, search and status filters.
- Client/member foreign keys, versioned saves and immutable API-owned sources.
- Phone intake and authenticated internal landing intake; public intake is not released.
- Assignment follows a stored source rule only when its member is on duty;
  otherwise records remain unassigned. On-duty staff can take unassigned records;
  leaders can reassign them. Managers cannot edit another member's records.
- Normalized-phone client reuse, retry-safe creation, atomic lead conversion,
  unique lead/deal link, transactional history and optimistic concurrency.
- Deal amount, vehicle, VIN, planned closure, virtual flag, stages, refusal reason,
  closure and reopening. Payment accounting is deliberately a separate increment.
- Today counters now query database totals. Its unified task feed remains pending.
- Legacy records retained; no owners or client IDs guessed from names. Legacy
  clients are resolved by validated phone on conversion; ambiguous matches fail.

Verification: 24 Node tests; actual repository SQL in isolated PostgreSQL/PGlite;
Playwright lead/conversion/deal/refusal/reload/conflict/cancel flows at 1440/390px;
client browser regression; production build. Database tests cover assignment,
ownership, idempotency, rollback, version conflicts, filters, history and grants.
True multi-connection contention and a live authenticated user flow remain release
acceptance checks. Browser tests use a mocked API, not production writes.

## Previous increment: persistent client directory

Implemented locally:
- Client creation, detail loading, explicit save and cancel.
- All identity, contact, address, passport and banking fields from the UI.
- Server-side search by name, phone digits and INN, with bounded pagination.
- Phone normalization, required fields and format validation.
- Duplicate detection during creation and contact changes.
- Request IDs for retry-safe client and task creation.
- Version checks for concurrent edits; failed saves retain the draft.
- Client tasks with due dates, responsible member, completion and reopening.
- Metadata-only client audit events, committed in the same transaction as changes.
- Membership checks before client routes; no direct public table grants.

Deployed to Supabase project mkyrpoucfxnevccohabl:
- Migration 20260923212051_client_persistence.
- three-k-api v4: index.js, access.js, clients.js; JWT verification enabled.
- Existing role and invitation implementation retained.

Validation:
- Node API/access/validation/worker tests.
- Actual repository SQL against isolated PostgreSQL (PGlite), including persistence,
  duplicate prevention, retries, optimistic concurrency, audit and task permissions.
- Playwright browser scenarios with a mocked HTTP API at 1440px and 390px.
- Production build; remote RLS and grant checks.
- Live authenticated create/update flow has not been exercised with a user session.

Frontend publication is separate: the role-management task reported that GitHub
Pages still uses branch/Jekyll publishing alongside the Actions workflow. No push
or Pages configuration change is made by this increment. Local UI uses the live
configured Supabase API when signed in.

## Scope and remaining work

| Stage | State | Next acceptance condition |
| --- | --- | --- |
| 1. Inventory / reproducibility | Partial | Match every visible control to an API and complete clean-environment restore. Local role migration timestamp differs from server history. |
| 2. Roles / isolation | Partial | Membership gates are present; review revocation, record ownership and least-privilege DB credentials. Shared Supabase Auth/compute remain shared. |
| 3. Data model | Core implemented | Clients, leads, deals, payments, inventory, links and events added; live acceptance remains. |
| 4. Frontend persistence | Partial | Clients, leads and deals connected. Other CRM screens still contain local state and placeholder actions. |
| 5. Clients | Core implemented | Linked leads/deals are connected; test live authenticated workflow. |
| 6. Leads / assignment | Core implemented | Live acceptance, legacy reconciliation and inbound integrations remain. |
| 7. Deals / payments | Core implemented | Fields, kanban and manual payment ledger persist; live financial workflow acceptance remains. |
| 8. Tasks / history / today | Core implemented | Tasks, history and internal notifications work. Scheduled reminders, external delivery and live acceptance remain. |
| 9. Showroom / inbound sources | Partial | Inventory and reservations implemented; landing/Avito deferred until credentials are available. |
| 10. ROP reporting | Pending | Agree formulas and build all tabs from operational events. |
| 11. Release acceptance | Pending | Full role-based live workflow, recovery, retry and concurrency checks. |

## Next implementation increment

1. Connect leadership reporting to operational data, with explicit KPI definitions.
2. Resume landing/Avito integrations when credentials and source details are available.
3. Exercise the complete workflow with actual authenticated roles before publishing.

Accounting documents, EDI, 1C and payment acquiring are outside the accepted scope.
No demonstration records are inserted into the live project by this increment.
