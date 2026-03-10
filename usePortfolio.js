// ── Hot stocks screener — Yahoo Finance ───────────────────────────────────
// Screener list: every 5 minutes
// Live quotes for those symbols: every 15s (driven by useMarketData)

const SCREENER = (id) =>
  '/api/yahoo/v1/finance/screener/predefined/saved?formatted=false&scrIds=' + id + '&count=25';

async function fetchScreener(name) {
  try {
    const res = await fetch(SCREENER(name));
    if (!res.ok) return null;
    const data = await res.json();
    const quotes = data?.finance?.result?.[0]?.quotes ?? [];
    if (!quotes.length) return null;
    return quotes
      .filter(q => q.regularMarketPrice > 0)
      .map(q => ({
        symbol:    q.symbol,
        name:      q.shortName ?? q.symbol,
        price:     q.regularMarketPrice,
        change:    q.regularMarketChange,
        changePct: q.regularMarketChangePercent,
        volume:    q.regularMarketVolume,
        avgVolume: q.averageDailyVolume3Month,
        volRatio:  q.averageDailyVolume3Month > 0
          ? q.regularMarketVolume / q.averageDailyVolume3Month : null,
        marketCap: q.marketCap,
      }));
  } catch {
    return null;
  }
}

export async function fetchHotStocks() {
  const [gainers, losers, active] = await Promise.all([
    fetchScreener('day_gainers'),
    fetchScreener('day_losers'),
    fetchScreener('most_actives'),
  ]);
  const hasData = gainers?.length || losers?.length || active?.length;
  if (!hasData) return null; // caller should show "market closed / unavailable"
  return { gainers: gainers ?? [], losers: losers ?? [], active: active ?? [] };
}

export function getUniqueHotSymbols(hotData) {
  if (!hotData) return [];
  return [...new Set([
    ...(hotData.gainers ?? []),
    ...(hotData.losers  ?? []),
    ...(hotData.active  ?? []),
  ].map(s => s.symbol))];
}
