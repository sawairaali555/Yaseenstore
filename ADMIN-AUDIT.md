# Admin Panel Audit

Audit date: 2026-10-08. Scope: admin routes, shared shell, product/listing/category/review/banner management, orders/CSR/fulfillment, inventory, returns/refunds/COD, team/access, authentication and supporting APIs.

This is a source and automated-test audit. No connected browser is available in this session. Live hosted identity, email delivery, courier integrations, production data and device-level visual verification are not certified by this report. Existing uncommitted changes to admin.css, categories.tsx and products/editor.tsx are preserved.

## Critical

1. `lib/access/server.ts`: LOCAL_ADMIN_BYPASS has no production-environment guard and returns before permission, status and ban checks. Restrict to development and validate the local actor normally.
2. `app/api/admin/route.ts`: admin read/modify/write operations lack checkout's optimistic concurrency guards. Cancellation/restock/COD updates can overwrite concurrent changes or restore stock twice. Guard snapshots inside transactions.
3. `app/api/admin/route.ts`: return restocking commits inventory before saving restock markers; refund handling writes return, order and audit separately. A failure or concurrent retry can leave inconsistent financial/inventory state. Commit dependent writes atomically.
4. `app/api/admin/route.ts`: client-supplied order details can override server-owned stock and financial markers. Restrict editable fields and preserve operational state on the server.

## High

1. `app/admin/login/screen.tsx`: no authenticator input although login, enrollment, change and reset require MFA for enrolled users.
2. `app/api/admin/route.ts`: stock restoration falls back to any same-size variant even when the supplied variant/colour does not match. Reject ambiguous or missing inventory variants.
3. `app/admin/reviews.tsx`: chosen images are saved as filenames rather than uploaded media URLs. Upload with validation and handle failures; restore busy state on exceptions.
4. `app/admin/panel.tsx`: delete permission is offered to Admin although API restricts it to Super Admin; URL section initialization does not recognize edit_product.
5. `lib/access/server.ts`: unexpected errors expose raw database/internal messages with a misleading HTTP 400. Return safe service errors and explicit validation/conflict errors.
6. `app/api/categories/route.ts`: mutation lacks actor transaction guards/audit; invalid parent/cyclic moves and destructive category deletion need validation.

## Medium

1. Admin/team loads can race and stale responses overwrite the current filters. Shared requests lack bounded timeouts and robust non-JSON handling.
2. Bulk product deletion can partially succeed while the UI retains already-deleted products. Reflect each committed deletion.
3. Navigation has no consistent URL/back-button state and authorization only hides sidebar items. Guard views as well as links.
4. Banner uploads use unbounded data URLs while the admin API caps requests at 3 MB; blank slides silently disappear on save; remove lacks confirmation.
5. Review required fields and length limits disagree with API validation; success feedback is missing.
6. Team role choices include roles Admin cannot grant; selecting all users only selects 20 but checked state compares all 50; sorting retains old pagination.
7. Destructive controls, async dialogs and mobile/table/modal layouts need consistent focus, touch targets, scroll containment and reduced-motion treatment.
8. Order/return reads are capped at 1,000 without server pagination. Full catalog/data reloads and large client components limit scalability.

## Low

1. Inconsistent labels, mixed Urdu/Arabic field names, duplicate status feedback and inline styles across specialized tools.
2. Large monolithic panel and COD components make regression review expensive; extract only where a change warrants it.
3. Stale drafts may be lost on navigation. Broader unsaved-change protection and complete mobile/keyboard visual regression coverage need follow-up verification.

## Verification

- Baseline: 32 access/security tests passed before edits.
- Final full suite: 52 tests passed, zero failures or cancellations (`node --test tests/*.test.mjs`, with local runtime permissions). Includes access/data tests, Workers-rendered HTML and UI component contracts. Initial sandboxed full-suite runs stalled in Workers startup; the permission-enabled rerun completed successfully.
- `npm run build`: passed. Large-client-chunk warning remains.
- `npx tsc --noEmit`: passed.
- Targeted lint of all new shared modules, pagination and stock history: passed. Repository-wide lint remains a separate release gate.
- `git diff --check`: passed.
- After the final error-handler typing cleanup, all 45 access/data regression tests and the production build passed again. The full-suite result above preceded this narrowly scoped cleanup.
- Local admin preview: HTTP 200 at `http://127.0.0.1:5174/admin`; development server left running. HTTP success does not validate browser interaction or layout.
- Production release still requires hosted authentication/email tests, real-data reconciliation, browser verification at phone/tablet/laptop/large desktop widths and representative role walkthroughs.

## Implemented Remediation

All Critical findings and the six High findings above have targeted fixes. This is not a certification of every production workflow.

- Authentication/access: the local bypass is development-only, loopback-host restricted and subject to stored permissions, status, bans and mutes. Password flows accept authenticator codes. Product-edit routes and admin views enforce permission checks; order deletion is no longer offered to unauthorized roles.
- Transaction integrity: cancellation, stock restoration, returns, refunds and COD mutations compare database snapshots and commit related order, inventory, return and audit writes together. Conflicts return refresh guidance rather than overwrite concurrent changes. Invalid variants, duplicate refunds/remittances/reversals and fabricated return prices are rejected.
- Catalog/categories: product edits carry revision tokens and preserve galleries/SEO slugs. Category mutation is guarded and audited; cycles, missing parents and deleting categories used by products are rejected. Deleted built-in categories remain deleted after reload.
- Forms/media: reviews and banners upload validated images to media storage instead of saving filenames/base64. Required fields, length limits, busy/error/success states and remove/discard confirmations were aligned with the API. Async dialogs retain inputs after failed writes and release loading states.
- Requests/navigation: shared admin requests have a 30-second timeout, cancellation support, no-store caching and safe handling of HTML/session responses. Admin/team loads suppress stale responses. Section URLs and browser back navigation are synchronized. Bulk operations reflect committed changes and stop on failures.
- Tables/inventory: order and product tables now paginate locally; select-visible applies to the displayed product page. Empty filtered order exports no longer fall back to all orders. Stock history reads actual inventory logs, with variant filtering, loading, retry and empty states. CSV exports quote values and neutralize spreadsheet formulas.
- Shipping: removed randomly generated tracking numbers and decorative fake barcodes; actions now ask for courier-issued tracking. No real courier-booking integration has been invented.
- Shared presentation: scoped focus rings, responsive form grids, flexible toolbars, table scrolling, constrained dialogs, larger touch targets, mobile inputs and reduced-motion rules were added while preserving existing layouts and user edits.
- Team workflows: role options match grant permissions, staff invites remain single-use, selection matches the visible records, and sort changes reset pagination.
- Empty returns no longer create or display sample transactions. Existing persisted records were not deleted; reconcile old demonstration records manually if present.

## Remaining Release Gates

1. Browser QA remains unperformed: there is no connected browser. Verify real interactions, keyboard focus, modal positioning, printouts, image rendering and layouts at 375, 768, 1280 and 1920 pixels. Responsive CSS changes are source-checked, not screenshot-certified.
2. Exercise hosted identity, password/MFA enrollment, email delivery/recovery, logout and each actual role against the deployed Workers environment. Local development bypass intentionally does not model a production login/logout session.
3. Reconcile existing production inventory, return/refund flags and COD balances. Repairs prevent new inconsistencies but do not automatically rewrite historical data.
4. Implement server pagination before exceeding the latest 1,000-order/return view. Local pagination reduces rendering but does not remove the retrieval cap or full-data reloads.
5. The production build still warns about large client chunks. The monolithic admin/COD tools need measured code splitting and profiling before large-scale usage.
6. Repository-wide lint debt remains, including legacy explicit-any and hook patterns. Newly added request, transaction, stock-restoration, CSV, pagination and stock-history modules pass targeted lint.
7. Broader unsaved-draft protection and complete browser CRUD/error-state regression tests remain follow-up work. Legacy clients may omit the optional product revision token; the current editor supplies it.

## Workflow Coverage

| Area | Re-check performed | Not certified |
| --- | --- | --- |
| Auth, sessions, roles, team | Automated permission, revocation, MFA, reset/replay, invitation and email-provider mock tests | Hosted provider delivery and full browser flow |
| Products, variants, media | Draft/publish, stale revision, SEO/gallery persistence, upload validation and media storage tests | Full editor interaction and real uploaded-image rendering |
| Categories | Cycles, deletion persistence, API validation | All drag/drop and device layouts |
| Orders, inventory | Exact restoration, repeated cancellation, concurrent-write conflict, server-owned markers | Every CSR/fulfillment transition with production data |
| Returns, refunds | Quantity/pricing validation, refund/restock atomic rollback, empty storage | Physical return processing and financial reconciliation |
| COD | Duplicate remittance/reversal protection, missing-order batch rollback | Real courier remittances and payout reconciliation |
| Reviews, banners, settings | Source review, shared upload/request handling, unsafe-link/percentage validation | Visual placement and full browser CRUD |
| Tables, navigation, dialogs | Source review, TypeScript/build, CSV regression tests, local HTTP route check | Device screenshots, keyboard and print verification |
