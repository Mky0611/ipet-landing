const test = require('node:test');
const assert = require('node:assert');
const { isValidVietnamesePhone, validateCheckoutData } = require('../server/services/validation');

test('Validation: Vietnamese mobile phone numbers', () => {
  // Valid numbers
  assert.strictEqual(isValidVietnamesePhone('0912345678'), true);
  assert.strictEqual(isValidVietnamesePhone('+84912345678'), true);
  assert.strictEqual(isValidVietnamesePhone('0388889999'), true);
  assert.strictEqual(isValidVietnamesePhone('0771234567'), true);
  assert.strictEqual(isValidVietnamesePhone('0868123456'), true);
  assert.strictEqual(isValidVietnamesePhone('0912 345 678'), true);

  // Invalid numbers
  assert.strictEqual(isValidVietnamesePhone('123456'), false);
  assert.strictEqual(isValidVietnamesePhone('0123456789'), false); // 01x is obsolete 11-digit prefix
  assert.strictEqual(isValidVietnamesePhone('abcdefghij'), false);
  assert.strictEqual(isValidVietnamesePhone(''), false);
  assert.strictEqual(isValidVietnamesePhone(null), false);
});

test('Validation: Checkout form validation', () => {
  const validPayload = {
    fullName: 'Nguyễn Văn An',
    phone: '0987654321',
    email: 'an.nguyen@example.com',
    province: 'Thành phố Hồ Chí Minh',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    address: '123 Đường Lê Lợi',
    variant: 'standard',
    color: 'obsidian',
    quantity: 1,
    addons: ['dock'],
    paymentMethod: 'vietqr'
  };

  const checkValid = validateCheckoutData(validPayload);
  assert.strictEqual(checkValid.isValid, true);
  assert.strictEqual(Object.keys(checkValid.errors).length, 0);
  assert.strictEqual(checkValid.sanitizedData.fullName, 'Nguyễn Văn An');
  assert.strictEqual(checkValid.sanitizedData.quantity, 1);

  const invalidPayload = {
    fullName: 'A', // too short
    phone: '123',  // invalid phone
    province: '',  // missing
    district: '',
    ward: '',
    address: '',
    quantity: 0
  };

  const checkInvalid = validateCheckoutData(invalidPayload);
  assert.strictEqual(checkInvalid.isValid, false);
  assert.ok(checkInvalid.errors.fullName);
  assert.ok(checkInvalid.errors.phone);
  assert.ok(checkInvalid.errors.province);
  assert.ok(checkInvalid.errors.district);
  assert.ok(checkInvalid.errors.ward);
  assert.ok(checkInvalid.errors.address);
  assert.ok(checkInvalid.errors.quantity);
});
