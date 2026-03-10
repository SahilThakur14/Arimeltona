// ── useWatchlist — persisted custom symbol watchlist ──────────────────────
import { useState, useEffect } from 'react';

const KEY = 'papertrade_watchlist_v1';
const DEFAULT_WATCHLIST = ['AAPL','MSFT','NVDA','TSLA','SPY'];

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {}
    return [...DEFAULT_WATCHLIST];
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(watchlist)); } catch {}
  }, [watchlist]);

  function addSymbol(sym) {
    const clean = sym.toUpperCase().trim().replace(/[^A-Z.]/g, '');
    if (!clean || clean.length > 6) return false;
    if (watchlist.includes(clean)) return false;
    setWatchlist(prev => [...prev, clean]);
    return true;
  }

  function removeSymbol(sym) {
    setWatchlist(prev => prev.filter(s => s !== sym));
  }

  function moveSymbol(sym, dir) {
    setWatchlist(prev => {
      const idx = prev.indexOf(sym);
      if (idx === -1) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  function resetWatchlist() {
    setWatchlist([...DEFAULT_WATCHLIST]);
  }

  return { watchlist, addSymbol, removeSymbol, moveSymbol, resetWatchlist };
}
