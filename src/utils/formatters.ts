export function formatCurrencyCLP(value?: number | null): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '-';

  // Detect if has fractional part
  const hasFraction = Math.abs(value - Math.trunc(value)) > 0;
  const minimumFractionDigits = hasFraction ? 2 : 0;
  const formatter = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits,
    maximumFractionDigits: 2,
  });

  // Intl for CLP in many browsers formats as "$1.000" and uses "." as thousands separator and "," for decimals in es-CL
  // Ensure the currency symbol is the CLP peso sign
  return formatter.format(Number(value));
}
