# Halal Connect — Complete App-Side & API-Side Specification

Base URL: `https://admin.halalconnect.space/api` (adjust to your server).
All endpoints except auth/onboarding require `Authorization: Bearer <JWT>`.
All list endpoints support `?page=&limit=&search=`.

---

## 1. Auth & Onboarding

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{email, password, name, gender, dob}` | Returns JWT |
| POST | `/auth/login` | `{email, password}` | Returns JWT + user |
| POST | `/auth/refresh` | `{refreshToken}` | |
| POST | `/auth/forgot-password` | `{email}` | Email via Resend |
| POST | `/auth/reset-password` | `{token, newPassword}` | |
| GET | `/auth/me` | — | Current user profile |
| DELETE | `/account` | `{password, reason?}` | Marks account for deletion; admin sees it in Delete Requests |

App screens: splash, login, register, forgot password, onboarding (profile setup flow + questionnaire).

---

## 2. Profile

| Method | Endpoint | Body |
|---|---|---|
| GET | `/profile` | — |
| PUT | `/profile` | `{name, bio, city, country, sect, prayerHabit, ...}` |
| POST | `/profile/photos` | multipart image; `{isPrivate: bool}` |
| DELETE | `/profile/photos/:id` | — |
| POST | `/profile/questionnaire` | `{answers: {...}}` — marriage-readiness questionnaire |
| GET | `/profile/completeness` | → `{percent, missing: []}` |

---

## 3. Verification (manual, admin-approved — no SMS OTP)

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/verification/phone/submit` | `{phone}` | Stores number, status `pending`. App shows "under review". |
| GET | `/verification/status` | — | → `{phone: {status}, photo: {status}, id: {status}}` |
| POST | `/verification/photo/submit` | multipart selfie | Admin compares to profile photos |
| POST | `/verification/id/submit` | multipart ID doc | Optional tier |

Admin side (dashboard Verification Queue):
`GET /admin/verification/queue?type=phone|photo|id&status=pending`,
`POST /admin/verification/:id/approve`, `POST /admin/verification/:id/reject {reason}`.
On decision, user gets a push notification.

---

## 4. Photo Moderation & Private Photos

App:
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/photos/:id` | Public photos: any matched user. Private: owner or granted viewers only. Signed short-lived URLs. |
| POST | `/photos/private/requests` | `{ownerId, reason?}` — ask to view someone's private photos |
| GET | `/photos/private/requests/received` | Inbox of requests |
| POST | `/photos/private/requests/:id/approve` | Creates grant |
| POST | `/photos/private/requests/:id/decline` | Requester told only "not accepted" |
| GET | `/photos/private/grants` | Who can see my private photos |
| DELETE | `/photos/private/grants/:userId` | Revoke |

Rules: requests expire after 7 days; unmatch/block auto-revokes; every action writes a `PhotoAccessAudit` row.

Admin (Photo Moderation page): `GET /admin/photos?status=pending|flagged`, `POST /admin/photos/:id/approve|reject {reason}`, `GET /admin/photos/private-requests` (read-only audit + safety override revoke).

---

## 5. Discovery, Matching & Likes

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/discover?filters...` | Cards stack; filters: age, distance, sect, prayer habit, verified-only |
| POST | `/likes` | `{targetId}` → `{match: bool, matchId?}` |
| POST | `/passes` | `{targetId}` |
| GET | `/matches` | Active matches |
| DELETE | `/matches/:id` | Unmatch (revokes photo grants, closes chat) |
| POST | `/users/:id/block` | |
| POST | `/users/:id/report` | `{reason, details?}` → admin Moderation queue |

---

## 6. Chat

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/chats` | Conversation list |
| GET | `/chats/:id/messages?before=` | Paginated history |
| POST | `/chats/:id/messages` | `{text}` (text only until both verified — configurable) |
| WS | `/ws` | Real-time messages, typing, read receipts (Socket.IO or native WS) |
| POST | `/chats/:id/read` | |

Admin: full transcript view, keyword flagging, broadcast messages (dashboard Messaging page).

---

## 7. Wali (email-only guardian)

| Method | Endpoint | Body |
|---|---|---|
| POST | `/wali/invite` | `{name, email}` — sends branded invite email with secure confirm/decline token links |
| DELETE | `/wali` | Remove guardian |
| PUT | `/wali/preferences` | `{chatSummaries: bool, weeklyDigest: bool, matchAlerts: bool}` |
| GET | `/wali/status` | → `{linked, name, email, confirmedAt}` |

Server behaviour: when enabled, the wali receives periodic email digests of chat activity and match alerts. Token links: `GET /wali/confirm/:token`, `GET /wali/decline/:token` (public, signed with `WALI_LINK_SECRET`). No app needed for the wali.

---

## 8. Payments — Pesapal (switchable from dashboard, no app update)

**Key principle: the app never stores payment keys or URLs.** It always asks the server for the current config, so you can rotate Pesapal credentials or switch environment (sandbox ↔ live) from the dashboard Payments page and the change is live instantly.

### App flow
1. App calls `GET /payments/config` → `{provider: "pesapal", currency: "UGX", plans: [...], giftsEnabled: bool}` — render paywall from this, never hardcode prices.
2. User picks a plan/gift → `POST /payments/checkout {itemType: "subscription"|"gift", itemId}` → server registers order with Pesapal (using the keys stored in the dashboard) and returns `{redirectUrl, orderTrackingId}`.
3. App opens `redirectUrl` in an in-app webview. Deep-link return URL: `halalconnect://payment/callback`.
4. On return, app polls `GET /payments/status/:orderTrackingId` → `{status: "pending"|"completed"|"failed"}`. On `completed`, entitlement (premium or gift balance) is already active — server confirms with Pesapal before granting.
5. Pesapal IPN webhook (server-side): `POST /api/public/payments/pesapal/ipn` — verifies with Pesapal, credits the purchase, idempotent on `orderTrackingId`.

### Admin (dashboard Payments page)
- Store/rotate Pesapal `consumerKey`, `consumerSecret`, environment (sandbox/live), callback URL, IPN ID — all server-side, never sent to the app.
- View transactions: `GET /admin/payments/transactions?status=&search=`.
- Test connection button: server does a Pesapal token request and reports OK/fail.

---

## 9. Gifts, Wallet & Withdrawals

### Gift shop (app)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/gifts/catalog` | → `[{id, name, image, price, currency}]` — admin-managed from dashboard Gifts page |
| POST | `/gifts/purchase` | `{giftId, quantity}` → Pesapal checkout (same flow as §8) → gifts added to inventory |
| GET | `/gifts/inventory` | Gifts I own and can send |
| POST | `/gifts/send` | `{giftId, toUserId, message?}` — recipient gets push + in-app gift card |
| GET | `/gifts/received` | Gift history |

### Wallet & withdrawals (app)
| Method | Endpoint | Notes |
|---|---|---|
| GET | `/wallet` | → `{balance, pendingBalance, lifetime, threshold, canWithdraw}` |
| GET | `/wallet/transactions` | Ledger: gifts received, withdrawals, adjustments |
| POST | `/wallet/withdraw` | `{amount, method: "mobile_money"|"bank", details: {phone or account}}` — only if `amount >= threshold` and `<= balance` → status `pending` |
| GET | `/wallet/withdrawals` | My withdrawal history with statuses |

### Server rules
- Each gift has a `cashValue` (e.g. 70% of purchase price — your commission is the rest). Receiving a gift credits `balance` by `cashValue`.
- Withdrawal threshold (e.g. 50,000 UGX) is admin-configurable: `GET /payments/config` includes it.
- One pending withdrawal per user at a time.

### Admin (dashboard Withdrawals page)
- `GET /admin/withdrawals?status=pending|approved|paid|rejected`
- `POST /admin/withdrawals/:id/approve` → status `approved`, you send the money manually (mobile money/bank)
- `POST /admin/withdrawals/:id/mark-paid {reference}` → status `paid`, user notified
- `POST /admin/withdrawals/:id/reject {reason}` → amount returned to user balance, user notified
- Full user ledger view for support.

---

## 10. Subscriptions & Discounts

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/plans` | From `/payments/config` — name, price, features, duration |
| GET | `/subscriptions/me` | Current plan, expiry |
| POST | `/discounts/validate` | `{code}` → `{valid, percentOff, appliesTo}` — apply before checkout |

Admin: plan manager (Monetization page), discount codes CRUD with usage limits and expiry (Discounts page).

---

## 11. Notifications

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/devices` | `{fcmToken, platform}` — register for push |
| GET | `/notifications` | In-app notification centre |
| POST | `/notifications/read` | `{ids: []}` |

Server sends (via FCM): matches, messages, likes, verification decisions, gift received, withdrawal status, AI-generated greetings (good morning, Ramadan, Eid — Gemini server-side), admin broadcasts and email campaigns (dashboard Notifications/Email pages, Resend for email).

---

## 12. Islamic Features

| Method | Endpoint | Notes |
|---|---|---|
| GET/PUT | `/islamic/settings` | Prayer-habit visibility, chaperone mode, etc. |
| POST | `/tasbih/sync` | `{count, date}` — daily count |
| GET | `/tasbih/streak` | → `{current, longest, badges: []}` |
| GET/POST | `/journey` | Marriage-readiness journey steps and progress |

---

## 13. Support & Safety

| Method | Endpoint | Notes |
|---|---|---|
| POST | `/support/tickets` | `{subject, message}` |
| GET | `/support/tickets` | My tickets + replies |
| POST | `/support/tickets/:id/reply` | |
| GET | `/legal/privacy`, `/legal/terms` | Static content for in-app webview (also at halalconnect.space/privacy) |

AI assist (server-side Gemini): suggested replies for support agents, with human handoff — user is told a human will follow up. AI never finalises moderation decisions.

---

## Server-side secrets (never in the app, never in frontend code)

| Secret | Purpose |
|---|---|
| `GEMINI_API_KEY` | AI copywriting / support suggestions |
| `PESAPAL_CONSUMER_KEY` / `PESAPAL_CONSUMER_SECRET` | Payments — editable from dashboard, stored encrypted server-side |
| `RESEND_API_KEY` | Email sending (domain halalconnect.space verified) |
| `JWT_SECRET` | Auth tokens |
| `WALI_LINK_SECRET` | Signs wali confirm/decline links |
| FCM service account JSON | Push notifications |

Only public value in the app: the API base URL.
