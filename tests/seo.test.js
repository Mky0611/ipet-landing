const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

test('SEO & Meta: sitemap.xml is valid, uses canonical domain, and has NO fragment anchors', () => {
  const sitemapFiles = ['sitemap.xml', 'public/sitemap.xml'];

  for (const file of sitemapFiles) {
    const filePath = path.join(rootDir, file);
    assert.ok(fs.existsSync(filePath), `Sitemap file ${file} must exist`);
    const content = fs.readFileSync(filePath, 'utf8');

    // Valid XML declaration
    assert.ok(content.startsWith('<?xml'), `${file} must start with <?xml`);
    assert.ok(content.includes('<urlset'), `${file} must contain <urlset`);
    assert.ok(content.includes('</urlset>'), `${file} must close </urlset>`);

    // Strict search engine requirement: NO hash fragments (#)
    assert.strictEqual(
      content.includes('#'),
      false,
      `${file} must not contain fragment hashes (#), as search engines reject them`
    );

    // Canonical domain check
    assert.ok(
      content.includes('https://ipet-landing-psi.vercel.app/'),
      `${file} must contain canonical deployment URL`
    );
  }
});

test('SEO & Meta: robots.txt protects private endpoints and specifies canonical sitemap', () => {
  const robotsFiles = ['robots.txt', 'public/robots.txt'];

  for (const file of robotsFiles) {
    const filePath = path.join(rootDir, file);
    assert.ok(fs.existsSync(filePath), `Robots file ${file} must exist`);
    const content = fs.readFileSync(filePath, 'utf8');

    assert.ok(content.includes('Disallow: /admin'), `${file} must disallow /admin`);
    assert.ok(content.includes('Disallow: /api/'), `${file} must disallow /api/`);
    assert.ok(
      content.includes('Sitemap: https://ipet-landing-psi.vercel.app/sitemap.xml'),
      `${file} must point to canonical sitemap`
    );
  }
});

test('SEO & Meta: index.html meets technical SEO & Schema.org requirements', () => {
  const htmlFiles = ['index.html', 'public/index.html'];

  for (const file of htmlFiles) {
    const filePath = path.join(rootDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Single H1 heading
    const h1Matches = content.match(/<h1[^>]*>/gi);
    assert.ok(h1Matches, `${file} must contain an <h1>`);
    assert.strictEqual(h1Matches.length, 1, `${file} must have exactly one <h1> heading`);

    // 2. Canonical URL link
    assert.ok(
      content.includes('<link rel="canonical" href="https://ipet-landing-psi.vercel.app/">'),
      `${file} must contain canonical link tag`
    );

    // 3. Meta description
    assert.ok(
      content.includes('<meta name="description"'),
      `${file} must contain a meta description`
    );

    // 4. JSON-LD Structured Data
    const jsonLdMatch = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    assert.ok(jsonLdMatch, `${file} must contain a JSON-LD script block`);
    const schema = JSON.parse(jsonLdMatch[1]);
    assert.strictEqual(schema['@type'], 'Product');
    assert.strictEqual(schema.offers.availability, 'https://schema.org/PreOrder');
    assert.ok(schema.offers.price);

    // 5. Zero deprecated brand Lucide icon attributes
    assert.strictEqual(
      /data-lucide="(github|facebook|youtube)"/i.test(content),
      false,
      `${file} must not use deprecated Lucide brand icons (should use inline SVGs)`
    );

    // 6. Prototype banner present
    assert.ok(
      content.includes('prototype-banner'),
      `${file} must display transparent prototype status banner`
    );

    // 7. Facebook link configured to official page
    assert.ok(
      content.includes('https://www.facebook.com/profile.php?id=61594612043611'),
      `${file} must link to official Facebook profile`
    );
  }
});
