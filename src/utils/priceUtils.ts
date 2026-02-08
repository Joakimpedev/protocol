/**
 * Price formatting for paywalls.
 * Use device locale (undefined) so symbols and decimals match the user's region.
 * Currency always comes from RevenueCat's product.currencyCode.
 */

/**
 * Format a calculated amount (e.g. yearly/12 for "per month") in the given currency.
 * Uses device locale for number format; currency from RevenueCat.
 */
export function formatPrice(
  amount: number,
  currencyCode: string,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const { minimumFractionDigits = 2, maximumFractionDigits = 2 } = options ?? {};
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}
