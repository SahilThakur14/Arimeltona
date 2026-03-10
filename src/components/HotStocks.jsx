import { useState, useEffect, useRef } from 'react';
import { fetchHotStocks, refreshHotPrices, getMockHotStocks } from '../services/hotStocks.js';

const fmt = (n, d = 2) => typeof n === 'number' ? n.toFixed(d) : '—';
const fmtVol = (n) => {
  if (!n) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return (n / 1e3).toFixed(0) + 'K';
};

function HotRow({ stock, onSelect, selected }) {
  const isUp = stock.changePct >= 0;
  const isHot = stock.volRatio && stock.volRatio > 1.5;
  const isSuperHot = stock.volRatio && stock.volRatio > 2;
  return (
    <div
      onClick={() => onSelect(stock.symbol)}
      style={{
        display: 'grid', gridTemplateColumns: '72px 1fr 82px 74px 70px 58px',
        padding: '8px 16px', borderBottom: '1px solid #0a0e18', cursor: 'pointer',
        background: selected === stock.symbol ? '#111827' : 'transparent', transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#111827'}
      onMouseLeave={e => e.currentTarget.style.background = selected === stock.symbol ? '#111827' : 'transparent'}
    >
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: selected === stock.symbol ? 'var(--accent)' : 'var(--text)' }}>
        {stock.symbol}
        {isSuperHot ? ' 🔥' : isHot ? ' ⚡' : ''}
      </div>
      <div style={{ fontSize: 11, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.name}</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}>${fmt(stock.price)}</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: isUp ? 'var(--green)' : 'var(--red)' }}>
        {isUp ? '+' : ''}{fmt(stock.changePct)}%
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#64748b' }}>{fmtVol(stock.volume)}</div>
      <div style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: isSuperHot ? 'var(--accent)' : isHot ? 'var(--yellow)' : '#4b5563' }}>
        {stock.volRatio ? fmt(stock.volRatio, 1) + 'x' : '—'}
      </div>
    </div>
  );
}

export default function HotStocks({ onSelectSymbol, selected }) {
  const [data, setData]         = useState(null);
  const [liveData, setLiveData] = useState({}); // symbol -> { price, changePct, ... }
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('gainers');
  const [isLive, setIsLive]     = useState(false);
  const [tick, setTick]         = useState(0);
  const symbolsRef              = useRef([]);

  // Initial full screener load + every 5 minutes
  async function loadScreener() {
    setLoading(true);
    const result = await fetchHotStocks();
    const hasData = result.gainers?.length || result.losers?.length || result.active?.length;
    if (hasData) {
      setData(result);
      setIsLive(true);
      symbolsRef.current = [
        ...(result.gainers ?? []),
        ...(result.losers ?? []),
        ...(result.active ?? []),
      ].map(s => s.symbol).filter((v, i, a) => a.indexOf(v) === i);
    } else {
      const mock = getMockHotStocks();
      setData(mock);
      setIsLive(false);
      symbolsRef.current = [...mock.gainers, ...mock.losers, ...mock.active]
        .map(s => s.symbol).filter((v, i, a) => a.indexOf(v) === i);
    }
    setLoading(false);
  }

  // 1-second live price refresh
  useEffect(() => {
    const id = setInterval(async () => {
      if (!isLive || symbolsRef.current.length === 0) return;
      const fresh = await refreshHotPrices(symbolsRef.current);
      if (Object.keys(fresh).length > 0) {
        setLiveData(fresh);
        setTick(t => t + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isLive]);

  useEffect(() => {
    loadScreener();
    const id = setInterval(loadScreener, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Merge live prices into list
  function mergeStock(s) {
    const live = liveData[s.symbol];
    if (!live) return s;
    return { ...s, price: live.price ?? s.price, changePct: live.changePct ?? s.changePct, volume: live.volume ?? s.volume, volRatio: live.volRatio ?? s.volRatio };
  }

  const tabs = [
    { key: 'gainers', label: '🟢 GAINERS', color: 'var(--green)' },
    { key: 'losers',  label: '🔴 LOSERS',  color: 'var(--red)' },
    { key: 'active',  label: '⚡ ACTIVE',  color: 'var(--accent)' },
  ];

  const rows = (data?.[activeTab] ?? []).map(mergeStock);

  return (
    <div>
      <div style={{ background: '#0d1220', border: '1px solid #1a2236', borderRadius: 10, padding: '12px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: '0.1em' }}>TODAY'S HOT STOCKS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: isLive ? 'var(--green)' : 'var(--yellow)', animation: 'pulse 1s infinite' }} />
              <span style={{ fontSize: 10, color: isLive ? 'var(--green)' : 'var(--yellow)', fontFamily: "'Space Mono', monospace" }}>
                {isLive ? 'LIVE · 1s' : 'SAMPLE'}
              </span>
              {isLive && <span style={{ fontSize: 10, color: '#4b5563', fontFamily: "'Space Mono', monospace" }}>tick #{tick}</span>}
            </div>
            <button onClick={loadScreener} style={{ background: '#1a2236', border: '1px solid #1a2236', color: '#64748b', padding: '3px 10px', borderRadius: 5, fontSize: 10, cursor: 'pointer' }}>↻</button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#4b5563' }}>
          Screener refreshes every 5min · Prices update every second · Click to trade
        </div>
      </div>

      {/* Strategy tip */}
      <div style={{ background: '#0a1628', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, marginBottom: 4 }}>💡 HOW TO USE THIS</div>
        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.8 }}>
          <strong style={{ color: '#94a3b8' }}>Gainers</strong> — momentum already positive. Strategy buys confirmed uptrends. Look for 🔥 volume spike.
          {'  ·  '}
          <strong style={{ color: '#94a3b8' }}>Losers</strong> — oversold. Wait for RSI &lt;30 + slope reversal before buying the bounce.
          {'  ·  '}
          <strong style={{ color: '#94a3b8' }}>Active</strong> — highest conviction. Vol/Avg &gt;2× = big move likely. Auto-trade loves these.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1a2236' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            background: 'none', border: 'none',
            color: activeTab === t.key ? t.color : '#4b5563',
            padding: '8px 18px', fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer',
            borderBottom: '2px solid ' + (activeTab === t.key ? t.color : 'transparent'),
            fontFamily: "'Space Mono', monospace",
          }}>{t.label} {data?.[t.key] ? '(' + data[t.key].length + ')' : ''}</button>
        ))}
      </div>

      <div style={{ background: '#0d1220', border: '1px solid #1a2236', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 82px 74px 70px 58px', padding: '8px 16px', borderBottom: '1px solid #1a2236' }}>
          {['SYMBOL', 'NAME', 'PRICE', 'CHANGE', 'VOLUME', 'VOL×'].map(h => (
            <div key={h} style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.07em', fontFamily: "'Space Mono', monospace" }}>{h}</div>
          ))}
        </div>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563' }}>⏳ Fetching movers...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563' }}>No data available</div>
        ) : rows.map(s => <HotRow key={s.symbol} stock={s} onSelect={onSelectSymbol} selected={selected} />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
        {[
          { label: '🔥 Vol > 2×', color: 'var(--accent)', desc: 'Extreme — big move underway' },
          { label: '⚡ Vol 1.5–2×', color: 'var(--yellow)', desc: 'Elevated — worth watching' },
          { label: 'Vol < 1.5×', color: '#4b5563', desc: 'Normal — lower conviction' },
        ].map(g => (
          <div key={g.label} style={{ background: '#080c14', border: '1px solid #1a2236', borderRadius: 8, padding: '8px 12px' }}>
            <div style={{ fontSize: 11, color: g.color, fontWeight: 700, marginBottom: 3 }}>{g.label}</div>
            <div style={{ fontSize: 10, color: '#4b5563' }}>{g.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
