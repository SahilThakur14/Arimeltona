// ── SMA ───────────────────────────────────────────────────────────────────
export function sma(prices, period) {
  if (prices.length < period) return [];
  const result = [];
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}
export function smaLast(prices, period) {
  if (prices.length < period) return null;
  return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// ── EMA ───────────────────────────────────────────────────────────────────
export function ema(prices, period) {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  const result = [prices.slice(0, period).reduce((a, b) => a + b, 0) / period];
  for (let i = period; i < prices.length; i++)
    result.push(prices[i] * k + result[result.length - 1] * (1 - k));
  return result;
}
export function emaLast(prices, period) {
  const arr = ema(prices, period);
  return arr.length ? arr[arr.length - 1] : null;
}

// ── RSI ───────────────────────────────────────────────────────────────────
export function rsiSeries(prices, period = 14) {
  if (prices.length < period + 1) return [];
  const result = [];
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let ag = gains / period, al = losses / period;
  const calc = (g, l) => l === 0 ? 100 : 100 - 100 / (1 + g / l);
  result.push(calc(ag, al));
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
    result.push(calc(ag, al));
  }
  return result;
}
export function rsiLast(prices, period = 14) {
  const s = rsiSeries(prices, period);
  return s.length ? s[s.length - 1] : null;
}

// ── MACD ──────────────────────────────────────────────────────────────────
export function macd(prices, fast = 12, slow = 26, signal = 9) {
  const ef = ema(prices, fast), es = ema(prices, slow);
  const offset = slow - fast;
  const macdLine   = es.map((v, i) => ef[i + offset] - v);
  const signalLine = ema(macdLine, signal);
  const sigOffset  = macdLine.length - signalLine.length;
  const histogram  = signalLine.map((v, i) => macdLine[i + sigOffset] - v);
  return { macdLine, signalLine, histogram };
}
export function macdLast(prices) {
  const { macdLine, signalLine, histogram } = macd(prices);
  return {
    macd:      macdLine[macdLine.length - 1]       ?? null,
    signal:    signalLine[signalLine.length - 1]   ?? null,
    histogram: histogram[histogram.length - 1]     ?? null,
  };
}

// ── Bollinger Bands ───────────────────────────────────────────────────────
// Full series version used by Chart.jsx
export function bollingerBands(prices, period = 20, sd = 2) {
  if (prices.length < period) return { upper: [], middle: [], lower: [] };
  const middle = [], upper = [], lower = [];
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean  = slice.reduce((a, b) => a + b, 0) / period;
    const std   = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    middle.push(mean);
    upper.push(mean + sd * std);
    lower.push(mean - sd * std);
  }
  return { upper, middle, lower };
}

export function bollingerLast(prices, period = 20, sd = 2) {
  if (prices.length < period) return { upper: null, middle: null, lower: null };
  const slice = prices.slice(-period);
  const mean  = slice.reduce((a, b) => a + b, 0) / period;
  const std   = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
  return { upper: mean + sd * std, middle: mean, lower: mean - sd * std };
}

// ── ATR — as % of price (volatility measure) ──────────────────────────────
export function atr(bars, period = 14) {
  if (!bars || bars.length < period + 1) return null;
  const trs = [];
  for (let i = 1; i < bars.length; i++) {
    const h = bars[i].high  ?? bars[i].close;
    const l = bars[i].low   ?? bars[i].close;
    const p = bars[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - p), Math.abs(l - p)));
  }
  const avgTR = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  const price = bars[bars.length - 1].close;
  return price > 0 ? (avgTR / price) * 100 : null;
}

// ── Linear regression slope over last N bars (% per bar) ─────────────────
// Uses FULL available history for the regression model,
// then measures slope of the most recent `window` bars
export function regressionSlope(prices, window = 20) {
  if (prices.length < window) return null;
  const slice = prices.slice(-window);
  const n     = slice.length;
  const xMean = (n - 1) / 2;
  const yMean = slice.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (slice[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den !== 0 ? num / den : 0;
  return (slope / slice[slice.length - 1]) * 100; // normalised as % per bar
}

// ── R² (goodness of fit) — how "clean" is the trend? ─────────────────────
export function rSquared(prices, window = 20) {
  if (prices.length < window) return null;
  const slice = prices.slice(-window);
  const n     = slice.length;
  const yMean = slice.reduce((a, b) => a + b, 0) / n;
  const xMean = (n - 1) / 2;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) num += (i - xMean) * (slice[i] - yMean);
  let denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    denX += (i - xMean) ** 2;
    denY += (slice[i] - yMean) ** 2;
  }
  if (denX === 0 || denY === 0) return 0;
  const r = num / Math.sqrt(denX * denY);
  return r * r; // R² between 0 and 1
}

// ── Momentum ──────────────────────────────────────────────────────────────
export function momentum(prices, period = 10) {
  if (prices.length < period + 1) return null;
  const prev = prices[prices.length - 1 - period];
  const curr = prices[prices.length - 1];
  return ((curr - prev) / prev) * 100;
}

// ── Volume spike ratio ────────────────────────────────────────────────────
export function volumeSpike(volumes, period = 20) {
  if (!volumes || volumes.length < period + 1) return null;
  const avg = volumes.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period;
  return avg > 0 ? volumes[volumes.length - 1] / avg : null;
}

// ── Volume profile — accumulation vs distribution ────────────────────────
// Returns 1 (accumulation: price up on high vol), -1 (distribution: price up on low vol), 0 (neutral)
// Uses the last N bars comparing price direction and volume vs average
export function volumeProfile(prices, volumes, period = 10) {
  if (!prices || !volumes || prices.length < period + 1 || volumes.length < period + 1) return 0;
  const pSlice = prices.slice(-period);
  const vSlice = volumes.slice(-period);
  const vAvg   = vSlice.reduce((a, b) => a + b, 0) / period;
  let score = 0;
  for (let i = 1; i < pSlice.length; i++) {
    const priceUp  = pSlice[i] > pSlice[i - 1];
    const highVol  = vSlice[i] > vAvg;
    if (priceUp  && highVol)  score++;  // price up on high volume = accumulation
    if (priceUp  && !highVol) score--;  // price up on low volume = distribution (weak move)
    if (!priceUp && highVol)  score--;  // price down on high volume = selling pressure
    if (!priceUp && !highVol) score++;  // price down on low volume = minor profit-taking
  }
  // Normalize to -1..1
  const max = period - 1;
  return max > 0 ? score / max : 0;
}

// ── Gap detection — is today's price gapped significantly from yesterday? ─
// Returns {gapUp, gapDown, gapPct} vs prev session close
export function detectGap(bars) {
  if (!bars || bars.length < 10) return { gapUp: false, gapDown: false, gapPct: 0 };
  // Find the last bar that was from a different day than the most recent bar
  const latest    = bars[bars.length - 1];
  const latestDay = new Date(latest.time).toDateString();
  let prevClose   = null;
  for (let i = bars.length - 2; i >= 0; i--) {
    if (new Date(bars[i].time).toDateString() !== latestDay) {
      prevClose = bars[i].close;
      break;
    }
  }
  if (!prevClose) return { gapUp: false, gapDown: false, gapPct: 0 };
  const gapPct = (latest.open - prevClose) / prevClose * 100;
  return {
    gapUp:   gapPct >  3,   // opened 3%+ above yesterday's close
    gapDown: gapPct < -3,   // opened 3%+ below yesterday's close
    gapPct,
  };
}

// ── Sector momentum — uses REAL bar history, not ticks ───────────────────
// Returns avg 20-bar regression slope for each sector
export function sectorMomentum(symbolGroups, barsMap) {
  const scores = {};
  for (const [sector, symbols] of Object.entries(symbolGroups)) {
    const slopes = symbols
      .map(sym => {
        const b = barsMap[sym];
        if (!b || b.length < 25) return null;
        return regressionSlope(b.map(x => x.close), 20);
      })
      .filter(s => s !== null);
    scores[sector] = slopes.length > 0
      ? slopes.reduce((a, b) => a + b, 0) / slopes.length
      : 0;
  }
  return scores;
}

// ── Position trajectory — uses post-entry bar history only ───────────────
export const STAGNATION_BAND_PCT = 0.005; // ±0.5%

export function analysePosition({ entryPrice, recentBars, atrPct }) {
  if (!recentBars || recentBars.length < 5) return { shouldExit: false };
  const prices  = recentBars.map(b => b.close);
  const current = prices[prices.length - 1];
  const pnlPct  = (current - entryPrice) / entryPrice;

  // Use a window scaled to volatility — more bars for volatile stocks
  const window   = atrPct ? Math.max(8, Math.min(20, Math.round(1 / atrPct * 10))) : 12;
  const slope    = regressionSlope(prices, Math.min(window, prices.length));
  const r2       = rSquared(prices, Math.min(window, prices.length));
  const trendQuality = r2 ?? 0; // 0–1, higher = cleaner trend

  // 1. Momentum reversal: slope clearly negative AND trend is clean (not noise)
  if (slope !== null && slope < -0.06 && trendQuality > 0.5) {
    return { shouldExit: true, reason: 'momentum-reversal', urgency: 'immediate' };
  }

  // 2. Profit fading: was up, slope now negative with moderate confidence
  if (pnlPct > 0.005 && slope !== null && slope < -0.03 && trendQuality > 0.35) {
    return { shouldExit: true, reason: 'profit-fading', urgency: 'fast' };
  }

  // 3. Stagnation: all recent bars within ±0.5% of entry AND slope near zero
  if (Math.abs(pnlPct) < STAGNATION_BAND_PCT && prices.length >= 10) {
    const allFlat = prices.slice(-8).every(p =>
      Math.abs((p - entryPrice) / entryPrice) < STAGNATION_BAND_PCT
    );
    // Only exit stagnation if trend quality is low (genuinely going nowhere)
    if (allFlat && trendQuality < 0.2) {
      return { shouldExit: true, reason: 'stagnation', urgency: 'normal' };
    }
  }

  return { shouldExit: false };
}

// ── Main signal — v3 with all fixes ──────────────────────────────────────
// lastRawSignal: previous raw signal for consecutive check (pass 'BUY'/'SELL'/null)
// sectorScore: float from sectorMomentum()
// ATRpct: for risk/reward check
export function getSignal(prices, volumes = null, lastRawSignal = null, sectorScore = 0, atrPct = null) {
  if (prices.length < 50) return { signal: 'HOLD', rawSignal: 'HOLD', reason: 'Need 50+ bars', confidence: 0, bullScore: 0, bearScore: 0 };

  const price   = prices[prices.length - 1];
  const sma10   = smaLast(prices, 10);
  const sma20   = smaLast(prices, 20);
  const sma50   = smaLast(prices, 50);
  const rsi     = rsiLast(prices, 14);
  const { macd: macdVal, signal: macdSig, histogram: macdHist } = macdLast(prices);
  const bb      = bollingerLast(prices, 20);
  const mom10   = momentum(prices, 10);
  const mom5    = momentum(prices, 5);
  // Use 20-bar window for slope — ties to actual 5-min bar history, not 1.5s ticks
  const slope20 = regressionSlope(prices, 20);
  const slope8  = regressionSlope(prices, 8);
  const r2      = rSquared(prices, 20);
  const vSpike  = volumeSpike(volumes, 20);
  const trendClean = (r2 ?? 0) > 0.5; // R² > 0.5 = reliable trend

  let bullScore = 0, bearScore = 0;
  const reasons = [];

  // ── 1. Trend filter (primary gate) — +3 pts ──────────────────────────
  if (sma10 && sma20 && sma50) {
    if (price > sma20 && sma10 > sma20 && sma20 > sma50) {
      bullScore += 3; reasons.push('Aligned uptrend');
    } else if (price < sma20 && sma10 < sma20 && sma20 < sma50) {
      bearScore += 3; reasons.push('Aligned downtrend');
    } else if (sma10 > sma20) bullScore += 1;
    else if (sma10 < sma20) bearScore += 1;
  }

  // ── 2. Regression slope 20-bar (from real bar history) — +2 pts ──────
  if (slope20 !== null && trendClean) {
    if (slope20 > 0.05)       { bullScore += 2; reasons.push('Regression rising (R²=' + (r2 * 100).toFixed(0) + '%)'); }
    else if (slope20 > 0.02)  { bullScore += 1; }
    else if (slope20 < -0.05) { bearScore += 2; reasons.push('Regression falling'); }
    else if (slope20 < -0.02) { bearScore += 1; }
  }

  // ── 3. Short-term momentum — +2 pts ──────────────────────────────────
  if (mom5 !== null && mom10 !== null) {
    if (mom5 > 0.3 && mom10 > 0)        { bullScore += 2; reasons.push('Momentum up'); }
    else if (mom10 > 0)                  { bullScore += 1; }
    else if (mom5 < -0.3 && mom10 < 0)  { bearScore += 2; reasons.push('Momentum down'); }
    else if (mom10 < 0)                  { bearScore += 1; }
  }

  // ── 4. RSI — full range scoring (fixes narrow 40–55 band) ─────────────
  // Score across the full spectrum, not just a narrow zone
  if (rsi !== null) {
    if (rsi < 30)                    { bullScore += 2; reasons.push('RSI oversold (' + rsi.toFixed(0) + ')'); }
    else if (rsi >= 30 && rsi < 50)  { bullScore += 1; }    // building momentum
    else if (rsi >= 50 && rsi < 60)  { bullScore += 2; reasons.push('RSI momentum zone (' + rsi.toFixed(0) + ')'); } // sweet spot for momentum entries
    else if (rsi >= 60 && rsi < 70)  { bearScore += 1; }    // getting stretched
    else if (rsi >= 70)              { bearScore += 2; reasons.push('RSI overbought (' + rsi.toFixed(0) + ')'); }
  }

  // ── 5. MACD — +2 pts ─────────────────────────────────────────────────
  if (macdVal !== null && macdSig !== null) {
    if      (macdVal > macdSig && macdHist > 0 && macdVal > 0)  { bullScore += 2; reasons.push('MACD bullish'); }
    else if (macdVal > macdSig && macdHist > 0)                  { bullScore += 1; }
    else if (macdVal < macdSig && macdHist < 0 && macdVal < 0)  { bearScore += 2; reasons.push('MACD bearish'); }
    else if (macdVal < macdSig && macdHist < 0)                  { bearScore += 1; }
  }

  // ── 6. Bollinger context — +1 bonus ──────────────────────────────────
  if (bb.upper && bb.lower) {
    const bbPct = (price - bb.lower) / (bb.upper - bb.lower);
    if (bbPct < 0.25 && bullScore > bearScore) bullScore += 1;
    else if (bbPct > 0.75 && bearScore > bullScore) bearScore += 1;
  }

  // ── 7. Volume conviction + profile — +1 spike, +1 accumulation ─────────
  if (vSpike !== null && vSpike > 1.5) {
    if (bullScore > bearScore) bullScore += 1;
    else if (bearScore > bullScore) bearScore += 1;
  }
  // Volume profile: accumulation (rising price + high vol) adds conviction
  const volProfile = volumeProfile(prices, volumes, 10);
  if (volProfile > 0.4 && bullScore > bearScore) {
    bullScore += 1; reasons.push('Accumulation volume');
  } else if (volProfile < -0.4 && bearScore > bullScore) {
    bearScore += 1; reasons.push('Distribution volume');
  } else if (volProfile < -0.3 && bullScore > bearScore) {
    // Distribution warning on a bull signal — subtract a point
    bullScore = Math.max(0, bullScore - 1);
  }

  // ── 8. Sector momentum bonus ─────────────────────────────────────────
  if (sectorScore > 0.3) { bullScore += 1; reasons.push('Hot sector'); }
  else if (sectorScore < -0.3) bearScore += 1;

  // ── 9. Risk/reward filter — only BUY if TP is at least 2× the stop ───
  // Fixes asymmetric stop/take-profit problem
  let rrOk = true;
  if (atrPct !== null && atrPct > 0) {
    const dynStop = Math.min(Math.max(atrPct * 1.5 / 100, 0.02), 0.08);
    const tpDist  = 0.08; // 8% take-profit
    rrOk = tpDist >= dynStop * 2; // must be at least 2:1
  }

  const total      = bullScore + bearScore;
  const confidence = total > 0 ? Math.round((Math.max(bullScore, bearScore) / total) * 100) : 50;

  let rawSignal = 'HOLD';
  if (bullScore > bearScore && bullScore >= 5 && rrOk) rawSignal = 'BUY';
  else if (bearScore > bullScore && bearScore >= 5)    rawSignal = 'SELL';

  // ── Consecutive signal gate ────────────────────────────────────────────
  // Signal only confirmed if SAME raw signal appeared on previous check
  // This is enforced here — caller just needs to pass lastRawSignal
  const signal = (rawSignal !== 'HOLD' && rawSignal === lastRawSignal)
    ? rawSignal
    : 'HOLD';

  return { signal, rawSignal, reason: reasons.slice(0, 2).join(' · ') || 'Waiting for setup', confidence, bullScore, bearScore, rrOk };
}
