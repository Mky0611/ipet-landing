const test = require('node:test');
const assert = require('node:assert');
const { calculateOrderPricing, PRODUCT_DATA } = require('../server/services/pricing');

test('Pricing Service: Calculate standard variant without addons', () => {
  const result = calculateOrderPricing({
    variant: 'standard',
    color: 'obsidian',
    quantity: 1,
    addons: []
  });

  assert.strictEqual(result.variant.id, 'standard');
  assert.strictEqual(result.variant.unitPrice, 1490000);
  assert.strictEqual(result.quantity, 1);
  assert.strictEqual(result.variantSubtotal, 1490000);
  assert.strictEqual(result.addonsSubtotal, 0);
  assert.strictEqual(result.subtotal, 1490000);
  assert.strictEqual(result.shippingFee, 0, 'Subtotal >= 1,000,000 should get free shipping');
  assert.strictEqual(result.total, 1490000);
});

test('Pricing Service: Calculate maker_kit with multiple addons and quantity 2', () => {
  const result = calculateOrderPricing({
    variant: 'maker_kit',
    color: 'silver',
    quantity: 2,
    addons: ['dock', 'shell_pack']
  });

  // maker_kit = 1,290,000 * 2 = 2,580,000
  // dock = 250,000 * 2 = 500,000
  // shell_pack = 99,000 * 2 = 198,000
  // addonsSubtotal = 698,000
  // subtotal = 3,278,000
  assert.strictEqual(result.variantSubtotal, 2580000);
  assert.strictEqual(result.addonsSubtotal, 698000);
  assert.strictEqual(result.subtotal, 3278000);
  assert.strictEqual(result.shippingFee, 0);
  assert.strictEqual(result.total, 3278000);
});

test('Pricing Service: Percentage coupon calculation (10%)', () => {
  const result = calculateOrderPricing({
    variant: 'standard',
    quantity: 1,
    addons: [],
    coupon: {
      code: 'IPET2026',
      type: 'percent',
      value: 10,
      minOrder: 1000000
    }
  });

  // 10% of 1,490,000 = 149,000
  assert.strictEqual(result.discountAmount, 149000);
  assert.strictEqual(result.total, 1490000 - 149000);
  assert.strictEqual(result.appliedCoupon.code, 'IPET2026');
});

test('Pricing Service: Fixed coupon calculation', () => {
  const result = calculateOrderPricing({
    variant: 'standard',
    quantity: 1,
    addons: [],
    coupon: {
      code: 'DISCOUNT50K',
      type: 'fixed',
      value: 50000,
      minOrder: 500000
    }
  });

  assert.strictEqual(result.discountAmount, 50000);
  assert.strictEqual(result.total, 1490000 - 50000);
});

test('Pricing Service: Throws on invalid variant', () => {
  assert.throws(() => {
    calculateOrderPricing({ variant: 'non_existent_variant' });
  }, /Phiên bản sản phẩm không hợp lệ/);
});
