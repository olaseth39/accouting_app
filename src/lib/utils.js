//@ts-check

/**
 * Formats a number into a currency string (Naira).
 * @param {number} amount
 *  @returns {string} The formatted currency string (e.g., ₦5,500,000.05).
 */
export function formatToNairaCurrency(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
