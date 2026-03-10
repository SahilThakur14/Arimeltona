import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY     = 'papertrade_v10';
const STARTING_CASH   = 10000;
export const TAKE_PROFIT_PCT  = 0.08;
export const PARTIAL_EXIT_PCT = 0.05;
export const POSITION_PCT     = 0.02;
export const DRAWDOWN_LIMIT   = 0.08;
export const SLIPPAGE_PCT     = 0.001; // 0.1% simulated spread per side

// Apply slippage: buys fill slightly higher, sells slightly lower
export const fillPrice = (price, side) =>
  side === 'buy' ? price * (1 + SLIPPAGE_PCT) : price * (1 - SLIPPAGE_PCT);

const DEFAULT = {
  cash: STARTING_CASH,
  positions: {},  // long positions: sym -> {shares, avgCost, entryPrice, entryTime, priceHistory, partialExitDone}
  shorts: {},     // short positions: sym -> {shares, entryPrice, entryTime, priceHistory, partialExitDone}
  trades: [],
  equityHistory: [{ value: STARTING_CASH, ts: Date.now() }],
  peakEquity: STARTING_CASH,
  circuitOpen: false,
};

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (p.cash !== undefined && p.positions && p.trades) {
          return {
            peakEquity: STARTING_CASH,
            circuitOpen: false,
            shorts: {},
            ...p,
          };
        }
      }
    } catch {}
    return { ...DEFAULT, shorts: {} };
  });

  const saveTimer = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio)); } catch {}
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [portfolio]);

  function resetPortfolio() {
    setPortfolio({ ...DEFAULT, shorts: {}, equityHistory: [{ value: STARTING_CASH, ts: Date.now() }] });
    localStorage.removeItem(STORAGE_KEY);
  }

  const sellingRef = useRef({});

  // ── LONG: Buy ─────────────────────────────────────────────────────────────
  function executeBuy(symbol, shares, price, auto = false) {
    setPortfolio(prev => {
      if (prev.circuitOpen && auto) return prev;
      const fill = fillPrice(price, 'buy');
      const cost = shares * fill;
      if (cost <= 0 || prev.cash < cost) return prev;
      const existing    = prev.positions[symbol];
      const totalShares = (existing?.shares ?? 0) + shares;
      const avgCost     = existing
        ? (existing.shares * existing.avgCost + cost) / totalShares
        : fill;
      return {
        ...prev,
        cash: prev.cash - cost,
        positions: {
          ...prev.positions,
          [symbol]: {
            shares: totalShares, avgCost,
            entryPrice: fill, entryTime: Date.now(),
            priceHistory: existing?.priceHistory ?? [],
            partialExitDone: existing?.partialExitDone ?? false,
            side: 'long',
          },
        },
        trades: [...prev.trades, {
          id: Date.now() + Math.random(),
          symbol, action: 'BUY', shares, price: fill,
          time: Date.now(), pnl: null, auto, side: 'long',
          slippage: (fill - price) * shares,
        }],
      };
    });
  }

  // ── LONG: Sell ────────────────────────────────────────────────────────────
  function executeSell(symbol, shares, price, auto = false, reason = '') {
    const now = Date.now();
    if (sellingRef.current['L_'+symbol] && now - sellingRef.current['L_'+symbol] < 5000) return;
    sellingRef.current['L_'+symbol] = now;
    setPortfolio(prev => {
      const pos = prev.positions[symbol];
      if (!pos || pos.shares < shares || shares <= 0) return prev;
      const fill      = fillPrice(price, 'sell');
      const pnl       = (fill - pos.avgCost) * shares;
      const newShares = pos.shares - shares;
      const newPos    = { ...prev.positions };
      if (newShares <= 0) delete newPos[symbol];
      else newPos[symbol] = { ...pos, shares: newShares };
      return {
        ...prev,
        cash: prev.cash + shares * fill,
        positions: newPos,
        trades: [...prev.trades, {
          id: Date.now() + Math.random(),
          symbol, action: 'SELL', shares, price: fill,
          time: Date.now(), pnl, auto, reason, side: 'long',
          slippage: (price - fill) * shares,
        }],
      };
    });
  }

  // ── SHORT: Open short position ────────────────────────────────────────────
  function executeShort(symbol, shares, price, auto = false) {
    setPortfolio(prev => {
      if (prev.circuitOpen && auto) return prev;
      // We receive the cash from "selling" borrowed shares
      const fill    = fillPrice(price, 'sell'); // short opens at slightly lower fill
      const margin  = shares * fill * 1.5;      // require 150% margin (conservative)
      if (margin > prev.cash) return prev;
      const existing    = prev.shorts[symbol];
      const totalShares = (existing?.shares ?? 0) + shares;
      const avgEntry    = existing
        ? (existing.shares * existing.entryPrice + shares * fill) / totalShares
        : fill;
      return {
        ...prev,
        // Reserve margin in cash (we don't receive cash from short in paper trading)
        cash: prev.cash - shares * fill * 0.5, // reserve 50% as margin
        shorts: {
          ...prev.shorts,
          [symbol]: {
            shares: totalShares, entryPrice: avgEntry,
            entryTime: Date.now(),
            priceHistory: existing?.priceHistory ?? [],
            partialExitDone: existing?.partialExitDone ?? false,
            side: 'short',
          },
        },
        trades: [...prev.trades, {
          id: Date.now() + Math.random(),
          symbol, action: 'SHORT', shares, price: fill,
          time: Date.now(), pnl: null, auto, side: 'short',
          slippage: (price - fill) * shares,
        }],
      };
    });
  }

  // ── SHORT: Cover (close short) ────────────────────────────────────────────
  function executeCover(symbol, shares, price, auto = false, reason = '') {
    const now = Date.now();
    if (sellingRef.current['S_'+symbol] && now - sellingRef.current['S_'+symbol] < 5000) return;
    sellingRef.current['S_'+symbol] = now;
    setPortfolio(prev => {
      const pos = prev.shorts[symbol];
      if (!pos || pos.shares < shares || shares <= 0) return prev;
      const fill      = fillPrice(price, 'buy'); // covering buys at slightly higher price
      const pnl       = (pos.entryPrice - fill) * shares; // profit when price falls
      const newShares = pos.shares - shares;
      const newSho    = { ...prev.shorts };
      if (newShares <= 0) delete newSho[symbol];
      else newSho[symbol] = { ...pos, shares: newShares };
      return {
        ...prev,
        // Return the reserved margin + profit/loss
        cash: prev.cash + shares * pos.entryPrice * 0.5 + pnl,
        shorts: newSho,
        trades: [...prev.trades, {
          id: Date.now() + Math.random(),
          symbol, action: 'COVER', shares, price: fill,
          time: Date.now(), pnl, auto, reason, side: 'short',
          slippage: (fill - price) * shares,
        }],
      };
    });
  }

  function markPartialExit(symbol, side = 'long') {
    setPortfolio(prev => {
      const bucket = side === 'short' ? 'shorts' : 'positions';
      const pos = prev[bucket][symbol];
      if (!pos) return prev;
      return { ...prev, [bucket]: { ...prev[bucket], [symbol]: { ...pos, partialExitDone: true } } };
    });
  }

  function tickPositions(currentPrices) {
    setPortfolio(prev => {
      if (!Object.keys(prev.positions).length && !Object.keys(prev.shorts || {}).length) return prev;
      let changed = false;
      const newPos = { ...prev.positions };
      const newSho = { ...(prev.shorts || {}) };
      for (const [sym, pos] of Object.entries(prev.positions)) {
        const p = currentPrices[sym];
        if (!p) continue;
        const last = pos.priceHistory?.slice(-1)[0]?.close;
        if (last && Math.abs(last - p) < 0.001) continue;
        newPos[sym] = { ...pos, priceHistory: [...(pos.priceHistory ?? []).slice(-200), { close: p, time: Date.now() }] };
        changed = true;
      }
      for (const [sym, pos] of Object.entries(prev.shorts || {})) {
        const p = currentPrices[sym];
        if (!p) continue;
        const last = pos.priceHistory?.slice(-1)[0]?.close;
        if (last && Math.abs(last - p) < 0.001) continue;
        newSho[sym] = { ...pos, priceHistory: [...(pos.priceHistory ?? []).slice(-200), { close: p, time: Date.now() }] };
        changed = true;
      }
      return changed ? { ...prev, positions: newPos, shorts: newSho } : prev;
    });
  }

  function recordEquity(currentPrices) {
    setPortfolio(prev => {
      const longVal  = Object.entries(prev.positions).reduce((s, [sym, pos]) => s + pos.shares * (currentPrices[sym] ?? pos.avgCost), 0);
      // Short P&L: (entryPrice - current) * shares, then add back the margin reserved
      const shortPnl = Object.entries(prev.shorts || {}).reduce((s, [sym, pos]) => {
        const cur = currentPrices[sym] ?? pos.entryPrice;
        return s + (pos.entryPrice - cur) * pos.shares;
      }, 0);
      const shortMargin = Object.values(prev.shorts || {}).reduce((s, pos) => s + pos.shares * pos.entryPrice * 0.5, 0);
      const total  = prev.cash + longVal + shortPnl + shortMargin;
      const last   = prev.equityHistory[prev.equityHistory.length - 1];
      if (last && Math.abs(last.value - total) < 0.01) return prev;
      const newPeak     = Math.max(prev.peakEquity ?? STARTING_CASH, total);
      const drawdownPct = (newPeak - total) / newPeak;
      const circuitOpen = drawdownPct >= DRAWDOWN_LIMIT;
      return {
        ...prev,
        peakEquity: newPeak, circuitOpen,
        equityHistory: [...prev.equityHistory.slice(-1000), { value: total, ts: Date.now() }],
      };
    });
  }

  function resetCircuit() {
    setPortfolio(prev => ({ ...prev, circuitOpen: false }));
  }

  return {
    portfolio, executeBuy, executeSell, executeShort, executeCover,
    markPartialExit, tickPositions, recordEquity, resetPortfolio, resetCircuit,
  };
}
