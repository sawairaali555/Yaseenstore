# Separate admin email and password

The primary admin login is `/admin/login`. Select “First time? Create your admin password”, verify the existing staff identity if prompted, then choose a 15–128-character password. This is a one-time enrollment for the verified account, never a public admin registration. Staff must first accept their invitation and activate their account. No default passwords are seeded or shared in chat. Passwords cannot be overwritten by repeating setup.

Normal login uses the entered email and password and an optional enrolled authenticator code. The app session works without the platform identity headers. The private Sites hosting access policy remains a separate outer gate: this change does not make the Site public or grant anyone viewing permission. Staff without a password retain existing platform authorization during migration; once a password is set, platform sessions cannot access their admin privileges. The old platform-only admin login endpoint is disabled.

Password hashing uses Node crypto scrypt: N=16384, r=8, p=5, with a fresh 256-bit salt and constant-time comparison. This is OWASP's 16 MiB profile. The actual Workers-compatible runtime was checked with these parameters. Passwords, recovery tokens and credential hashes are never returned in admin list responses or written to audit logs. Bound input sizes and per-IP/per-email rate limits run before expensive password verification. Unknown accounts still perform dummy password verification.

Password sessions use an opaque 256-bit token; only its hash is stored. The cookie is HttpOnly, Secure, SameSite=Strict, host-only, and valid for eight hours. Requests recheck user status, session version, roles and restrictions against D1. Login uses an atomic credential/MFA/version check when creating the session. Password setup, change and reset invalidate all app sessions. Logout revokes the current session. Existing protected-owner and role-hierarchy rules still apply.

Forgot-password email uses the store's configured Resend sender. If it is not configured, the UI reports that recovery email is unavailable. Recovery returns a generic response for eligible and unknown emails, while auditing provider acceptance or uncertainty. No automatic retry is performed. Resend acceptance is not a guarantee of inbox delivery. Reset tokens are hashed, expire after 30 minutes, bind to the current session version, and are consumed atomically. Password reset preserves and requires enrolled MFA; it cannot bypass a lost authenticator. Reset links put tokens in the URL fragment, which the page removes on load. A refresh after removing the fragment requires reopening the email link. Changing password requires the current password, an authenticated admin session, and MFA when enrolled.

Endpoints all use POST `/api/access/session` with exact-origin checks:
- `password-login`: email, password, optional code, next (`/admin` or `/admin/team`).
- `setup`: password and optional code; verified platform identity required for initial ownership proof.
- `change`: currentPassword, password, optional code.
- `forgot`: email.
- `reset`: token, password, optional code.
- `logout`: clears/revokes the session.

Recovery requests and failed login attempts are attributed to an anonymous actor, with the known target account separately recorded. Successful password actions are attributed to the verified account. No credentials or real recovery email were used in development; tests use a mocked provider.

References: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html and https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/
