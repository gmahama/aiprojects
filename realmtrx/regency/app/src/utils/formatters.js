export function formatNumber(n) {
  if (n == null) return '—';
  return n.toLocaleString('en-US');
}

export function formatSF(n) {
  if (n == null) return '—';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toLocaleString('en-US');
}

export function formatCurrency(n) {
  if (n == null) return '—';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toLocaleString('en-US');
}

export function formatPct(n) {
  if (n == null) return '—';
  return n.toFixed(1) + '%';
}
