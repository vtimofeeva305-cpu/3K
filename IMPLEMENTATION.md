# 3K: implementation status

## Current increment: leads and deals

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
| 3. Data model | Partial | Clients, leads, deals, links and events added. Payments and inventory remain. |
| 4. Frontend persistence | Partial | Clients, leads and deals connected. Other CRM screens still contain local state and placeholder actions. |
| 5. Clients | Core implemented | Add linked leads/deals when their persistence is implemented; test live authenticated workflow. |
| 6. Leads / assignment | Core implemented | Live acceptance, legacy reconciliation and inbound integrations remain. |
| 7. Deals / payments | Partial | Fields, stages, virtual flag and closure reasons persist; payment ledger and connected kanban remain. |
| 8. Tasks / history / today | Partial | Client tasks persist. Unify with deal tasks, history, Today and notifications; add deadline changes. |
| 9. Showroom / inbound sources | Pending | Inventory, reservations, public lead intake and available Avito integration. |
| 10. ROP reporting | Pending | Agree formulas and build all tabs from operational events. |
| 11. Release acceptance | Pending | Full role-based live workflow, recovery, retry and concurrency checks. |

## Next implementation increment

1. Unify client, lead and deal tasks with deadlines, reassignment and history.
2. Connect the Today task feed and overdue filters to these records.
3. Add linked sales navigation in the client card and connected kanban.
4. Add a payment ledger with immutable entries, corrections and computed balance.
5. Exercise the complete workflow with actual authenticated roles before publishing.

Accounting documents, EDI, 1C and payment acquiring are outside the accepted scope.
No demonstration records are inserted into the live project by this increment.
