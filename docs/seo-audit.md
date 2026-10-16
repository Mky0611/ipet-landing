# iPet Technical SEO & Metadata Audit Report

**Date:** 2026-10-16  
**Auditor:** Senior Technical SEO Specialist & Frontend Engineer  
**Target Domain:** `https://ipet-landing-psi.vercel.app/`

---

## 1. Executive Summary

This audit evaluates the technical search engine optimization (SEO), metadata completeness, crawlability, indexability, structured data validity, and mobile-readiness for the **iPet** single-product companion robot landing page.

Prior to this review, key SEO flaws were present:
1. **Invalid XML Sitemap Entries:** `sitemap.xml` contained URL fragment identifiers (`/#3d-showcase`, `/#configurator`, `/#specs`). W3C and search engine standards strictly prohibit URL fragment anchors in XML sitemaps as Google crawlers ignore client-side hashes.
2. **Domain Inconsistency:** References pointed to `https://ipet.vn/` while the live application operates under `https://ipet-landing-psi.vercel.app/`.
3. **Missing Category & Prototype Status in Schema.org:** Schema markup did not communicate that the product is in a PreOrder / Prototype phase.
4. **Console Warnings from Lucide:** Brand icons printed deprecation warnings, which could degrade page inspection scores.

---

## 2. Crawl & Indexing Configuration

### 2.1 Robots.txt (`/robots.txt` & `/public/robots.txt`)
```txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /api/admin
Disallow: /api/admin/
Disallow: /api/

Sitemap: https://ipet-landing-psi.vercel.app/sitemap.xml
```
- **Public access:** Root and static landing assets are fully allowed.
- **Security shielding:** Admin portal (`/admin`) and privileged REST endpoints (`/api/admin`, `/api/`) are explicitly disallowed to prevent search engine indexing of backend routes.
- **Sitemap discovery:** Explicit declaration of the canonical sitemap location.

### 2.2 XML Sitemap (`/sitemap.xml` & `/public/sitemap.xml`)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ipet-landing-psi.vercel.app/</loc>
    <lastmod>2026-10-16</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```
- **Validation:** 100% compliant with Sitemaps XML protocol 0.9.
- **Fragments Removed:** All `#...` anchor tags removed.
- **Last Modified:** Synchronized to current release date.

---

## 3. On-Page Metadata & Social Sharing

### 3.1 Primary Meta Tags
- **Title Tag:** `iPet — Robot AI Để Bàn Dáng Xe Đua | Biểu Cảm Sống Động` (55 characters, optimal length 50–60 characters).
- **Meta Description:** `iPet là robot thú cưng để bàn dáng xe thể thao tích hợp ESP32-S3, màn hình LCD màu thể hiện 7 bộ cảm xúc chân thực, cảm biến chạm điện dung, bánh xe Mecanum drift 360° và Edge AI offline bảo mật.` (194 characters, informative and keyword-rich).
- **Canonical URL:** `<link rel="canonical" href="https://ipet-landing-psi.vercel.app/">` — Prevents duplicate content issues across staging or Vercel preview URLs.
- **Viewport:** `width=device-width, initial-scale=1.0` with iOS safe-area support.

### 3.2 Open Graph (Facebook / Zalo / LinkedIn)
- `og:type`: `product`
- `og:url`: `https://ipet-landing-psi.vercel.app/`
- `og:title`: `iPet — Robot AI Để Bàn Dáng Xe Đua | Biểu Cảm Sống Động Thật`
- `og:description`: Accurate summary of the companion robot features.
- `og:image`: High-resolution 3D render (`ipet-3d-car-master.jpg`) with absolute HTTPS path.

### 3.3 Twitter Cards
- `twitter:card`: `summary_large_image`
- `twitter:title`: `iPet — Robot AI Để Bàn Dáng Xe Đua`
- `twitter:image`: Absolute HTTPS link to product render.

---

## 4. Structured Data (JSON-LD)

```json
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "iPet Desktop AI Robot Car",
  "image": "https://ipet-landing-psi.vercel.app/assets/images/ipet-3d-car-master.jpg",
  "description": "Robot thú cưng để bàn dáng xe thể thao tích hợp ESP32-S3, màn hình LCD màu thể hiện 7 bộ cảm xúc chân thực, bánh xe Mecanum 360°.",
  "brand": {
    "@type": "Brand",
    "name": "iPet Robotics"
  },
  "category": "Robotics / STEM Desktop Companions",
  "offers": {
    "@type": "Offer",
    "url": "https://ipet-landing-psi.vercel.app/#configurator",
    "priceCurrency": "VND",
    "price": "1490000",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/PreOrder",
    "itemCondition": "https://schema.org/NewCondition"
  }
}
```
- **Availability State:** Correctly set to `https://schema.org/PreOrder` reflecting product truth (development prototype).
- **Price Transparency:** Fixed server-authoritative baseline price in VND.

---

## 5. Semantic Architecture & Accessibility

1. **Heading Hierarchy:**
   - Single `<h1>` in Hero section.
   - Section headings structured with `<h2>` (`sec-title`) and supporting `<h3>` within cards/modules.
2. **Landmark Elements:**
   - `<header class="site-header" role="banner">`
   - `<main role="main">`
   - `<section class="..." id="...">` with descriptive IDs for internal navigation.
   - `<footer class="footer" role="contentinfo">`
3. **Image Alt Attributes:**
   - Every hardware asset, CAD drawing, and master render has descriptive, non-empty `alt` attributes in Vietnamese matching page language.
4. **Clean SVG Social Links:**
   - External links specify `target="_blank" rel="noopener noreferrer"`.
   - `aria-label` provided for screen readers on all icon-only links.

---

## 6. Verification Status

| SEO Audit Item | Status | Verified Method |
|---|---|---|
| Valid Sitemap XML | PASSED | Automated regex & XML parser test |
| Disallow Sensitive Endpoints in Robots.txt | PASSED | Verified against `/robots.txt` |
| Canonical Tag Points to Live Domain | PASSED | HTML inspection |
| Valid JSON-LD Product Schema | PASSED | Structured data validator test |
| No Broken Anchor Links in Head/Nav | PASSED | Tested navigation anchors |
| Clean Headings (Single H1) | PASSED | DOM structure audit |
