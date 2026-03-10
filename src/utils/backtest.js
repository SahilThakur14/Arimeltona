import { getSignal, atr, analysePosition } from './indicators.js';

const STARTING_CASH  = 10000;
const TAKE_PROFIT    = 0.08;   // match live system
const ATR_MULTIPLIER = 1.5;
const MIN_STOP       = 0.02;
const MAX_STOP       = 0.08;

/**
 * Walk-forward backtest — mirrors the live strategy exactly:
 *   - consecutive signal gate (tracks lastRawSignal per iteration)
 *   - ATR dynamic stop-loss
 *   - take-profit at +8%
 *   - trajectory exits (momentum reversal, profit fading, stagnation)
 *   - risk/reward filter baked into getSignal
 */
export function runBacktest(barsData, config = {}) {
  const { positionSizePct = 0.2, symbol = 'STOCK' } = config;

  if (!barsData || barsData.length < 55) {
    return { error: 'Need at least 55 bars for backtest', trades: [], equity: [] };
  }

  let cash          = STARTING_CASH;
  let position      = null;
  let lastRawSignal = null; // consecutive signal state — reset on each new scan
  const trades = [];
  const equity = [];

  for (let i = 50; i < barsData.length; i++) {
    const slice    = barsData.slice(0, i + 1);
    const closes   = slice.map(b => b.close);
    const volumes  = slice.map(b => b.volume);
    const price    = closes[closes.length - 1];
    const bar      = barsData[i];

    // ATR for dynamic stop
    const atrPct  = atr(slice, 14);
    const dynStop = atrPct
      ? Math.min(Math.max(atrPct * ATR_MULTIPLIER / 100, MIN_STOP), MAX_STOP)
      : 0.04;

    // ── Exit logic (mirrors live trajectory engine) ──────────────────
    if (position) {
      const pnlPct = (price - position.entryPrice) / position.entryPrice;

      // Take-profit
      if (pnlPct >= TAKE_PROFIT) {
        const pnl = (price - position.entryPrice) * position.shares;
        cash += position.shares * price;
        trades.push({ ...position, exitIndex: i, exitTime: bar.time, exitPrice: price, pnl, pnlPct: pnlPct * 100, exitReason: 'take-profit', holdBars: i - position.entryIndex });
        position = null; lastRawSignal = null;
        equity.push({ index: i, time: bar.time, value: cash }); continue;
      }

      // ATR stop
      if (pnlPct <= -dynStop) {
        const pnl = (price - position.entryPrice) * position.shares;
        cash += position.shares * price;
        trades.push({ ...position, exitIndex: i, exitTime: bar.time, exitPrice: price, pnl, pnlPct: pnlPct * 100, exitReason: 'atr-stop', holdBars: i - position.entryIndex });
        position = null; lastRawSignal = null;
        equity.push({ index: i, time: bar.time, value: cash }); continue;
      }

      // Trajectory: use post-entry bars
      const postEntry = slice.slice(position.entryIndex);
      const recentBars = postEntry.map(b => ({ close: b.close }));
      const traj = analysePosition({ entryPrice: position.entryPrice, recentBars, atrPct });
      if (traj.shouldExit) {
        const pnl = (price - position.entryPrice) * position.shares;
        cash += position.shares * price;
        trades.push({ ...position, exitIndex: i, exitTime: bar.time, exitPrice: price, pnl, pnlPct: pnlPct * 100, exitReason: traj.reason, holdBars: i - position.entryIndex });
        position = null; lastRawSignal = null;
        equity.push({ index: i, time: bar.time, value: cash + (position ? position.shares * price : 0) }); continue;
      }
    }

    // ── Entry logic ───────────────────────────────────────────────────
    const { signal, rawSignal } = getSignal(closes, volumes, lastRawSignal, 0, atrPct);
    lastRawSignal = rawSignal; // track for next bar's consecutive check

    if (signal === 'BUY' && !position) {
      const shares = Math.floor((cash * positionSizePct) / price);
      if (shares > 0 && cash >= shares * price) {
        cash -= shares * price;
        position = { shares, entryPrice: price, entryIndex: i, entryTime: bar.time, symbol };
      }
    }

    // Close at end of data
    if (i === barsData.length - 1 && position) {
      const pnlPct = (price - position.entryPrice) / position.entryPrice;
      const pnl    = (price - position.entryPrice) * position.shares;
      cash += position.shares * price;
      trades.push({ ...position, exitIndex: i, exitTime: bar.time, exitPrice: price, pnl, pnlPct: pnlPct * 100, exitReason: 'end-of-data', holdBars: i - position.entryIndex, open: true });
      position = null;
    }

    const posValue = position ? position.shares * price : 0;
    equity.push({ index: i, time: bar.time, value: cash + posValue });
  }

  const finalEquity    = equity[equity.length - 1]?.value ?? STARTING_CASH;
  const totalReturn    = finalEquity - STARTING_CASH;
  const totalReturnPct = (totalReturn / STARTING_CASH) * 100;

  const winning = trades.filter(t => t.pnl > 0);
  const losing  = trades.filter(t => t.pnl <= 0);
  const winRate = trades.length > 0 ? (winning.length / trades.length) * 100 : 0;
  const avgWin  = winning.length > 0 ? winning.reduce((s, t) => s + t.pnl, 0) / winning.length : 0;
  const avgLoss = losing.length  > 0 ? losing.reduce((s, t) => s + t.pnl, 0)  / losing.length  : 0;
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : null;

  let peak = STARTING_CASH, maxDrawdown = 0;
  for (const e of equity) {
    if (e.value > peak) peak = e.value;
    const dd = (peak - e.value) / peak * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const buyHoldStart  = barsData[50].close;
  const buyHoldEnd    = barsData[barsData.length - 1].close;
  const buyHoldReturn = ((buyHoldEnd - buyHoldStart) / buyHoldStart) * 100;

  // Exit reason breakdown
  const exitReasons = {};
  for (const t of trades) {
    exitReasons[t.exitReason] = (exitReasons[t.exitReason] ?? 0) + 1;
  }

  return {
    finalEquity, totalReturn, totalReturnPct, winRate,
    avgWin, avgLoss, profitFactor, maxDrawdown, buyHoldReturn,
    totalTrades: trades.length, winningTrades: winning.length,
    losingTrades: losing.length, trades, equity, exitReasons,
  };
}
