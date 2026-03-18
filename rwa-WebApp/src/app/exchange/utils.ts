import { TOKEN_ICONS } from './constants';

export const formatPrice = (value: string | number, decimals?: number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  
  const decimalPlaces = decimals ?? (num < 1 ? 4 : 2);
  
  return '$' + num.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
};

export const formatSupply = (value: number | string | bigint): string => {
  let num: number;
  if (typeof value === 'bigint') {
    num = Number(value) / 1e18;
  } else if (typeof value === 'string') {
    num = parseFloat(value);
  } else {
    num = value;
  }
  
  if (isNaN(num)) return '0';
  
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K';
  }
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export const formatAmount = (
  quantity: string | number | bigint, 
  price?: number
): { qty: string; usd: string } => {
  let num: number;
  
  if (typeof quantity === 'bigint') {
    num = Number(quantity) / 1e18;
  } else if (typeof quantity === 'string') {
    num = parseFloat(quantity);
  } else {
    num = quantity;
  }
  
  if (isNaN(num)) return { qty: '0', usd: '$0.00' };
  
  let qtyDecimals = 2;
  if (price !== undefined) {
    if (price >= 2000) {
      qtyDecimals = 6;
    } else if (price >= 500) {
      qtyDecimals = 4;
    } else {
      qtyDecimals = 2;
    }
  }
  
  const qtyFormatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: qtyDecimals,
  });
  
  const usdValue = price ? num * price : 0;
  const usdFormatted = '$' + usdValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return { qty: qtyFormatted, usd: usdFormatted };
};

export const formatTokenAmount = (value: bigint | string | number): string => {
  let num: number;
  if (typeof value === 'bigint') {
    num = Number(value) / 1e18;
  } else if (typeof value === 'string') {
    num = parseFloat(value);
  } else {
    num = value;
  }
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
};

export const getTokenIcon = (symbol: string): string => {
  return TOKEN_ICONS[symbol] || '🪙';
};

export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
};