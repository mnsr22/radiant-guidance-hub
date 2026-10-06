# Halal Connect — Go-Live Wiring (App ⇄ Backend ⇄ Dashboard)

Goal: once deployed, every dashboard page shows real data (no sample rows) and every phone-app action lands in the same database the dashboard reads.

```text
Phone app ──JWT──▶ NestJS API (admin.halalconnect.space/api) ◀──JWT(admin)── Dashboard
                         │
                PostgreSQL (prisma/schema.prisma) · Resend · FCM · Pesapal · Gemini
```

Rule: the dashboard shows sample rows ONLY when an endpoint fails or is missing. Implement every endpoint below, returning the listed shape, and sample data disappears automatically.

---

## 1. Backend — global conventions (must match exactly)

- Base: `https://admin.halalconnect.space/api` (NestJS `app.setGlobalPrefix('api')`).
- CORS: allow the dashboard origin(s) + `Authorization`, `Content-Type`; methods GET/POST/PATCH/DELETE.
- Auth: `POST /auth/login {email,password}` → `{ accessToken, user:{id,name,email,role} }`. Admin users have `role: "admin"` (lower-case string).
- Admin guard on every `/admin/*` route: 401 if token missing/expired (dashboard logs out), 403 if not admin.
- Lists: return `{ items: [...], total }` (plain arrays also accepted). Accept `?page=&limit=&offset=&search=&status=`.
- Errors: `{ statusCode, message }` (message may be string or string[]).
- IDs strings (cuid); dates ISO-8601; money as integer minor units or whole UGX — pick one and keep it everywhere.
- Every admin mutation writes an `AuditLog` row (shown on Logs page).
- Socket.IO at server root (not /api): namespace `/admin` for live events, `/` for app chat.

## 2. Backend — endpoints the DASHBOARD calls

### Account / overview / analytics
| Method | Path |
|---|---|
| GET, PATCH | `/admin/me` |
| GET | `/admin/stats` → `{totalUsers, activeToday, newSignups, premiumUsers, pendingVerifications, openReports, revenue}` |
| GET | `/admin/analytics/growth`, `/gender`, `/practice`, `/weekly-activity`, `/match-growth` → arrays of `{label|date, value...}` |
| GET | `/admin/live`, `/admin/live/events` (+ socket `/admin` events: `signup`, `match`, `report`, `payment`, `verification`) |
| GET | `/admin/logs` |
| GET, PATCH | `/admin/settings` |

### Users & moderation
| Method | Path |
|---|---|
| GET, POST | `/admin/users` (search any field: name, email, phone, id) |
| PATCH | `/admin/users/:id` |
| POST | `/admin/users/:id/status {status}` · `/verify {verified}` · `/message {subject,body}` · `/reset-swipes` |
| GET | `/admin/reports?status=` |
| POST | `/admin/reports/:id/resolve {status,note}` · `/admin/reports/:id/ban` |
| GET, DELETE | `/admin/conversations?flagged=` · `/admin/conversations/:id` · GET `/admin/conversations/:id/messages` |
| GET | `/admin/matches`, `/admin/matches/stats` |

### Verification (manual, no SMS)
| GET | `/admin/verifications?type=phone|identity|photo&status=&search=&limit=&offset=` → items `{id, name, email, phone, phoneStatus, identityStatus, photoStatus, submittedAt}` |
| GET | `/admin/verifications/:userId` → `{phone, phoneStatus, identity:{...}, photo:{...}}` |
| PATCH | `/admin/verifications/:userId {type, status:"verified"|"rejected"|"resubmissionRequired", reason}` → push to user |
| GET | `/admin/verifications/:userId/audit` · `/admin/verification/:userId/photo` (image bytes) |

### Photos
| GET | `/admin/photos?status=pending|flagged` · PATCH `/admin/photos/:id {status, reason}` |
| GET | `/admin/photo-requests` · DELETE/PATCH `/admin/photo-requests/:id` (safety revoke) |

### Messaging, email, notifications, support
| POST | `/admin/messaging` · `/admin/notifications/broadcast` |
| GET | `/admin/notifications/history`, `/admin/notifications/audiences` |
| GET, POST | `/admin/inbox/threads`, `/admin/inbox/threads/:userId` |
| GET | `/admin/support/tickets` · `/admin/support/tickets/:id` · POST `.../replies {body, close}` · PATCH `.../:id {status}` |
| GET | `/admin/deletion-requests?status=` · POST `/:id/confirm {hardDelete}` · `/:id/reject {reason}` |
| Public | `POST /account/delete-request`, `POST /support/ticket` (website forms) |
Email campaigns send through the dashboard's own Resend function — backend must expose user emails via `/admin/users`.

### Money
| GET, POST, PATCH, DELETE | `/admin/plans`, `/admin/subscriptions`, `/admin/discounts`, `/admin/gifts`, `/admin/ads` (+ `/:id`) |
| GET | `/admin/billing/stats`, `/admin/billing/revenue`, `/admin/billing/transactions` |
| GET, PATCH | `/admin/payments/config` (never return keys; return `hasCredentials`) · POST `/admin/payments/test-connection` |
| GET, PATCH | `/admin/wallet/settings` → `{withdrawThreshold, currency}` |
| GET | `/admin/withdrawals?status=` → items include `user{name,email}, amount, method, details{phone|account, accountName, provider}` |
| POST | `/admin/withdrawals/:id/approve` · `/mark-paid {reference}` · `/reject {reason}` (refund balance) |

### Islamic, Tasbih, Wali, Journey
| GET, PATCH | `/admin/islamic/settings`, `/admin/tasbih/settings`, `/admin/wali/settings` |
| GET | `/admin/tasbih/stats`, `/weekly`, `/leaderboard?limit=` · CRUD `/admin/tasbih/badges` · PATCH `/admin/tasbih/users/:id/streak` |
| GET | `/admin/wali` · PATCH/DELETE `/admin/wali/:id` · POST `/:id/status`, `/:id/resend-invite` |
| GET | `/admin/journey/summary` |

## 3. Backend — endpoints the PHONE APP calls
Full detail in `docs/APP-API-SPEC.md`. Each app action must write the row the dashboard reads:

| App action | App endpoint | Dashboard page that sees it |
|---|---|---|
| Register / profile | `/auth/register`, `PUT /profile` | Users, Overview, Analytics |
| Submit phone/selfie/ID | `/verification/*/submit` | Verification Queue |
| Upload photo | `POST /profile/photos` | Photo Moderation |
| Private photo request | `/photos/private/requests` | Photo Moderation (audit) |
| Like/match/chat | `/likes`, `/matches`, `/chats` | Matches, Chats, Live |
| Report/block | `/users/:id/report` | Moderation / Reports |
| Subscribe / buy gift | `/payments/checkout` + Pesapal IPN | Subscriptions, Billing, Payments |
| Send gift | `/gifts/send` | Gifts, wallet ledger |
| Withdraw | `POST /wallet/withdraw` | Withdrawals |
| Tasbih | `/tasbih/sync` | Tasbih |
| Wali invite | `/wali/invite` | Wali |
| Support / delete | `/support/tickets`, `DELETE /account` | Support, Tickets, Deletion |
| Push token | `POST /devices` | Notifications reach the user |

App rules: never hardcode prices, plans, gifts, thresholds or Pesapal URLs — always load `GET /payments/config` and `GET /gifts/catalog`. Only `API_BASE_URL` lives in the app.

## 4. Database
Run `npx prisma migrate deploy` with `prisma/schema.prisma`. Add models if not yet present: `Gift`, `GiftInventory`, `GiftTransfer`, `Wallet`, `WalletLedger`, `Withdrawal`, `PaymentOrder`, `PaymentConfig` (encrypted keys), `Discount`, `PhotoAccessRequest`, `PhotoAccessGrant`, `PhotoAccessAudit`, `Verification`, `WaliLink`, `Device`. Seed one admin user (`role=admin`). No demo rows in production.

## 5. Secrets (server env only)
`DATABASE_URL`, `JWT_SECRET`, `WALI_LINK_SECRET`, `PAYMENT_KEYS_ENCRYPTION_KEY`, `GEMINI_API_KEY` (rotated), FCM service-account JSON, and SMTP settings (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`) for OTP and admin email campaigns. Pesapal keys entered from the dashboard Payments page.
Dashboard env: `VITE_API_URL=https://admin.halalconnect.space/api` (already in `.env.production`).

## 6. Pesapal setup
1. Enter consumer key/secret on Payments page → Test connection.
2. Register IPN URL `https://admin.halalconnect.space/api/public/payments/pesapal/ipn` (GET+POST) in Pesapal, paste the IPN ID.
3. Callback URL → page that redirects to `halalconnect://payment/callback`.
4. Switch Test → Live when ready. No app update needed.

## 7. Go-live verification
- [ ] Log in to dashboard with the seeded admin; no "sample data" notice appears on any page.
- [ ] Register a test user in the app → appears in Users and Live within seconds.
- [ ] Submit phone verification → approve in queue → app shows Verified + push received.
- [ ] Upload photo → approve in Photo Moderation → visible in app.
- [ ] Buy a gift in Pesapal test mode → transaction in Billing; send to second user → their wallet credits.
- [ ] Request withdrawal → Mark paid with reference → app shows Paid.
- [ ] Send a broadcast + email campaign → received.
- [ ] Open a support ticket in app → reply from dashboard → app shows reply.
