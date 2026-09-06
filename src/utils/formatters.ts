export function formatCurrency(value: number, minDecimals: number = 2, maxDecimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '$0.00';
  
  if (Math.abs(value) < 0.00001 && value !== 0) {
    return '$' + value.toFixed(8);
  }
  
  if (Math.abs(value) < 0.01 && value !== 0) {
    return '$' + value.toFixed(6);
  }

  if (Math.abs(value) < 1 && value !== 0) {
    return '$' + value.toFixed(4);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function formatEurCurrency(value: number, minDecimals: number = 2, maxDecimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0,00 €';

  if (Math.abs(value) < 0.00001 && value !== 0) {
    return value.toFixed(8).replace('.', ',') + ' €';
  }

  if (Math.abs(value) < 0.01 && value !== 0) {
    return value.toFixed(6).replace('.', ',') + ' €';
  }

  if (Math.abs(value) < 1 && value !== 0) {
    return value.toFixed(4).replace('.', ',') + ' €';
  }

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  if (!value || isNaN(value)) return '$0';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatPercentage(value: number | undefined | null, includeSign: boolean = true): string {
  if (value === undefined || value === null || isNaN(value)) return '0.00%';
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCryptoAmount(value: number): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  if (value >= 10000) return formatNumber(value, 2);
  if (value >= 1) return formatNumber(value, 4);
  return formatNumber(value, 6);
}

export function formatDate(timestamp: number | string): string {
  if (!timestamp) return '';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
