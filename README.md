# Radiant Guidance Hub - Admin Verification Dashboard

A TypeScript/React admin console for reviewing and managing user identity and phone verification for the Halal Dating App.

## Features

- **Verification Queue Management**: View and manage pending phone and identity verifications
- **Secure Document Review**: Preview uploaded identity documents (national ID, passport, selfies)
- **Real-time Updates**: WebSocket-based realtime refresh for verification status changes
- **Audit Trail**: Complete history of all verification reviews with timestamps and reasons
- **Status Filters**: Filter by pending, verified, rejected, and resubmission-required statuses
- **Admin Actions**:
  - Approve phone numbers and identity submissions
  - Reject with required reasoning
  - Request resubmission with specific feedback

## Tech Stack

- **Framework**: React 19 with TanStack Router
- **Styling**: Tailwind CSS 4 with custom components
- **State Management**: React Query + Sonner for notifications
- **Real-time**: Socket.IO client for WebSocket updates
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Radix UI primitives
- **Build**: Vite with TypeScript

## API Contract

### Admin Endpoints

#### Get User Verification Status
```
GET /api/admin/users/:id/verification
```

Returns phone verification status and identity submission metadata.

#### Get Verification Document
```
GET /api/admin/users/:id/verification/documents/:documentId
```

Securely downloads a private verification file for authorized reviewers.

#### Review Phone Verification
```
PATCH /api/admin/users/:id/verification/phone

{
  "status": "verified" | "rejected",
  "reason": "Phone number confirmed"
}
```

#### Review Identity Verification
```
PATCH /api/admin/users/:id/verification/identity

{
  "status": "verified" | "rejected" | "resubmissionRequired",
  "reason": "The back of the document is not readable..."
}
```

#### Get Pending Verifications Queue
```
GET /api/admin/verifications/pending?type=phone&type=identity&limit=50&offset=0
```

#### Get Verification Audit History
```
GET /api/admin/users/:id/verification/audit
```

Returns complete audit trail of all verification reviews.

## Project Structure

```
src/
├── components/
│   ├── verification/
│   │   ├── VerificationDetailModal.tsx
│   │   ├── VerificationFilters.tsx
│   │   └── VerificationQueueTable.tsx
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       ├── table.tsx
│       └── textarea.tsx
├── hooks/
│   └── useVerificationRealtimeUpdates.ts
├── lib/
│   ├── api/
│   │   └── verification-api.ts
│   └── utils.ts
├── routes/
│   └── admin/
│       └── verification.tsx
├── types/
│   └── verification.ts
└── main.tsx
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Format code
npm run format
```

## Environment Variables

```env
VITE_API_URL=http://localhost:3000/api
```

## Real-time Features

The dashboard automatically refreshes when:
- `verification:updated` events are received (user verification status changed)
- `notification:new` events are received (admin action notifications)

WebSocket connection authenticates using the admin token from localStorage.

## Mobile App Integration

The mobile app (Flutter) submits verification evidence as:

1. **Phone Verification**
   - Users submit phone numbers
   - Status tracked: `notSubmitted` → `pending` → `verified|rejected`

2. **Identity Verification** (Ordered Flow)
   - Select document type (National ID or Passport)
   - Upload front image
   - Upload back image
   - Upload selfie or short video (max 30 seconds)
   - Submit for review
   - Status tracked: `notSubmitted` → `pending` → `verified|rejected|resubmissionRequired`

### Upload Contract
```
POST /api/upload/verification-document

Multipart fields:
- file: image/jpeg | image/png | image/webp | video/mp4 | video/quicktime | video/webm
- kind: "front" | "back" | "selfie" | "video"

Response:
{
  "documentId": "opaque-id",
  "kind": "front",
  "mimeType": "image/jpeg",
  "size": 123456,
  "originalName": "front.jpg"
}
```

## License

Private repository
