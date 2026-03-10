// ── useMarketData — REAL DATA ONLY ─────────────────────────────────────────
// No simulated ticks. Prices only come from Yahoo Finance.
// When market is closed or data unavailable, we show last known price as stale.
// Bot and trade execution are gated externally via getMarketStatus().

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchYahooHistory, fetchYahooQuotes } from '../services/marketData.js';
import { getMarketStatus } from '../utils/marketHours.js';

// ── We only track the hot stocks universe (populated by HotStocks service)
// plus a small core watchlist for the scanner context
export const CORE_SYMBOLS = ['SPY','QQQ','AAPL','MSFT','NVDA','TSLA','AMZN','META','GOOGL'];

const HISTORY_INTERVAL = '5m';
const HISTORY_RANGE    = '5d';
const QUOTE_INTERVAL_MS = 15000; // refresh quotes every 15s during market hours

export function useMarketData(activeSymbols = CORE_SYMBOLS) {
  const [bars,        setBars]        = useState({});
  const [quotes,      setQuotes]      = useState({}); // latest real quote per sym
  const [dataStatus,  setDataStatus]  = useState({}); // sym -> 'live'|'stale'|'unavailable'
  const [marketStatus,setMarketStatus]= useState(getMarketStatus());
  const [loading,     setLoading]     = useState(true);
  const symbolsRef = useRef(activeSymbols);
  symbolsRef.current = activeSymbols;

  // Market clock — update every minute
  useEffect(() => {
    const id = setInterval(() => setMarketStatus(getMarketStatus()), 60000);
    return () => clearInterval(id);
  }, []);

  // Load full bar history for a symbol
  const loadHistory = useCallback(async (sym) => {
    const data = await fetchYahooHistory(sym, HISTORY_INTERVAL, HISTORY_RANGE);
    if (data && data.length >= 20) {
      setBars(prev => ({ ...prev, [sym]: data }));
      setDataStatus(prev => ({ ...prev, [sym]: 'live' }));
      return true;
    }
    setDataStatus(prev => ({ ...prev, [sym]: 'unavailable' }));
    return false;
  }, []);

  // Initial load
  useEffect(() => {
    if (!activeSymbols.length) { setLoading(false); return; }
    setLoading(true);
    const uniq = [...new Set(activeSymbols)];
    // Batch 6 at a time to avoid rate limiting
    (async () => {
      const batches = [];
      for (let i = 0; i < uniq.length; i += 6) batches.push(uniq.slice(i, i + 6));
      for (const batch of batches) {
        await Promise.all(batch.map(loadHistory));
        await new Promise(r => setTimeout(r, 400)); // small gap between batches
      }
      setLoading(false);
    })();
  }, [activeSymbols.join(',')]);

  // Live quote refresh — only during market hours
  // Each tick either: opens a new 5-min bar OR updates the current bar's high/low/close
  useEffect(() => {
    const id = setInterval(async () => {
      const status = getMarketStatus();
      setMarketStatus(status);
      if (!status.isOpen) return;
      const syms = [...new Set(symbolsRef.current)];
      if (!syms.length) return;

      const batches = [];
      for (let i = 0; i < syms.length; i += 20) batches.push(syms.slice(i, i + 20));

      for (const batch of batches) {
        const fresh = await fetchYahooQuotes(batch);
        if (!fresh) continue;
        setQuotes(prev => ({ ...prev, ...fresh }));

        setBars(prev => {
          const next = { ...prev };
          const now  = Date.now();
          // Snap timestamp to the start of the current 5-minute window
          const fiveMin = 5 * 60 * 1000;
          const barTime = Math.floor(now / fiveMin) * fiveMin;

          for (const [sym, q] of Object.entries(fresh)) {
            if (!q.price) continue;
            const existing = prev[sym] ?? [];
            const lastBar  = existing[existing.length - 1];

            if (lastBar && lastBar.time === barTime) {
              // Same 5-min window — update high/low/close in place, accumulate volume
              const updated = {
                ...lastBar,
                high:   Math.max(lastBar.high, q.price),
                low:    Math.min(lastBar.low,  q.price),
                close:  q.price,
                volume: lastBar.volume + (q.volume ?? 0),
              };
              next[sym] = [...existing.slice(0, -1), updated];
            } else {
              // New 5-min window — open a fresh bar
              // Only create if price actually differs from last close (avoids duplicate stale ticks)
              if (lastBar && Math.abs(lastBar.close - q.price) < 0.001) continue;
              const newBar = {
                time:   barTime,
                open:   lastBar?.close ?? q.price,
                high:   q.price,
                low:    q.price,
                close:  q.price,
                volume: q.volume ?? 0,
              };
              next[sym] = [...existing.slice(-500), newBar];
            }
            setDataStatus(p => ({ ...p, [sym]: 'live' }));
          }
          return next;
        });
      }
    }, QUOTE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Derive prices — real prices only
  const prices = {};
  for (const sym of [...new Set(activeSymbols)]) {
    const q = quotes[sym];
    if (q?.price) { prices[sym] = q.price; continue; }
    const b = bars[sym];
    if (b?.length) prices[sym] = b[b.length - 1].close;
    // else undefined — caller must handle missing price
  }

  const isLive = marketStatus.isOpen && Object.values(dataStatus).some(s => s === 'live');

  return { bars, prices, quotes, loading, isLive, marketStatus, dataStatus, loadHistory };
}
