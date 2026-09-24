/**
 * iPet VietQR Generator Service
 * Generates standard dynamic banking QR code for Vietnamese Interbank transfer (NAPAS247).
 */

const VIETQR_CONFIG = {
  bankId: process.env.VIETQR_BANK_ID || 'MB',               // MBBank
  accountNo: process.env.VIETQR_ACCOUNT_NO || '0338888999', // Configurable Bank Account
  accountName: process.env.VIETQR_ACCOUNT_NAME || 'IPET VIETNAM',
  template: 'compact2' // QR template style
};

/**
 * Generate VietQR payment info
 * @param {Object} params
 * @param {string} params.orderCode
 * @param {number} params.amount
 * @param {string} [params.description]
 * @returns {Object} VietQR metadata & image URL
 */
function generateVietQR({ orderCode, amount, description }) {
  const cleanOrderCode = orderCode.replace(/[^A-Za-z0-9_-]/g, '');
  const transferContent = description || `IPET ${cleanOrderCode}`;
  const encodedContent = encodeURIComponent(transferContent);
  const encodedName = encodeURIComponent(VIETQR_CONFIG.accountName);

  // Standard VietQR QuickLink / Image URL
  const qrImageUrl = `https://api.vietqr.io/image/${VIETQR_CONFIG.bankId}-${VIETQR_CONFIG.accountNo}-${VIETQR_CONFIG.template}.jpg?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`;

  return {
    bankId: VIETQR_CONFIG.bankId,
    bankName: 'Ngân Hàng TMCP Quân Đội (MBBank)',
    accountNo: VIETQR_CONFIG.accountNo,
    accountName: VIETQR_CONFIG.accountName,
    amount,
    transferContent,
    qrImageUrl
  };
}

module.exports = {
  VIETQR_CONFIG,
  generateVietQR
};
