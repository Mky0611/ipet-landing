const test = require('node:test');
const assert = require('node:assert');
const { ORDER_STATES, isValidTransition, transitionOrder } = require('../server/services/orderStateMachine');

test('Order State Machine: Valid standard forward transitions', () => {
  // PENDING -> PAYMENT_PENDING
  assert.strictEqual(isValidTransition(ORDER_STATES.PENDING, ORDER_STATES.PAYMENT_PENDING), true);

  // PAYMENT_PENDING -> PAID
  assert.strictEqual(isValidTransition(ORDER_STATES.PAYMENT_PENDING, ORDER_STATES.PAID), true);

  // PAID -> PROCESSING
  assert.strictEqual(isValidTransition(ORDER_STATES.PAID, ORDER_STATES.PROCESSING), true);

  // PROCESSING -> SHIPPING
  assert.strictEqual(isValidTransition(ORDER_STATES.PROCESSING, ORDER_STATES.SHIPPING), true);

  // SHIPPING -> DELIVERED
  assert.strictEqual(isValidTransition(ORDER_STATES.SHIPPING, ORDER_STATES.DELIVERED), true);
});

test('Order State Machine: Invalid illegal transitions', () => {
  // DELIVERED -> PENDING is illegal
  assert.strictEqual(isValidTransition(ORDER_STATES.DELIVERED, ORDER_STATES.PENDING), false);

  // CANCELLED -> PAID is illegal
  assert.strictEqual(isValidTransition(ORDER_STATES.CANCELLED, ORDER_STATES.PAID), false);

  // SHIPPING -> PENDING is illegal
  assert.strictEqual(isValidTransition(ORDER_STATES.SHIPPING, ORDER_STATES.PENDING), false);

  // FAILED -> DELIVERED is illegal
  assert.strictEqual(isValidTransition(ORDER_STATES.FAILED, ORDER_STATES.DELIVERED), false);
});

test('Order State Machine: transitionOrder helper execution', () => {
  const resultValid = transitionOrder(ORDER_STATES.PENDING, ORDER_STATES.PAYMENT_PENDING, 'Khách hàng chọn VietQR');
  assert.strictEqual(resultValid.success, true);
  assert.strictEqual(resultValid.state, ORDER_STATES.PAYMENT_PENDING);

  const resultInvalid = transitionOrder(ORDER_STATES.CANCELLED, ORDER_STATES.SHIPPING);
  assert.strictEqual(resultInvalid.success, false);
  assert.strictEqual(resultInvalid.state, ORDER_STATES.CANCELLED);
  assert.match(resultInvalid.error, /Không thể chuyển trạng thái/);
});
