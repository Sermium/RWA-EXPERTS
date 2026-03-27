// src/app/api/exchange/mexc/prices/route.ts
// This is for CRYPTO (standard tokens) - fetches from MEXC
import { NextResponse } from 'next/server';

const SUPPORTED_PAIRS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'AVAXUSDT', 'ARBUSDT', 'OPUSDT', 'POLUSDT'];

const TOKEN_ICONS: Record<string, string> = {
  BTC: '/chains/bitcoin.svg',
  ETH: '/chains/ethereum.svg',
  BNB: '/chains/bnb.svg',
  AVAX: '/chains/avalanche.svg',
  ARB: '/chains/arbitrum.svg',
  OP: '/chains/optimism.svg',
  POL: '/chains/polygon.svg',
};

export async function GET() {
  try {
    const pairs = await Promise.all(
      SUPPORTED_PAIRS.map(async (symbol) => {
        try {
          const res = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`, {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 5 }
          });
          
          if (!res.ok) {
            console.error(`MEXC API error for ${symbol}: ${res.status}`);
            return null;
          }
          
          const data = await res.json();
          const baseAsset = symbol.replace('USDT', '');
          
          return {
            symbol,
            baseAsset,
            quoteAsset: 'USDT',
            price: parseFloat(data.lastPrice).toFixed(2),
            change24h: parseFloat(data.priceChangePercent).toFixed(2),
            high24h: parseFloat(data.highPrice).toFixed(2),
            low24h: parseFloat(data.lowPrice).toFixed(2),
            volume24h: parseFloat(data.volume).toFixed(2),
            quoteVolume24h: parseFloat(data.quoteVolume).toFixed(2),
            icon: TOKEN_ICONS[baseAsset] || null,
          };
        } catch (err) {
          console.error(`Failed to fetch ${symbol}:`, err);
          return null;
        }
      })
    );

    const validPairs = pairs.filter((p) => p !== null);

    return NextResponse.json({ 
      pairs: validPairs,
      timestamp: Date.now()
    });

  } catch (err) {
    console.error('MEXC prices error:', err);
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 });
  }
}
