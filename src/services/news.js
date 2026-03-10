// ── News & sentiment service ── uses Yahoo Finance via existing proxy ──────
const BULL = ['beat','beats','upgrade','upgraded','raised','record','surge','surges','rally',
  'bullish','growth','profit','dividend','buyback','partnership','deal','approval','approved',
  'expands','strong','outperform','buy'];
const BEAR = ['miss','misses','downgrade','downgraded','cut','lowered','lawsuit','recall',
  'investigation','probe','fraud','loss','decline','warning','sell','underperform','layoffs',
  'bankrupt','rejected','failed','fail','drops','slump','crash'];

export function scoreSentiment(text) {
  const s = (text||'').toLowerCase();
  let n = 0;
  for (const w of BULL) if (s.includes(w)) n++;
  for (const w of BEAR) if (s.includes(w)) n--;
  return n > 0 ? 'bullish' : n < 0 ? 'bearish' : 'neutral';
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts*1000) / 60000);
  if (m < 60)  return m + 'm ago';
  if (m < 1440) return Math.floor(m/60) + 'h ago';
  return Math.floor(m/1440) + 'd ago';
}

export async function fetchNews(symbol, count = 8) {
  try {
    const url = `/api/yahoo/v1/finance/search?q=${symbol}&newsCount=${count}&quotesCount=0&enableFuzzyQuery=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const items = data?.news ?? [];
    if (!items.length) return null;
    return items.slice(0, count).map(n => ({
      title:     n.title,
      link:      n.link,
      publisher: n.publisher,
      time:      n.providerPublishTime,
      timeAgo:   timeAgo(n.providerPublishTime),
      sentiment: scoreSentiment(n.title),
    }));
  } catch { return null; }
}

export async function fetchEarningsDate(symbol) {
  try {
    const url = `/api/yahoo/v10/finance/quoteSummary/${symbol}?modules=calendarEvents`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const dates = data?.quoteSummary?.result?.[0]?.calendarEvents?.earnings?.earningsDate ?? [];
    if (!dates.length) return null;
    const now  = Date.now() / 1000;
    const next = dates.map(d => d.raw).filter(d => d > now - 86400).sort()[0];
    if (!next) return null;
    const daysUntil = Math.ceil((next*1000 - Date.now()) / 86400000);
    return {
      date:       new Date(next*1000).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}),
      daysUntil,
      isImminent: daysUntil <= 2 && daysUntil >= 0,
      isPast:     daysUntil < 0,
    };
  } catch { return null; }
}

export function aggregateNewsSentiment(newsItems) {
  if (!newsItems?.length) return { score:0, label:'neutral', bullish:0, bearish:0 };
  const c = { bullish:0, bearish:0, neutral:0 };
  for (const n of newsItems) c[n.sentiment]++;
  const score = c.bullish - c.bearish;
  return { score, label: score>=2?'bullish':score<=-2?'bearish':'neutral', ...c };
}
