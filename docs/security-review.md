# iPet Security Review & Hardening Report

**Audit Date:** 2026-10-16  
**Audited Components:** Express server, Static file serving, Admin authentication, Session handling, Public APIs, Database access, Rate limiting.

---

## 1. Vulnerability Findings & Implemented Remediations

### 1.1 Arbitrary Root Static File Access (P0) — RESOLVED
- **Vulnerability:** `app.use(express.static(rootDir))` permitted any client to request sensitive files residing in the workspace root, including `ipet_data.sqlite`, `package.json`, `.env` (if present), and server source code.
- **Remediation Implemented:**
  - Completely removed root directory static serving in `server/server.js`.
  - Sandboxed static serving strictly to `public/` directory with `dotfiles: 'ignore'`.
  - Added a proactive request path guard in `server/server.js` that inspects decoded request paths and returns HTTP 403 Forbidden for:
    - Path traversal sequences (`..`).
    - Internal directories (`/server`, `/tests`, `/.git`).
    - Sensitive extensions (`.sqlite`, `.db`, `.env`, `.log`, `.md`, `.lock`).
    - Root configuration manifests (`/package.json`, `/vercel.json`).

### 1.2 In-Memory Admin Session Loss & Weak Auth (P0) — RESOLVED
- **Vulnerability:** Admin sessions were stored in a runtime JavaScript `Map()`. In multi-instance or serverless deployments, cold starts invalidated sessions unpredictably. Additionally, the fallback admin password in `database.js` was hardcoded to `ipet@2026`.
- **Remediation Implemented:**
  - Migrated to stateless cryptographic HMAC-SHA256 signed tokens (`createAdminToken` / `verifyAdminToken`).
  - Utilized `crypto.timingSafeEqual()` on token signatures and password hashes to eliminate timing attack vectors.
  - Restricted token validity to 24 hours with embedded expiration timestamps.
  - In production (`NODE_ENV === 'production'`), if `ADMIN_DEFAULT_PASSWORD` is omitted, the system generates a cryptographically random 24-character hexadecimal password and logs it securely during initial initialization rather than accepting a static fallback.

### 1.3 Missing Rate Limiting on Authentication & Public Submissions (P0/P1) — RESOLVED
- **Vulnerability:** No rate limiting was enforced, leaving `/api/admin/login` vulnerable to dictionary attacks and `/api/orders` vulnerable to automated spam and denial-of-inventory.
- **Remediation Implemented:**
  - Built an in-memory sliding-window rate limiter in `server/middleware/rateLimiter.js`.
  - Configured route-specific thresholds:
    - `POST /api/admin/login`: Max 5 attempts per 15 minutes per IP (`loginLimiter`).
    - `POST /api/orders`: Max 15 requests per 5 minutes per IP (`orderLimiter`).
    - `POST /api/survey`: Max 8 requests per 10 minutes per IP (`surveyLimiter`).
    - `POST /api/reviews`: Max 5 submissions per 10 minutes per IP (`reviewLimiter`).
  - Returns standard HTTP 429 status with `Retry-After` header.

### 1.4 Non-Atomic Order & Inventory Race Conditions (P0) — RESOLVED
- **Vulnerability:** Order insertion and inventory decrement were executed as separate queries without an ACID transaction, allowing stock overselling during concurrent submissions.
- **Remediation Implemented:**
  - Added atomic transaction support `db.transaction(fn)` in `server/db/database.js`.
  - Wrapped stock validation, order persistence, inventory decrement, and coupon use count updates within an immediate atomic transaction. If stock is insufficient, the transaction throws `OUT_OF_STOCK` and rolls back all changes.

### 1.5 COD Order State Violation (P0) — RESOLVED
- **Vulnerability:** COD orders upon creation were assigned `status: 'PAID'`.
- **Remediation Implemented:**
  - Initial state for COD orders is now strictly `PENDING` with `payment_status: 'COD_PENDING'`.
  - Payment transition to `PAID` requires explicit delivery confirmation and collection by administration.

### 1.6 Security Headers & Content Security Policy (CSP) (P1) — RESOLVED
- **Remediation Implemented in `server/server.js`:**
  - `Content-Security-Policy`: Strictly white-lists necessary CDNs (`fonts.googleapis.com`, `fonts.gstatic.com`, `unpkg.com`, VietQR API images).
  - `X-Content-Type-Options: nosniff`.
  - `X-Frame-Options: SAMEORIGIN`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
