# iPet Test Matrix & Quality Verification

| ID | Test Suite | Description | Baseline Status | Post-Fix Target | Verification Command |
|---|---|---|---|---|---|
| T01 | `tests/api.test.js` | GET /api/product structure & inventory | PASS | PASS | `node --test tests/api.test.js` |
| T02 | `tests/api.test.js` | POST /api/pricing/calculate pricing authority | PASS | PASS | `node --test tests/api.test.js` |
| T03 | `tests/api.test.js` | Order creation, lookup, admin transition | PASS | PASS (Updated for COD PENDING) | `node --test tests/api.test.js` |
| T04 | `tests/api.test.js` | GET /api/reviews approved reviews only | PASS | PASS | `node --test tests/api.test.js` |
| T05 | `tests/api.test.js` | POST /api/survey customer feedback | PASS | PASS | `node --test tests/api.test.js` |
| T06 | `tests/orderStateMachine.test.js` | Valid forward transitions | PASS | PASS | `node --test tests/orderStateMachine.test.js` |
| T07 | `tests/orderStateMachine.test.js` | Invalid illegal transitions | PASS | PASS | `node --test tests/orderStateMachine.test.js` |
| T08 | `tests/orderStateMachine.test.js` | transitionOrder helper execution | PASS | PASS | `node --test tests/orderStateMachine.test.js` |
| T09 | `tests/pricing.test.js` | Standard variant calculation | PASS | PASS | `node --test tests/pricing.test.js` |
| T10 | `tests/pricing.test.js` | Maker kit with addons & qty 2 | PASS | PASS | `node --test tests/pricing.test.js` |
| T11 | `tests/pricing.test.js` | Percentage coupon (10%) | PASS | PASS | `node --test tests/pricing.test.js` |
| T12 | `tests/pricing.test.js` | Fixed coupon (30,000₫) | PASS | PASS | `node --test tests/pricing.test.js` |
| T13 | `tests/pricing.test.js` | Invalid variant error handling | PASS | PASS | `node --test tests/pricing.test.js` |
| T14 | `tests/validation.test.js` | Vietnamese mobile phone validation | PASS | PASS | `node --test tests/validation.test.js` |
| T15 | `tests/validation.test.js` | Checkout form validation | PASS | PASS | `node --test tests/validation.test.js` |
| T16 | `tests/security.test.js` (NEW) | Static root file access blocking (`.sqlite`, `package.json`) | NOT IMPLEMENTED | PASS | `node --test tests/security.test.js` |
| T17 | `tests/security.test.js` (NEW) | Admin login rate limiting (429 on abuse) | NOT IMPLEMENTED | PASS | `node --test tests/security.test.js` |
| T18 | `tests/security.test.js` (NEW) | Admin token verification & expiration | NOT IMPLEMENTED | PASS | `node --test tests/security.test.js` |
| T19 | `tests/orderTransaction.test.js` (NEW) | Atomic order creation & inventory decrement | NOT IMPLEMENTED | PASS | `node --test tests/orderTransaction.test.js` |
| T20 | `tests/orderTransaction.test.js` (NEW) | COD initial status is PENDING (not PAID) | NOT IMPLEMENTED | PASS | `node --test tests/orderTransaction.test.js` |
| T21 | `tests/seo.test.js` (NEW) | Valid sitemap.xml (no anchor fragments) | NOT IMPLEMENTED | PASS | `node --test tests/seo.test.js` |
| T22 | `tests/seo.test.js` (NEW) | Structured data & Canonical match | NOT IMPLEMENTED | PASS | `node --test tests/seo.test.js` |
| T23 | Responsive Layout Audit | Header/Hero overlap check at 768px | DEFECT REPORTED | VERIFIED RESOLVED | Automated DOM/CSS offset audit |
| T24 | Responsive Layout Audit | Specs cards 2x2 symmetry | DEFECT REPORTED | VERIFIED RESOLVED | CSS inspection at 1200px |
| T25 | Browser Console Audit | Zero Lucide warnings (github, facebook, youtube) | WARNINGS PRESENT | ZERO WARNINGS | Console log audit |
