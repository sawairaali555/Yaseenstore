# Zeliy Pakistan — open the full source in VS Code

This archive contains the complete tracked application source and bundled assets from commit 9fdddf7d5ff5182a9c28706283865bbf6ef7391b. It is the existing hosted application, not a newly converted standalone application. No live-site code has been changed for this export.

## 1. Open the project

1. Install Node.js 22.13 or newer and Visual Studio Code on your computer.
2. Extract this ZIP. Open the extracted `zeliy-pakistan` folder with VS Code → File → Open Folder.
3. Choose Terminal → New Terminal. Make sure the terminal is inside the folder containing package.json.
4. Install the locked dependencies:

```sh
npm ci
```

5. Start the local development server:

```sh
npx vite --host 127.0.0.1
```

6. Open the Local URL printed in the terminal. Keep that terminal running. Edit a file and save to see development updates. Stop the server with Ctrl+C.

Use `npx vite` directly on Windows or macOS: the original npm dev script uses Unix environment-variable syntax, and the build helpers require Linux utilities. If PowerShell blocks npm.ps1, select Command Prompt as the VS Code terminal profile.

This starts the development runtime. It does NOT copy the hosted database, set up a local administrator, or provide a complete working local login. See the migration requirements below. Errors from database-backed pages are expected until the local database is initialized.

## 2. Languages and folders

- TypeScript (.ts): backend logic, permissions, configuration and data access.
- React with TypeScript (.tsx): storefront, product pages and admin interfaces.
- CSS (.css): visual styling; Tailwind and reusable UI components are also included.
- SQL (.sql): database migrations for Cloudflare D1 (SQLite).
- Vinext with Vite: development and application build runtime, using Next.js-style routing.
- Cloudflare Workers: server runtime; R2: uploaded product images; Resend: invitation and password-reset email.

Useful entry points:

| Location | Purpose |
| --- | --- |
| app/store.tsx | Storefront |
| app/product-detail.tsx | Product details |
| app/globals.css | Storefront styling |
| app/admin/overview.tsx | Admin dashboard |
| app/admin/panel.tsx | Product/order/settings management |
| app/admin/login/ | Admin login interface |
| app/admin/products/new/ | Add-product workflow |
| app/admin/team/ | Users, invites, bans, roles and audit UI |
| app/api/ | Server API routes |
| lib/access/ | Permissions, sessions, password security, MFA and email |
| db/schema.ts | Database schema |
| drizzle/ | Ordered database migrations |
| public/images/ | Bundled product pictures |
| vite.config.ts | Vite and local Cloudflare bindings |
| worker/index.ts | Worker entry point |

## 3. Moving the backend to another host

VS Code is an editor; opening the code does not transfer hosting or the existing database. The live site currently runs on managed Sites hosting backed by Cloudflare services.

The following work is required before a separate installation can operate fully:

1. Provision a Cloudflare D1 database and R2 bucket (bindings named DB and BUCKET). The placeholder database ID in vite.config.ts is for local simulation, not a production database. Configure your own deployment and apply all six SQL migrations in drizzle/ in numeric order. Local bindings need their own initialized local database too.
2. Supply a server-side ADMIN_MFA_KEY using the deployment platform's secret mechanism. For a fresh empty database use a new 64-character hex key. For migration of encrypted MFA/email records, securely migrate the existing encryption key with those records; a new key cannot decrypt them.
3. Replace the production ORIGIN in lib/access/policy.ts with the exact new application origin. It is used for request validation, email links and uploaded-image URLs. Use an HTTPS origin for production; authentication uses Secure cookies.
4. Replace the hosting-provided identity integration in app/chatgpt-auth.ts for your new platform. Initial owner enrollment, invitation acceptance and account identity currently depend on managed Sign in with ChatGPT and trusted gateway headers. Those routes/headers do not exist on ordinary localhost or independent hosting. Do not fake trusted identity headers or remove permission checks. Normal password login still needs an existing active account and password record in the new database; no default admin password is included.
5. Securely migrate production data and R2 uploads if you want existing products, orders and users. This ZIP contains source and seed assets only, not a production database backup or uploaded files.
6. Configure your Resend sender and API key through the Super Admin email settings on the new installation. Set the correct application origin before sending invitations or recovery links.
7. Validate login, authorization, product uploads, orders and email flows on the new installation before switching your domain.

These are migration requirements, not steps already completed by extracting this archive. You can edit the full source in VS Code immediately; local admin login and a new production host require this backend configuration and authentication adaptation.

## 4. Build and existing documentation

For a direct build that avoids the Linux wrapper:

```sh
npx vinext build
```

The project still has managed Sites metadata in .openai/hosting.json; it documents its existing hosting configuration and does not grant access to deploy to that project. A different host needs its own deployment configuration. This is not a static HTML-only app and cannot run fully just by uploading files to a static web host.

Read PASSWORD-LOGIN.md, RESEND.md and docs/ACCESS-MANAGEMENT.md for existing behavior and API details. README.md is the original starter documentation; this START-HERE.md is the export-specific guide.

Dependencies, generated build output, caches, Git credentials, production secrets, live database records and uploaded R2 objects are intentionally not in this source ZIP. npm ci reinstalls dependencies from package-lock.json. No passwords or API keys need to be pasted into chat.
