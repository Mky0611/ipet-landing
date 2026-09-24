/**
 * iPet Order State Machine
 * Defines valid order states and enforces strict state transitions.
 */

const ORDER_STATES = {
  PENDING: 'PENDING',                     // Order created, waiting for customer action
  PAYMENT_PENDING: 'PAYMENT_PENDING',     // Customer selected VietQR, awaiting bank verification
  PAID: 'PAID',                           // Payment verified or COD confirmed
  PROCESSING: 'PROCESSING',               // Hardware being assembled/packaged
  SHIPPING: 'SHIPPING',                   // Handed over to shipping carrier
  DELIVERED: 'DELIVERED',                 // Received by customer
  CANCELLED: 'CANCELLED',                 // Order cancelled before shipping
  REFUNDED: 'REFUNDED',                   // Money refunded
  FAILED: 'FAILED'                        // Payment or fulfillment failed
};

const VALID_TRANSITIONS = {
  [ORDER_STATES.PENDING]: [
    ORDER_STATES.PAYMENT_PENDING,
    ORDER_STATES.PAID,
    ORDER_STATES.PROCESSING,
    ORDER_STATES.CANCELLED,
    ORDER_STATES.FAILED
  ],
  [ORDER_STATES.PAYMENT_PENDING]: [
    ORDER_STATES.PAID,
    ORDER_STATES.CANCELLED,
    ORDER_STATES.FAILED
  ],
  [ORDER_STATES.PAID]: [
    ORDER_STATES.PROCESSING,
    ORDER_STATES.REFUNDED,
    ORDER_STATES.CANCELLED
  ],
  [ORDER_STATES.PROCESSING]: [
    ORDER_STATES.SHIPPING,
    ORDER_STATES.CANCELLED,
    ORDER_STATES.REFUNDED
  ],
  [ORDER_STATES.SHIPPING]: [
    ORDER_STATES.DELIVERED,
    ORDER_STATES.REFUNDED
  ],
  [ORDER_STATES.DELIVERED]: [
    ORDER_STATES.REFUNDED
  ],
  [ORDER_STATES.CANCELLED]: [],
  [ORDER_STATES.REFUNDED]: [],
  [ORDER_STATES.FAILED]: []
};

/**
 * Validate if a state transition is permitted
 * @param {string} currentState
 * @param {string} nextState
 * @returns {boolean}
 */
function isValidTransition(currentState, nextState) {
  if (!ORDER_STATES[currentState] || !ORDER_STATES[nextState]) {
    return false;
  }
  const allowed = VALID_TRANSITIONS[currentState] || [];
  return allowed.includes(nextState);
}

/**
 * Transition order state with validation and audit note
 * @param {string} currentState
 * @param {string} nextState
 * @param {string} reason
 * @returns {{ success: boolean, state: string, error?: string }}
 */
function transitionOrder(currentState, nextState, reason = '') {
  if (!isValidTransition(currentState, nextState)) {
    return {
      success: false,
      state: currentState,
      error: `Không thể chuyển trạng thái từ '${currentState}' sang '${nextState}'.`
    };
  }
  return {
    success: true,
    state: nextState,
    reason
  };
}

module.exports = {
  ORDER_STATES,
  VALID_TRANSITIONS,
  isValidTransition,
  transitionOrder
};
