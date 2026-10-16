# iPet Full-Stack Stabilization & Remediation Plan

This document outlines the step-by-step remediation strategy across all 7 phases to bring the iPet website to production readiness.

---

## Phase 1: Security Hardening & Durable Database Architecture

1. **Static Directory Traversal Fix:**
   - Modify `server/server.js`:
     - Delete `app.use(express.static(rootDir));`.
     - Configure `app.use(express.static(publicDir));` with dotfile blocking and explicit directory traversal prevention.
     - Ensure `index.html`, `style.css`, `main.js`, `robots.txt`, `sitemap.xml` are served exclusively from `public/`.
2. **Durable Database Adapter with Explicit Migrations:**
   - Update `server/db/database.js`:
     - Create a clean database abstraction that supports PostgreSQL (`DATABASE_URL` / `POSTGRES_URL` via `pg` pool) or local persistent SQLite (`ipet_data.sqlite`).
     - Add `schema_migrations` table to track applied schema version numbers.
     - Add transaction support `db.transaction(fn)` for atomic multi-statement operations.
3. **Stateless Admin Authentication & Rate Limiting:**
   - In `server/routes/admin.js`:
     - Replace `activeSessions` map with signed HMAC-SHA256 tokens (`iPetAuthToken`).
     - Token payload: `{ username, role, exp }` with 24-hour expiration.
     - Add in-memory sliding-window IP rate limiter for `/api/admin/login` (5 attempts / 15 min).
     - Remove hardcoded default password fallback in production; require explicit `ADMIN_DEFAULT_PASSWORD`.
4. **Order Atomicity & COD State Fix:**
   - In `server/routes/api.js`:
     - Change COD order initial status from `PAID` to `PENDING` with payment status `COD_PENDING`.
     - Wrap order creation, stock verification/deduction, and coupon use inside `db.transaction()`.
     - Add rate limiting for public endpoints (`/api/orders`, `/api/survey`, `/api/reviews`).
     - Sanitize all error messages.

---

## Phase 2: Responsive UI & Structural Layout Repair

1. **Header & Hero Overlap (768px - 860px):**
   - Add CSS variable `--header-height: 72px;`.
   - Update `.hero` padding:
     `padding: calc(var(--header-height) + clamp(1.5rem, 4vw, 3rem)) 0 4rem;`.
   - Verify layout stability at 320, 360, 375, 390, 430, 600, 768, 820, 1024, 1280, 1440, 1920 px.
2. **Technical Specifications 2x2 Layout:**
   - Update `.specs-grid` from `repeat(auto-fit, minmax(320px, 1fr))` to:
     ```css
     .specs-grid {
       display: grid;
       grid-template-columns: repeat(2, 1fr);
       gap: 1.75rem;
     }
     @media (max-width: 768px) {
       .specs-grid {
         grid-template-columns: 1fr;
       }
     }
     ```
3. **CAD Gallery Mobile Tab Swiping:**
   - Update `.gallery-nav-tabs` with `overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; -webkit-overflow-scrolling: touch;`.
4. **Sticky Buy Bar Context Awareness:**
   - Add iOS safe-area bottom padding: `padding-bottom: calc(0.85rem + env(safe-area-inset-bottom));`.
   - Ensure it hides when modals (`checkout-modal`, `order-lookup-modal`) are active.

---

## Phase 3: Honest Product Presentation & Asset Classification

1. **Prototype Notice:**
   - Add discrete, transparent project milestone banner in hero/navbar:
     *"Dự án đang trong giai đoạn phát triển & thử nghiệm nguyên mẫu kỹ thuật (Hardware Prototype Status)"*.
2. **Asset Integration:**
   - Classify assets:
     - `ipet-3d-car-master.jpg`: Master 3D technical render of rover form factor.
     - `ipet-circuit-schematic.png`: Verified circuit wiring schematic (ESP32-S3, ILI9341, TB6612FNG, 18650).
     - `ipet-cad-topshell.png` & `ipet-cad-chassis.png`: 3D CAD blueprints for 3D printing & molding.
     - `ipet-cad-interior.png`: Interior chassis mounting layout.
     - `ipet-poster-companion.jpg` & `ipet-poster-teaser.jpg`: Official project vision posters.

---

## Phase 4: UX & Interactive Functionality

1. **Lucide Icons Resolution:**
   - Replace `<i data-lucide="github"></i>`, `<i data-lucide="facebook"></i>`, `<i data-lucide="youtube"></i>` with inline, high-fidelity SVGs.
   - Pinned/fallback icon handling to eliminate all browser console warnings.
2. **Audio Gesture Enforcing:**
   - Ensure all speech synthesis/audio triggers require deliberate user interaction.
3. **Interactive Voice Prompts:**
   - Maintain the dynamic conversation bubbles, soundwave pulsing, and automatic LCD emotion reaction.

---

## Phase 5: Complete Technical SEO

1. **Domain & Canonicalization:**
   - Single canonical origin: `https://ipet-landing-psi.vercel.app` (configurable via `APP_URL`).
2. **Sitemap & Robots.txt:**
   - Remove anchor fragments (`/#...`) from `sitemap.xml`.
   - Ensure `robots.txt` disallows `/api/admin` and private endpoints.
3. **Verified Social Links:**
   - Facebook: `https://www.facebook.com/profile.php?id=61594612043611` with `target="_blank" rel="noopener noreferrer"`.
4. **Structured Data:**
   - Clean JSON-LD schema with truthful PreOrder status, currency VND, and organization data.

---

## Phase 6: Automated Testing & Quality Gates

1. Write `tests/security.test.js`:
   - Verify static directory traversal blocking (cannot fetch `ipet_data.sqlite` or `package.json`).
   - Verify admin login rate limiter (triggers 429 after 5 failed attempts).
   - Verify token authentication and expiration.
2. Write `tests/orderTransaction.test.js`:
   - Verify atomic order creation and inventory deduction.
   - Verify COD orders start as `PENDING` with `payment_status: 'COD_PENDING'`.
3. Write `tests/seo.test.js`:
   - Verify `sitemap.xml` format and validity (no anchor fragments).
   - Verify Open Graph and canonical metadata.
4. Execute complete test suite.
