# Invitation email with Resend

Open Admin → Team & access → Invites → Set up Resend as Super Admin. Enter a Resend API key with sending permission and a sender email on a domain verified in your Resend account. The sender must be authorized for that key. Saving settings does not send a test email or confirm provider credentials. Create an invitation with “Send invitation emails via Resend” checked to send it.

The API key is AES-GCM encrypted in D1 using the existing server-only ADMIN_MFA_KEY, with distinct associated data. It is never returned by GET or included in audits. Rotating that encryption key requires re-encrypting both existing MFA secrets and email configuration/payloads. Do not paste API keys in chat or commit them.

POST /api/access/email configures {apiKey,sender} (Super Admin only). GET returns configured/sender without credentials. POST /api/access/invites accepts sendEmail:true and up to 20 recipient emails, using the existing role checks. Email-bound invitations are single-use. Link-only creation remains available. POST /api/access/invites {action:"send",id} retries an existing email job for its creator or a permitted Super Admin.

Invitations and encrypted frozen email payloads are saved atomically before sending. Each request to https://api.resend.com/emails uses a stable per-invite Idempotency-Key. Retry uses the same payload, even after sender settings change. To change the sender on a failed email, revoke the old invitation and create a new one. Accepted payloads are erased. Failed/pending payloads remain encrypted for operator recovery; there is no automatic retry scheduler.

The UI distinguishes pending, sending, failed, unknown and accepted by Resend. “Accepted” is API acceptance, not proof of inbox delivery. Delivery/bounce details are available in the Resend dashboard; webhooks are not configured. Missing configuration prevents invitation creation when email sending is selected. Provider failures preserve the invitation and display a safe error, with retry available. An unknown result can be retried for 23 hours from the first attempt, within Resend's documented 24-hour idempotency retention. After that, revoke and create a new invitation. A 60-second lease prevents concurrent sends; authorization and invitation validity are checked again when claiming the job.

Invite generation is limited to 20 batches/hour per actor; email attempts to 40/hour per actor. Resend may impose additional limits. Audits include email requests, acceptance/failure/unknown outcomes, and configuration changes, without credentials or links. No automatic emails are sent for other lifecycle actions in this change.

Private Site viewing access is separate from application membership. Invitees need Site sharing permission before accepting their invitation.

Validation: node --test tests/access-system.test.mjs (17 security/integration tests, including mocked Resend success, rejection, timeout/retry, ownership and configuration). No real email was sent during development.

Provider reference: https://resend.com/docs/api-reference/emails/send-email
Idempotency: https://resend.com/docs/dashboard/emails/idempotency-keys
