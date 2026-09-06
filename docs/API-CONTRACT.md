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
- `POST /verification/phone/start` `{phone}` → OTP by SMS
- `POST /verification/phone/verify` `{phone, code}`
- `POST /verification/identity` multipart: `documentType: nationalId|passport`, `front`, `back`, `selfie|video` (≤30s)
- `GET /verification/status` → `{phone: notSubmitted|pending|verified|rejected, identity: ...|resubmissionRequired, reason}`

Admin:
- `GET /admin/verifications?type=phone|identity&status&limit&offset`
- `GET /admin/verifications/:userId`
- `GET /admin/verifications/:userId/documents/:documentId` (signed, short-lived, audited)
- `PATCH /admin/verifications/:userId` `{type, status, reason}`
- `GET /admin/verifications/:userId/audit`

Rules: documents in private storage, signed URLs ≤5 min, every view/decision writes an audit row, rejection reason required.

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
2. Verification — phone OTP, identity document flow with status screen
3. Discovery & matches — swipe, filters, match list
4. Chat — realtime messages, read receipts, report/block
5. Private photos — request access, "Photo requests" inbox with Approve/Decline, Privacy → who can see my private photos (revocable)
6. Wali — invite guardian by email, toggle CC/weekly summary
7. Marriage journey — proposal stages, readiness checklist, optional health disclosure sharing
8. Islamic — prayer times, qibla, duas, Tasbih counter with streaks and badges
9. Billing — plans, checkout, redeem discount code, manage subscription
10. Settings — notifications, privacy, support ticket, delete account
