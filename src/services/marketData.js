// ── Yahoo Finance data service ─────────────────────────────────────────────
// All functions return null on failure — callers must handle null gracefully.

export async function fetchYahooHistory(symbol, interval = '5m', range = '5d') {
  try {
    const url = '/api/yahoo/v8/finance/chart/' + symbol + '?interval=' + interval + '&range=' + range;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result?.timestamp) return null;
    const timestamps = result.timestamp;
    const quotes     = result.indicators.quote[0];
    const bars = timestamps.map((t, i) => ({
      time:   t * 1000,
      open:   quotes.open[i]   ?? quotes.close[i],
      high:   quotes.high[i]   ?? quotes.close[i],
      low:    quotes.low[i]    ?? quotes.close[i],
      close:  quotes.close[i],
      volume: quotes.volume[i] ?? 0,
    })).filter(b => b.close != null && b.close > 0);
    return bars.length >= 10 ? bars : null;
  } catch (e) {
    return null;
  }
}

// Lightweight batch quote fetch — used for live price refresh
export async function fetchYahooQuotes(symbols) {
  if (!symbols?.length) return null;
  try {
    const url = '/api/yahoo/v7/finance/quote?symbols=' + symbols.join(',') +
      '&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,averageDailyVolume3Month,regularMarketDayHigh,regularMarketDayLow,regularMarketOpen,fiftyTwoWeekHigh,fiftyTwoWeekLow,marketCap,shortName';
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const result = {};
    for (const q of data?.quoteResponse?.result ?? []) {
      if (!q.regularMarketPrice) continue;
      result[q.symbol] = {
        price:      q.regularMarketPrice,
        change:     q.regularMarketChange,
        changePct:  q.regularMarketChangePercent,
        volume:     q.regularMarketVolume,
        avgVolume:  q.averageDailyVolume3Month,
        high:       q.regularMarketDayHigh,
        low:        q.regularMarketDayLow,
        open:       q.regularMarketOpen,
        week52High: q.fiftyTwoWeekHigh,
        week52Low:  q.fiftyTwoWeekLow,
        marketCap:  q.marketCap,
        name:       q.shortName ?? q.symbol,
        volRatio:   q.averageDailyVolume3Month > 0
          ? q.regularMarketVolume / q.averageDailyVolume3Month : null,
      };
    }
    return Object.keys(result).length ? result : null;
  } catch (e) {
    return null;
  }
}
