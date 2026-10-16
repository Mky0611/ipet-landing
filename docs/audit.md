# iPet Full-Stack Baseline Audit Report

**Date:** 2026-10-16  
**Auditor:** Senior Full-Stack Engineer, Security Reviewer & QA Lead  
**Scope:** Complete repository inspection, security posture, responsive layout, technical SEO, and product truth audit.

---

## 1. Executive Summary

The **iPet** project is an interactive desktop companion robot in active prototyping/development stage, featuring an ESP32-S3 microcontroller, a 2.8" color LCD displaying 7 animated emotions, touch interaction, and an omnidirectional motorized chassis (Mecanum wheels).

The codebase consists of:
- **Frontend:** Vanilla HTML5, CSS3 with dual-theme design system, Vanilla ES6+ JavaScript.
- **Backend:** Node.js (>=22.x), Express 5, native SQLite (`DatabaseSync` / SQLite file).
- **Deployment:** Vercel serverless integration (`vercel.json`, `api/index.js`).

While functional e-commerce components (configurator, cart, checkout, VietQR, order lookup) and interactive simulations are implemented, the audit identified several **P0 (Critical)**, **P1 (High)**, and **P2 (Medium)** defects across security, responsive UI, database persistence, and technical SEO.

---

## 2. Issues Classification Matrix

### P0 — Critical (Security, Data Integrity, Broken Core UX)

1. **Arbitrary File Exposure via Express Static (`server/server.js`):**
   - **Vulnerability:** `app.use(express.static(rootDir));` serves the entire project root directory.
   - **Impact:** Any client can request `http://<host>/ipet_data.sqlite`, downloading the complete production/test database including customer personal details (names, phone numbers, delivery addresses, order histories) and salted admin password hashes. It also exposes `package.json`, configuration files, and internal source code.
   - **Remediation:** Remove `rootDir` from static file middleware immediately. Serve strictly `public/` directory with path-traversal prevention.

2. **Ephemeral SQLite on Vercel Serverless (`server/db/database.js`):**
   - **Vulnerability:** On Vercel, the database path defaults to `/tmp/ipet_data.sqlite`.
   - **Impact:** Vercel serverless container filesystems are ephemeral and read-only outside `/tmp`. Any orders placed on `/tmp` are wiped on lambda cold starts or new deployments, resulting in permanent customer order data loss.
   - **Remediation:** Implement durable PostgreSQL-compatible storage support via `DATABASE_URL` / `POSTGRES_URL` (Neon, Supabase, Vercel Postgres) with safe SQLite fallback for local development.

3. **In-Memory Admin Authentication Loss & Brute-Force Vulnerability (`server/routes/admin.js`):**
   - **Vulnerability:** Admin sessions are stored in an in-memory `Map()`. In serverless, sessions are lost across instances. Furthermore, there is no rate limiting on `/api/admin/login` and a fallback hardcoded password (`ipet@2026`) exists in seeding code.
   - **Remediation:** Implement stateless cryptographic HMAC-SHA256 signed session tokens with short TTLs and refresh capabilities, add strict IP-based rate limiting on `/api/admin/login` (5 attempts per 15 min), and require explicit environment secrets for admin creation in production.

4. **COD Order State Machine Violation (`server/routes/api.js`):**
   - **Vulnerability:** COD orders upon creation were assigned `status: ORDER_STATES.PAID`.
   - **Impact:** False payment records. Orders should remain `PENDING` / `COD_PENDING` until actual delivery and cash collection.
   - **Remediation:** Set initial status for COD to `PENDING` with payment status `COD_PENDING`.

5. **Non-Atomic Inventory & Order Creation (`server/routes/api.js`):**
   - **Vulnerability:** Checking inventory, creating the order, deducting stock, and incrementing coupon counts are performed as separate uncommitted queries.
   - **Impact:** Race conditions during concurrent orders can cause overselling and negative inventory.
   - **Remediation:** Wrap all operations within atomic database transactions.

6. **Tablet Header / Hero Overlap (768px - 860px):**
   - **Defect:** Fixed/sticky navigation header (72px) overlaps the Hero badge and title at tablet widths because `.hero` relies on insufficient relative padding.
   - **Remediation:** Structure `.hero` padding with explicit header offset: `padding-top: calc(var(--header-height) + clamp(2rem, 5vw, 4rem));`.

---

### P1 — High (Important Functional, SEO & Truthfulness Defects)

1. **Lucide Icons Console Warnings & Missing Social Icons:**
   - **Issue:** Modern Lucide builds do not provide brand icons (`github`, `facebook`, `youtube`). Calls to `lucide.createIcons()` generate runtime console warnings and render empty placeholders.
   - **Remediation:** Use semantic, accessible inline SVGs for brand logos.

2. **Unbalanced Specification Cards (3+1 Grid):**
   - **Issue:** `.specs-grid` with `repeat(auto-fit, minmax(320px, 1fr))` creates 3 cards on the top row and 1 orphaned card on the bottom row on 1200px screens.
   - **Remediation:** Standardize to an intentional, responsive 2x2 grid (`repeat(2, 1fr)`) on desktop/tablet.

3. **Placeholder Facebook Link & Missing Channel Anchor:**
   - **Issue:** Social links in header and footer pointed to `#` or generic placeholders.
   - **Remediation:** Replace with official project link: `https://www.facebook.com/profile.php?id=61594612043611` with proper accessibility attributes.

4. **SEO Fragment URLs in Sitemap:**
   - **Issue:** `sitemap.xml` contained in-page anchors (`/#specs`, `/#configurator`, `/#3d-showcase`) which violate Google Search Console sitemap standards.
   - **Remediation:** Clean `sitemap.xml` to include only crawlable canonical document URLs with verified `lastmod`.

5. **Product Stage Overpromising:**
   - **Issue:** Earlier copy presented iPet as a mass-produced consumer gadget rather than a transparent, passion-driven engineering prototype.
   - **Remediation:** Add transparent prototype status indicators, distinguish tested features vs roadmap features.

---

### P2 — Medium (Visual Polish & Accessibility Refinement)

1. **Mobile Gallery Horizontal Scrolling:**
   - CAD gallery navigation tabs need smooth horizontal swipe scrolling with no page-wide overflow.
2. **Context-Aware Sticky Buy Bar:**
   - Sticky buy bar should respect `env(safe-area-inset-bottom)` on iOS and hide gracefully when modals are open.
3. **Audio Context Autoplay Protection:**
   - Verify all audio actions are gated strictly behind explicit user interactions.

---

## 3. Baseline Test Verification

- **Node.js Test Runner Execution:**
  - `node --test tests/*.test.js`
  - **Results:** 15 passing, 0 failing, duration ~325ms - 10276ms.
  - Tests verify order state machine transitions, pricing calculation (fixed and percentage coupons), Vietnamese phone validation, checkout form validation, API endpoints.
