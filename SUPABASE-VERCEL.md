# Connect Yaseenstore to the prepared Supabase backend

The database migration is already applied to **Yaseenecomrce**, project
`nfujzlemqgrqtrheokhn`. It creates the private `yaseenstore` schema (28 tables)
and private `yaseenstore-media` image bucket. It does not alter `public.products`.
The migration file uses the exact version recorded by Supabase.

The website is **not connected until the Vercel environment is configured and
this source is deployed to the intended project**. Do not claim live checkout
has been verified until the checks below run against that deployment.

## 1. Configure the intended Vercel project

The supplied URL belongs to **yaseenstore-v69k**, in team
**yaseenkhattak7-1679s-projects**. This GitHub repository is linked to six Vercel
projects; deploy to the intended project rather than merging blindly into a
branch that redeploys every production site.

In that project's environment settings add the following server-only values:

| Variable | Value |
| --- | --- |
| `SUPABASE_DB_URL` | Copy the **Transaction pooler** URI from Supabase → Connect for `nfujzlemqgrqtrheokhn`, including the database password. `POSTGRES_URL` is also accepted when supplied by the Supabase/Vercel integration. |
| `SUPABASE_URL` | `https://nfujzlemqgrqtrheokhn.supabase.co` |
| `SUPABASE_SECRET_KEY` | The server-side Supabase secret key. Legacy `SUPABASE_SERVICE_ROLE_KEY` is also accepted. This enables the private Storage bucket. |
| `ADMIN_SETUP_TOKEN` | A new random secret, at least 32 characters, for first-time owner enrollment. |
| `ADMIN_MFA_KEY` | A different random 64-character hexadecimal secret for encrypting MFA and email credentials. Keep it stable after enrollment. |
| `APP_ORIGIN` | The exact canonical HTTPS website origin, without a trailing slash. If omitted, the application uses Vercel's production/deployment URL variables. |

Generate each random secret separately using a password manager or this command
in a private terminal:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Never put database passwords, setup keys or Supabase secret keys in Git, public
variables, screenshots or chat. None of these variables needs a `NEXT_PUBLIC_`
prefix. The connection must be the real pooler URI, not the project's HTTPS API
URL. Without the storage key, authenticated image uploads can fall back to the
private database; private Storage is preferred to avoid filling database space.

## 2. Deploy this source

Use Node.js 24 and the checked-in lockfile. The existing Vercel build command is
`npm run build:vercel`. Nitro produces the `.vercel/output` Build Output API
artifact. The existing `vercel.json` is retained.

On first connection, the application imports the public catalog, settings and
categories from the checked-in storefront snapshot once, inside a locked
transaction. Subsequent deployments do not reset stock, settings or orders.
It does not copy private users, orders, uploads or MFA secrets from the old
Cloudflare deployment. Any such migration needs a separate authorized export.

## 3. Enroll the owner

Open `/admin/login?mode=setup` on the new deployment. Enter the setup key and a
unique password of 15–128 characters. The owner email is the existing configured
address in `lib/access/policy.ts`. The server fixes the role and email; incoming
identity headers and form-supplied roles cannot create an administrator.

Enrollment is one-time and cannot replace an existing owner's password. Sign in,
then remove `ADMIN_SETUP_TOKEN` from Vercel and redeploy. Retain `ADMIN_MFA_KEY`.

## 4. Verify the connected deployment

- Confirm products and settings load from Supabase and persist after a reload.
- Submit a clearly labeled test COD order, confirm its variant stock is reduced
  once, then cancel it from admin to restore stock.
- Resubmit the same checkout request: it must not create a second order.
- Check that order tracking requires the correct reference and tracking key and
  returns no customer address, phone or token.
- Confirm unsigned visitors cannot read or change admin data or override prices.
- Upload a small JPG/PNG/WebP from admin and verify the returned image URL.
- Enroll MFA, sign out and sign in again. Configure Resend before testing email
  password recovery; a database connection alone does not configure email.

Guest COD checkout and the initial owner's password-based admin are supported
on Vercel. Existing staff invitation acceptance and account activation still
depend on the original managed ChatGPT identity flow. Those flows require
further authentication migration before onboarding staff on the standalone
deployment. The identity-header flow is deliberately disabled on Vercel.

## Validation completed before handoff

- Vercel production build and TypeScript check pass.
- The access/checkout regression tests and PostgreSQL SQL-compatibility tests
  pass (50 tests).
- All 123 static route queries were prepared successfully on the actual
  Supabase PostgreSQL database, without executing them.
- Transaction-only database checks passed for order inserts, JSON lookups,
  millisecond timestamps, guard rollback, audit immutability and private access.
- All 28 tables have RLS enabled; `anon` and `authenticated` have no schema
  access. Supabase's only security notices for this schema are informational
  “RLS enabled, no policy” notices, intentional for server-only tables.

These checks do not substitute for testing the final Vercel environment.
