const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  return inrFormatter.format(Math.round(amount));
}

export function formatIndianNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return numberFormatter.format(Math.round(value));
}

export function formatCompactINR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2).replace(/\.00$/, '')}L`;
  }
  if (abs >= 1000) {
    return `${sign}₹${(abs / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return `${sign}₹${Math.round(abs)}`;
}

export function formatPercent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}
