# Halal Connect — Backend API Contract & Mobile App Spec

Base URL: `https://admin.halalconnect.space/api`
Auth: `Authorization: Bearer <JWT>`. Admin routes require role `admin`.
Errors: `{ statusCode, message, error }`. Lists: `{ items, total, limit, offset }`.

---

## 1. Auth

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{email, password, name}` | app |
| POST | `/auth/login` | `{email, password}` | returns `{user, accessToken}` |
| POST | `/auth/refresh` | `{refreshToken}` | |
| POST | `/auth/forgot-password` | `{email}` | emails reset link (Resend) |
| POST | `/auth/reset-password` | `{token, password}` | |
| GET | `/auth/me` | – | current profile |

---

## 2. Profile & onboarding (app)

| Method | Path | Body |
|---|---|---|
| GET/PATCH | `/profile` | name, dob, gender, city, country, bio, education, occupation, sect, prayerLevel, hijab/beard, maritalStatus, childrenWanted, relocation |
| POST | `/profile/questionnaire` | `{answers: [{questionId, value}]}` — marriage-readiness answers |
| GET | `/profile/completion` | `{percent, missing: string[]}` |
| POST | `/profile/preferences` | age range, distance, sect, education, wants children |

Admin: `GET /admin/users?search&status&limit&offset`, `GET /admin/users/:id`, `PATCH /admin/users/:id` `{status: active|banned|suspended, reason}`.

---

## 3. Verification

App:
- `POST /verification/phone` `{phone}` → submits the number for **manual admin review** (no SMS, no OTP). Sets phone status to `pending` and queues the user in the admin Verification Queue.
- `GET /verification/phone` → `{phone, status, reason}` — the app polls or listens on `verification:updated`
- `POST /verification/identity` multipart: `documentType: nationalId|passport`, `front`, `back`, `selfie|video` (≤30s)
- `GET /verification/status` → `{phone: notSubmitted|pending|verified|rejected, identity: ...|resubmissionRequired, reason}`

Admin:
- `GET /admin/verifications?type=phone|identity&status&limit&offset`
- `GET /admin/verifications/:userId`
- `GET /admin/verifications/:userId/documents/:documentId` (signed, short-lived, audited)
- `PATCH /admin/verifications/:userId` `{type, status, reason}`
- `GET /admin/verifications/:userId/audit`

Rules: **phone numbers are approved manually by an admin — no SMS/OTP provider is used.** Documents in private storage, signed URLs ≤5 min, every view/decision writes an audit row, rejection reason required.

---

## 4. Photos & private photos

App:
- `POST /photos` multipart `{file, visibility: public|private}`
- `DELETE /photos/:id`, `PATCH /photos/:id` `{visibility}`
- `POST /photos/private/requests` `{ownerId, reason}`
- `GET /photos/private/requests/received|sent`
- `POST /photos/private/requests/:id/approve` · `/decline`
- `GET /photos/private/grants` · `DELETE /photos/private/grants/:userId`

**The member — not the admin — approves private-photo access.** A grant row `(ownerId, viewerId)` is the only unlock; requests expire after 7 days; unmatch/block auto-revokes; every approve/decline/revoke writes `PhotoAccessAudit`.

Admin: `GET /admin/photos?status=pending|flagged|approved|rejected`, `PATCH /admin/photos/:id` `{status, reason}`, `GET /admin/photo-requests` (read-only audit), `PATCH /admin/photo-requests/:id` (safety override only).

---

## 5. Discovery, matches, chat

App: `GET /discovery?limit`, `POST /swipe` `{targetId, action: like|pass|superlike}`, `GET /matches`, `DELETE /matches/:id`,
`GET /chats`, `GET /chats/:id/messages?before`, `POST /chats/:id/messages` `{text|attachmentId}`, `POST /chats/:id/read`,
`POST /reports` `{targetUserId, reason, evidence}`, `POST /blocks` `{userId}`.

Realtime (socket.io, root namespace, JWT in `auth.token`): `message:new`, `match:new`, `typing`, `verification:updated`, `notification:new`, `presence`.

Admin: `GET /admin/chats?flagged=true`, `GET /admin/chats/:id/messages`, `GET /admin/matches`, `GET /admin/reports`, `PATCH /admin/reports/:id` `{status, action}`.

---

## 6. Wali (guardian) — email only

App: `POST /wali/invite` `{name, email, relationship}`, `GET /wali`, `DELETE /wali/:id`,
`PATCH /wali/preferences` `{ccChats: bool, weeklySummary: bool, matchApprovals: bool}`.

Guardian side is link-only (no app): `GET /wali/confirm?token=`, `GET /wali/decline?token=`, `GET /wali/unsubscribe?token=`. Tokens signed with `WALI_LINK_SECRET`, single-use, 14-day expiry.

Jobs: chat CC digest and weekly summary emails via Resend.
Admin: `GET /admin/wali`, `GET /admin/wali/:id/emails` (delivery log).

---

## 7. Marriage journey & health disclosure

App: `POST /proposals` `{matchId, message}`, `PATCH /proposals/:id/stage` `{stage: interest|families|meeting|nikah}`, `GET /proposals`,
`GET/PATCH /journey/checklist`, `POST /health-disclosure` (encrypted at rest, shared only with an explicitly chosen match), `POST /health-disclosure/share` `{userId}`, `DELETE /health-disclosure/share/:userId`.

Admin sees aggregates only: `GET /admin/proposals?stage=`, `GET /admin/journey/checklist-stats`, `GET /admin/journey/health-adoption`.

---

## 8. Islamic features & Tasbih

App: `GET /islamic/prayer-times?lat&lng`, `GET /islamic/qibla?lat&lng`, `GET /islamic/duas`,
`POST /tasbih/session` `{dhikr, count, date}`, `GET /tasbih/streak`, `GET /tasbih/badges`, `GET /tasbih/leaderboard`.

Admin: `GET /admin/islamic/settings`, `PATCH /admin/islamic/settings/:key` `{enabled}`, `GET /admin/tasbih/stats`.

---

## 9. Billing

App: `GET /billing/plans`, `POST /billing/checkout` `{planId, provider: stripe|play|appstore}`, `POST /billing/redeem` `{code}` (server validates limit/expiry/plan), `GET /billing/subscription`, `POST /billing/cancel`.
Webhooks: `POST /api/public/webhooks/stripe|play|appstore` — verify signature before processing.

Admin: `GET /admin/plans` + `POST/PATCH`, `GET /admin/subscriptions?search`, `GET /admin/discounts`, `POST /admin/discounts`, `PATCH /admin/discounts/:id` `{active}`.

---

## 10. Notifications & email

App: `POST /devices` `{fcmToken, platform}`, `DELETE /devices/:token`, `GET /notifications`, `POST /notifications/:id/read`, `PATCH /notifications/preferences`.

Admin: `POST /admin/notifications/broadcast` `{segment|userIds, title, body, deeplink, scheduleAt}`,
`POST /admin/email/send` `{recipients:[{email,name}], subject, body, template: branded|plain, heading, ctaLabel, ctaUrl, preheader}` — one email per recipient, `{{name}}` personalised with a generic fallback, sender `Halal Connect <team@halalconnect.space>`.

---

## 11. Support, account deletion, analytics, audit

- `POST /support/ticket` `{email, subject, message}` · `GET /admin/tickets?status` · `PATCH /admin/tickets/:id` `{status, reply}`
- `POST /account/delete-request` `{email, reason}` · `POST /account/delete-confirm` `{token}` (30-day grace, then hard delete) · `GET /admin/deletion-requests`
- `GET /admin/analytics/overview?range=` · `/retention` · `/revenue` · `/adoption`
- `GET /admin/logs?actor&action&from&to` · `GET /admin/reports/export?type=&format=csv|pdf`

---

## 12. Server-side secrets (never in the app or frontend)

`JWT_SECRET`, `DATABASE_URL`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `WALI_LINK_SECRET`, FCM service-account JSON, `STRIPE_SECRET_KEY` + webhook secret, Play/App Store credentials, storage keys.
Public/safe in the app: `VITE_API_URL`, Stripe publishable key, Firebase client config.

---

## 13. Mobile app module checklist

1. Onboarding — register, profile setup wizard, photos, preferences, questionnaire
2. Verification — submit phone number for manual admin approval (no OTP), identity document flow, status screen showing pending/verified/rejected + reason
3. Discovery & matches — swipe, filters, match list
4. Chat — realtime messages, read receipts, report/block
5. Private photos — request access, "Photo requests" inbox with Approve/Decline, Privacy → who can see my private photos (revocable)
6. Wali — invite guardian by email, toggle CC/weekly summary
7. Marriage journey — proposal stages, readiness checklist, optional health disclosure sharing
8. Islamic — prayer times, qibla, duas, Tasbih counter with streaks and badges
9. Billing — plans, checkout, redeem discount code, manage subscription
10. Settings — notifications, privacy, support ticket, delete account

---

## 14. Payments via Pesapal (switchable from the dashboard, no app update)

The app never talks to Pesapal directly and never holds keys. It calls your backend, which reads the active gateway settings from the database on every request. So changing keys, test/live mode, currency or API address in **Dashboard → Payment Gateway** takes effect on the next payment.

Admin: `GET /admin/payments/config` (returns settings + `hasCredentials`, never the keys), `PATCH /admin/payments/config` `{environment, enabled, currency, apiBaseUrl, ipnId, callbackUrl, consumerKey?, consumerSecret?}` (keys encrypted at rest), `POST /admin/payments/test` → `{ok, message}`.

App:
- `GET /payments/config` → `{enabled, currency, provider}` (public info only — use it to show/hide pay buttons)
- `POST /billing/checkout` `{planId}` and `POST /gifts/purchase` `{giftId, quantity}` → `{orderId, redirectUrl}`. Open `redirectUrl` in an in-app WebView. Pesapal sends the member back to `callbackUrl`; close the WebView when that URL loads.
- `GET /payments/orders/:orderId` → `{status: pending|completed|failed}` — poll after the WebView closes.
Backend flow: `POST {apiBaseUrl}/api/Auth/RequestToken` → `POST /api/Transactions/SubmitOrderRequest` (with `notification_id = ipnId`) → IPN arrives at `POST /api/public/webhooks/pesapal` → backend confirms with `GET /api/Transactions/GetTransactionStatus?orderTrackingId=` before granting the plan/gift (never trust the IPN alone).

## 15. Gifts, wallet & withdrawals

Members buy gifts (paid via §14), keep them in an inventory, and send them to any member. The receiver's wallet is credited with the gift's `payoutValue` (the platform keeps price − payoutValue). Once the balance reaches the admin-set minimum, they can request a withdrawal; an admin pays manually, then marks it paid.

App:
- `GET /gifts` → active catalogue `[{id, name, emoji, imageUrl, price, currency}]`
- `POST /gifts/purchase` `{giftId, quantity}` → checkout (§14)
- `GET /gifts/inventory` → gifts owned, not yet sent
- `POST /gifts/send` `{giftId, recipientId, message?}` → recipient gets `gift:received` socket event + push
- `GET /gifts/received` · `GET /gifts/sent`
- `GET /wallet` → `{balance, pendingWithdrawal, minWithdrawal, currency, canWithdraw}`
- `GET /wallet/transactions`
- `POST /wallet/withdrawals` `{amount, method: mtn|airtel|bank, accountName, accountNumber}` — server checks `amount ≤ balance` and `balance ≥ minWithdrawal`, moves amount to "on hold", status `pending`
- `GET /wallet/withdrawals` → `[{id, amount, status: pending|paid|rejected, reference, reason, createdAt}]`; socket `withdrawal:updated`

Admin: `GET/POST /admin/gifts`, `PATCH/DELETE /admin/gifts/:id`, `PATCH /admin/wallet/settings` `{minWithdrawal}`, `GET /admin/withdrawals?status`, `PATCH /admin/withdrawals/:id` `{status: paid, reference}` or `{status: rejected, reason}` (rejected returns the held amount to the balance). Every change writes an audit log row.

App screens: Gift shop · My gifts (send to a profile/chat) · Gift button inside chat and profile · Wallet (balance, progress bar to minimum, history) · Withdraw form · Withdrawal status list (Pending → Paid with reference, or Rejected with reason).

Prisma models to add: `PaymentConfig` (single row, encrypted key/secret), `PaymentOrder` (userId, kind plan|gift, refId, amount, pesapalTrackingId, status), `Gift`, `GiftInventory`, `GiftTransfer` (senderId, recipientId, giftId, payoutValue), `WalletEntry` (userId, amount ±, type credit|hold|release|payout), `Withdrawal` (userId, amount, method, account, status, reference, reason, handledById).
