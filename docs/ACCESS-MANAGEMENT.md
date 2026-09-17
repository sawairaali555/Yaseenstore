# Zeliy role-based access management

## Delivered components

| Deliverable | Implementation |
|---|---|
| Database schema | `db/schema.ts`, append-only `drizzle/0002_bent_wildside.sql` migration |
| Permission matrix | `lib/access/policy.ts` |
| Identity, session and permission guards | `lib/access/server.ts` |
| Lifecycle and read APIs | `app/api/access/[resource]/route.ts` |
| Encrypted TOTP and replay prevention | `lib/access/mfa.ts`, `lib/access/crypto.ts` |
| Team dashboard | `app/admin/team/screen.tsx`, `/admin/team` |
| User notifications and account activation | `/account` |
| Invitation acceptance | `/invite#<secret>` |
| Existing commerce integration | `app/api/admin/route.ts`, `app/api/orders/route.ts` |
| Integration/security tests | `tests/access-system.test.mjs` |

Backend: TypeScript on the existing Vinext/Cloudflare Worker. Frontend: React and existing Shadcn primitives. Database: Cloudflare D1/SQLite. Authentication: platform-owned ChatGPT sign-in; short-lived, revocable application sessions are an additional authorization boundary, not a replacement identity provider.

## Roles

| Capability | Super Admin | Admin | Moderator | Member |
|---|---|---|---|---|
| Team list | Yes | Yes | Yes | No |
| Add or invite | Admin, Moderator, Member | Member | No | No |
| Ban, unban, restrict, warn | Lower roles | Lower roles | Member | No |
| Soft remove and restore | Lower roles | Lower roles | No | No |
| Assign roles | Lower-role targets | No | No | No |
| Grant Super Admin | Active lower-role target + TOTP | No | No | No |
| Permanent deletion | Lower-role target + TOTP + elapsed recovery window | No | No | No |
| Product management/moderation | Yes | Yes | Yes | No |
| Order management | Yes | Yes | No | No |
| Store settings | Yes | No | No | No |
| Audit log | Yes | No | No | No |
| Shopping and own notifications | Yes | Yes | Yes | Yes |

The original Site owner's verified email seeds the protected `owner` account. Self-edits, peer-edits and lower-to-higher edits are blocked. Other Super Admins cannot change the original owner or another Super Admin. No role can create a new Super Admin through manual addition or invitation; use a separate TOTP-verified role change for one active target.

Built-in role definitions are immutable application policy. `access_roles` stores a seeded representation for schema clarity; code remains the permission authority. Custom roles are optional in the brief and are not implemented.

## Account and session lifecycle

1. Open `/account` using ChatGPT sign-in. The original owner is initialized on first access.
2. A manually added pending account activates only after matching verified email sign-in. New visitors may activate a Member account.
3. Connect creates an eight-hour opaque app session with a SHA-256-hashed token in D1 and a `__Host-zeliy_session` Secure, HttpOnly, SameSite=Strict cookie. Each session is bound to the platform's site-scoped user identity.
4. Every protected API action reads current account state, role, restrictions and app-session version. Client role badges are not authoritative.
5. Ban, unban, role changes, restrictions, removal and restoration delete existing app sessions and increment the authorization version. Next requests from old sessions fail immediately. Already-displayed data cannot be recalled from a browser.
6. Reconnect from `/account` after a permitted account change. Banned and removed accounts cannot reconnect. Their own account status and notices remain readable so they can understand the restriction.
7. Public catalog pages remain readable. Checkout/order actions require an active app account. Restriction/mute blocks checkout and content management; it does not remove read access or moderation-team capabilities.

This does not terminate a person's ChatGPT account or its global sign-in session. All authorization-sensitive Zeliy actions use the revocable app session and fresh database state.

## Database

- `access_users`: stable app ID, site-scoped auth ID, normalized unique email, name, role, lifecycle status, joined/last-session timestamps, removed timestamp and authorization/session versions.
- `access_roles`: built-in role name, rank and serialized permission list.
- `access_invites`: hashed random code, optional matching email, assigned role, inviter, expiry, usage limit/count and revocation state.
- `access_bans`: user, actor, restriction kind, required reason, expiry and revocation timestamps. Banned/muted status is computed from active restrictions, avoiding a scheduled expiry job.
- `access_audit`: immutable actor/target/action/time/reason/metadata records plus platform-supplied IP when available and a bounded user-agent string.
- `access_notices`: persistent in-app notifications, recipient, message and read timestamp.
- `access_sessions`: hashed opaque tokens with user, version and expiry.
- `access_rate`: atomic fixed-window per-actor counters with bounded expiry cleanup.
- `access_mfa`: AES-GCM-encrypted per-user TOTP secrets, enrollment state and last accepted counter.
- `access_guard`: transient authorization assertions. Its trigger aborts a batch when a version, authorization or invite-use assertion fails.

The SQL migration adds indexes for status/role/joined/activity queries, restriction lookups, session lookups, notices, invite ownership and audit pagination. It also installs immutable-audit and protected-owner triggers. These custom indexes/triggers are maintained in the SQL migration. Do not rewrite applied migrations.

Soft deletion blocks access immediately and permits restoration for 30 days. Permanent deletion is available only after that period and with MFA: it deletes the account, MFA configuration, sessions and in-app notices. Immutable audit history and historical commerce/restriction records are retained. This is account deletion, not a promise of erasing every historical personal-data record.

## APIs

All responses are `Cache-Control: no-store`. All mutations require the exact approved origin, an appropriately authorized actor and validated JSON. Payloads are bounded. GET list endpoints return at most 50 records per page.

| Method | Endpoint | Purpose / input |
|---|---|---|
| GET | `/api/access/me` | Current verified identity, own lifecycle state, restrictions and latest 50 notices; available without an app session |
| POST | `/api/access/me` | `{action:"activate"}` activates pending/new Member; `{action:"connect"}` creates a fresh app session; `{action:"read"}` marks own notices read |
| GET | `/api/access/users` | `q`, `role`, `status`, `sort` (`joined`, `oldest`, `activity`, `name`), `joinedFrom`, `joinedTo` (YYYY-MM-DD), zero-based `page` |
| POST | `/api/access/users` | `{action:"add",email,name,role,reason}` |
| POST | `/api/access/users` | `{action:"role",ids:[...],role,reason,code?}`; Super Admin assignment requires a fresh TOTP code |
| POST | `/api/access/users` | `{action:"remove"|"restore"|"purge",ids:[...],reason,code?}`; purge requires TOTP and elapsed recovery window |
| POST | `/api/access/users` | `{action:"ban"|"mute",ids:[...],reason,hours:number|null}`; null means permanent |
| POST | `/api/access/users` | `{action:"unban"|"unmute"|"warn",ids:[...],reason}` |
| GET | `/api/access/invites` | `q`, `page`; Admins see their invitations, Super Admins see all |
| POST | `/api/access/invites` | `{emails:[...],role,hours,maxUses,reason}`; blank emails produces a shareable Member link |
| POST | `/api/access/invites` | `{action:"revoke",id,reason}` |
| POST | `/api/access/accept` | `{code}` plus verified ChatGPT identity; creates/activates an account and consumes usage atomically |
| GET | `/api/access/bans` | `q`, `page`; restriction records include active, expired and revoked state |
| GET | `/api/access/roles` | Fixed matrix, current actor/permissions and own MFA enrollment status |
| GET | `/api/access/audit` | Super Admin only; `q`, exact `action`, `page` |
| POST | `/api/access/mfa` | `{action:"setup"}` returns enrollment secret once; `{action:"enable",code}` verifies it |

Bulk user actions support up to 20 distinct targets. Bulk email invitations support up to 20 distinct emails. All targets must pass authorization; a failed target causes the whole mutation to fail. Elevated Super Admin promotion is single-target.

Invitation codes contain 256 bits of randomness and are stored only as hashes. Link secrets use URL fragments so they are not included in ordinary server request URLs or referrers. Generated links are shown only once. Staff invites are email-bound and single-use. A member link may be multi-use. Expiry, revocation, current inviter authority and max-use count are checked at acceptance in one transactional batch. Existing active accounts cannot use an invite to change their role.

## Audit example

A successful role change writes the user change, version revocation, notification and audit event in the same D1 batch. The entry shape is:

```json
{
  "actor_id": "owner",
  "target_id": "<user UUID>",
  "action": "user.role",
  "reason": "Assigned responsibility for product moderation",
  "metadata": {"previousRole":"member","newRole":"moderator","hours":null},
  "ip": "<platform-supplied address or null>",
  "device": "<bounded user-agent string or null>",
  "created_at": 1788870000000
}
```

The sample is illustrative, not a real action. Audit updates/deletions are blocked by SQLite triggers. Failed MFA verification is recorded. Ordinary authorization/validation failures return errors without claiming a successful admin action. IP and user-agent are context, not proof of physical device identity. No IP/device ban system is implemented.

## Strong-action verification

TOTP uses the RFC 6238 time-based construction and RFC 4226 dynamic truncation, a 30-second step, six digits and ±one-step clock tolerance. Secrets are randomly generated and AES-GCM encrypted with the server-only `ADMIN_MFA_KEY` and user ID as associated data. Acceptance advances a counter in the same transaction as the sensitive operation, preventing code replay and races.

Set up your authenticator under **Roles & security**. Store its setup key safely; enrollment expires after ten minutes. Already-enabled secrets cannot be replaced through setup. Self-service MFA reset/recovery is not included; operator recovery is required if the authenticator and its backup are lost.

`ADMIN_MFA_KEY` is provisioned as a secret in the Site runtime. Never commit its value or rotate it without migrating/re-enrolling existing secrets. Local development needs the same key name with a separate test key. The platform does not provide an authentication-age/forced-reauth claim here, so sensitive actions use authenticator verification rather than pretending that a sign-out link proves fresh authentication.

Sources: https://www.rfc-editor.org/info/rfc6238/ and https://www.rfc-editor.org/info/rfc4226/.

## Rate limits and concurrency

- Invite creation: 20 requests/hour/actor, up to 20 email recipients per request.
- Manual additions: 50/hour/actor.
- User moderation/lifecycle mutations: 60 requests/hour/actor, up to 20 targets each.
- Invitation acceptance: 10 attempts/5 minutes/identity.
- Account actions: 20/5 minutes/identity.
- MFA verification: 5 attempts/5 minutes/actor; setup: 5/hour.

Counters increment atomically in shared D1, not process memory. Expired counters and sessions are cleaned in bounded batches. Write-time guards check the actor and target versions, current bans, invitation expiry/uses and TOTP replay counter. Trigger failures roll back the full batch. Store product/settings/order admin mutations also use guards and audit records.

Listings use indexed ordering with bounded page sizes. Substring search and deep offset pagination can become costly at very large scale; migrate to FTS/keyset pagination and benchmark against the actual workload before claiming production-scale throughput.

## Delivery and access boundaries

In-app notifications are implemented for activation, invitations accepted and account lifecycle changes. Email-bound invite creation provides a link plus an addressed email draft for the administrator to send. No automatic email delivery, external webhook, Slack integration, IP/device bans, appeal workflow, custom roles or quota configurator is configured.

The Site remains private. App membership cannot grant the separate Site-sharing permission; the owner must authorize invitees to view the private Site through its sharing controls. No sharing permissions are changed by these endpoints.

## Verification

Run `node --test tests/access-system.test.mjs` for SQLite-backed integration tests. Tests cover the hierarchy, revoked sessions, role demotion, invite email binding/expiry/reuse, bulk rollback, immutable audits, recovery, TOTP RFC vectors/encryption/replay, rate limits, origin checks and store permission separation. They do not replace live browser testing, independent penetration testing, infrastructure load tests or email-delivery verification.
