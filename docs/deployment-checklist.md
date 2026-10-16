# iPet Production Deployment & Release Checklist

**Target Environments:** Vercel (Frontend & Serverless Functions) / Node.js Server (Docker/VPS)  
**Version:** 2.0-stabilized  
**Last Updated:** 2026-10-16

---

## 1. Pre-Deployment Verification

Before triggering a production build or Git push:

- [x] **Automated Tests:** Run all test suites:
  ```bash
  node --test tests/*.test.js
  ```
  Ensure 100% pass rate with zero unhandled exceptions.
- [x] **File Synchronization:** Confirm that root frontend files (`index.html`, `style.css`, `main.js`, `robots.txt`, `sitemap.xml`) match their mirrors in `public/`.
- [x] **Static Asset Integrity:** Verify all referenced media files exist in `public/assets/images/`:
  - `logo.png`
  - `ipet-3d-car-master.jpg`
  - `ipet-circuit-schematic.png`
  - `ipet-cad-topshell.png`
  - `ipet-cad-chassis.png`
  - `ipet-cad-interior.png`
  - `ipet-poster-teaser.jpg`
  - `ipet-poster-companion.jpg`
- [x] **No Leaked Secrets:** Ensure `.env`, SQLite files (`*.sqlite`), or `.git` are not committed or served statically.
- [x] **Directory Traversal Protection:** Verify `server/server.js` restricts static serving strictly to `public/` and rejects paths with `..`, `.sqlite`, `.env`, or `/server`.

---

## 2. Environment Variables Checklist

Set these variables in the Vercel Dashboard (Project Settings > Environment Variables) or server `.env`:

| Variable Name | Required | Default / Recommended | Purpose |
|---|---|---|---|
| `NODE_ENV` | Optional | `production` | Enables production optimizations & secure logging |
| `ADMIN_DEFAULT_PASSWORD` | Recommended | *(Strong random secret)* | Initial admin login password |
| `ADMIN_JWT_SECRET` | Recommended | *(Hex secret >= 32 chars)* | HMAC-SHA256 signing key for admin tokens |
| `DATABASE_URL` | Optional | *(None - uses SQLite)* | PostgreSQL connection URL if migrating to external DB |
| `PORT` | Optional | `3000` | Local or standalone Node server listening port |

> [!NOTE]
> On Vercel Serverless, SQLite runs on an ephemeral `/tmp` filesystem. For persistent multi-region order storage across serverless cold starts, provide a managed PostgreSQL `DATABASE_URL` or configure a hosted database service.

---

## 3. Vercel Configuration Verification

Check `vercel.json`:
```json
{
  "version": 2,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/admin(.*)", "destination": "/admin/index.html" },
    { "source": "/(.*)", "destination": "/$1" }
  ]
}
```
Ensure `api/index.js` correctly forwards requests to the Express application without duplicate path prefixes.

---

## 4. Post-Deployment Smoke Tests

Execute these smoke tests immediately after deployment to the live URL:

### 4.1 Frontend UI & Responsive Layout
1. **Desktop & Mobile:** Open `https://ipet-landing-psi.vercel.app/` on desktop and mobile viewports (375px, 768px, 1280px).
2. **Hero & Header:** Confirm the sticky navigation header does NOT overlap the hero title at 768px.
3. **Specifications Grid:** Confirm the 4 spec cards render as a balanced 2x2 grid on desktop, collapsing to 1 column on mobile.
4. **CAD Gallery Tabs:** Click each tab (`Mô Hình 3D Chuẩn`, `Sơ Đồ Mạch Điện`, `CAD Nội Thất`, `CAD Vỏ Trên`, `CAD Khung Gầm`). Verify images and specs load smoothly.
5. **Emotion Canvas:** Select each of the 7 emotion buttons. Verify eye animations render crisply on canvas.

### 4.2 E-Commerce & Checkout Flow
1. **Configurator:** Change editions (Standard vs Maker Kit) and colors (Obsidian Blue, Phantom White, Cyber Silver). Verify price updates authoritatively.
2. **Add to Cart:** Add product to cart. Verify drawer opens, cart badge updates, and subtotal is calculated correctly.
3. **Order Placement (COD):**
   - Click "Tiến Hành Đặt Hàng".
   - Enter test customer details: Full name, phone, address.
   - Choose "Thanh toán khi nhận hàng (COD)".
   - Submit order.
   - Verify success modal displays order code (`IPET-XXXX`).
   - Check that order status starts as `PENDING` with `payment_status: 'COD_PENDING'`.
4. **Order Placement (VietQR):**
   - Place an order with VietQR bank transfer.
   - Verify generated QR code and transfer message format: `IPET <ORDER_CODE>`.
5. **Order Tracking:**
   - Click "Tra Cứu ĐH" in navigation.
   - Input the generated order code.
   - Verify timeline displays current order status and items accurately.

### 4.3 Security & Admin Portal
1. **Direct File Probing:**
   - Request `https://ipet-landing-psi.vercel.app/ipet_data.sqlite` -> Expect **403 Forbidden** or **404 Not Found**.
   - Request `https://ipet-landing-psi.vercel.app/package.json` -> Expect **403 Forbidden**.
   - Request `https://ipet-landing-psi.vercel.app/.env` -> Expect **403 Forbidden**.
2. **Rate Limiting:**
   - Attempt 6 failed logins to `/api/admin/login` within 1 minute -> Expect **429 Too Many Requests**.
3. **Admin Dashboard:**
   - Log into `/admin/` using credentials.
   - Verify orders table lists recent orders.
   - Test status transition (e.g. `PENDING` -> `CONFIRMED` -> `SHIPPING`).

---

## 5. Rollback Plan

If critical defects are identified in production:
1. **Vercel Instant Rollback:** In Vercel Project > Deployments, click on the previous stable deployment and select "Instant Rollback".
2. **Git Revert:**
   ```bash
   git revert HEAD
   git push origin main
   ```
