import { useState, useEffect, useRef, useCallback } from 'react';
import { scoreSentiment } from '../services/news.js';

// Topics covering broad market + world financial news
const TOPICS = [
  { key: 'markets',     label: 'Markets',      sym: 'SPY'  },
  { key: 'economy',     label: 'Economy',      sym: 'GDP'  },
  { key: 'fed',         label: 'Fed / Rates',  sym: 'TLT'  },
  { key: 'tech',        label: 'Tech',         sym: 'QQQ'  },
  { key: 'energy',      label: 'Energy',       sym: 'XLE'  },
  { key: 'crypto',      label: 'Crypto',       sym: 'BTC-USD' },
  { key: 'global',      label: 'Global',       sym: '^GSPC' },
];

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts * 1000) / 60000);
  if (m < 60)   return m + 'm ago';
  if (m < 1440) return Math.floor(m / 60) + 'h ago';
  return Math.floor(m / 1440) + 'd ago';
}

async function fetchTopicNews(sym, count = 20) {
  try {
    const url = `/api/yahoo/v1/finance/search?q=${encodeURIComponent(sym)}&newsCount=${count}&quotesCount=0`;
    const res  = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.news ?? []).map(n => ({
      title:     n.title,
      link:      n.link,
      publisher: n.publisher,
      time:      n.providerPublishTime,
      timeAgo:   timeAgo(n.providerPublishTime),
      sentiment: scoreSentiment(n.title),
    }));
  } catch { return []; }
}

const sentCol = { bullish: 'var(--green)', bearish: 'var(--red)', neutral: 'var(--text3)' };
const sentDot = { bullish: '#0fba81',      bearish: '#f04b6a',    neutral: '#324865' };

export default function GlobalNewsTab() {
  const [activeTopic, setActiveTopic] = useState('markets');
  const [news,        setNews]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const cache = useRef({});

  const load = useCallback(async (topicKey, force = false) => {
    const topic = TOPICS.find(t => t.key === topicKey);
    if (!topic) return;
    const c = cache.current[topicKey];
    if (!force && c && Date.now() - c.ts < 5 * 60 * 1000) {
      setNews(c.news); return;
    }
    setLoading(true);
    const items = await fetchTopicNews(topic.sym, 25);
    cache.current[topicKey] = { news: items, ts: Date.now() };
    setNews(items);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(activeTopic); }, [activeTopic, load]);

  const bullish = news.filter(n => n.sentiment === 'bullish').length;
  const bearish = news.filter(n => n.sentiment === 'bearish').length;
  const sentiment = bullish > bearish + 1 ? 'bullish' : bearish > bullish + 1 ? 'bearish' : 'neutral';

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: 'var(--text)', marginBottom: 3 }}>
            World Market News
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'DM Mono',monospace" }}>
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Live headlines across global markets'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Sentiment summary */}
          {!loading && news.length > 0 && (
            <div style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 9,
              fontFamily: "'DM Mono',monospace", fontWeight: 600, letterSpacing: '.06em',
              color: sentCol[sentiment],
              background: sentiment === 'bullish' ? 'var(--green-dim)' : sentiment === 'bearish' ? 'var(--red-dim)' : 'var(--bg3)',
              border: `1px solid ${sentiment === 'bullish' ? 'var(--green-border)' : sentiment === 'bearish' ? 'var(--red-border)' : 'var(--border2)'}`,
            }}>
              {sentiment === 'bullish' ? '▲ BULLISH SENTIMENT' : sentiment === 'bearish' ? '▼ BEARISH SENTIMENT' : '— NEUTRAL SENTIMENT'}
            </div>
          )}
          <button className="btn-ghost" onClick={() => load(activeTopic, true)}
            style={{ fontSize: 10, padding: '5px 12px' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Topic pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {TOPICS.map(t => (
          <button key={t.key} onClick={() => setActiveTopic(t.key)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 10,
              fontFamily: "'DM Mono',monospace", letterSpacing: '.06em',
              cursor: 'pointer', border: '1px solid',
              background:    activeTopic === t.key ? 'var(--accent-bg)' : 'var(--bg3)',
              borderColor:   activeTopic === t.key ? 'var(--accent-border)' : 'var(--border2)',
              color:         activeTopic === t.key ? 'var(--accent)' : 'var(--text3)',
              fontWeight:    activeTopic === t.key ? 600 : 400,
              transition:    'all .15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* News grid */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[70, 56, 65, 50, 60].map((h, i) => (
            <div key={i} className="skel" style={{ height: h, borderRadius: 8 }} />
          ))}
        </div>
      )}

      {!loading && news.length === 0 && (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 10, opacity: .3 }}>◎</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11 }}>No headlines available — try refreshing</div>
        </div>
      )}

      {!loading && news.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {news.map((item, i) => (
            <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}>
              <div className="card rh" style={{
                padding: '12px 14px', height: '100%',
                borderLeft: `3px solid ${sentDot[item.sentiment]}`,
                transition: 'border-color .15s, background .15s',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, marginBottom: 8,
                  display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: 'var(--text3)', fontFamily: "'DM Mono',monospace" }}>
                    {item.publisher}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 9, color: sentCol[item.sentiment],
                      fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>
                      {item.sentiment.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text4)', fontFamily: "'DM Mono',monospace" }}>
                      {item.timeAgo}
                    </span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Stats bar */}
      {!loading && news.length > 0 && (
        <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg2)',
          borderRadius: 'var(--r-md)', border: '1px solid var(--border)',
          display: 'flex', gap: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'DM Mono',monospace" }}>
            {news.length} HEADLINES
          </span>
          <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: "'DM Mono',monospace" }}>
            ▲ {bullish} bullish
          </span>
          <span style={{ fontSize: 10, color: 'var(--red)', fontFamily: "'DM Mono',monospace" }}>
            ▼ {bearish} bearish
          </span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: "'DM Mono',monospace" }}>
            — {news.length - bullish - bearish} neutral
          </span>
        </div>
      )}
    </div>
  );
}
