import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend } from 'recharts';

const fmtUSD = n => typeof n !== 'number' ? '—' : (n >= 0 ? '+' : '') + '$' + Math.abs(n).toFixed(2);
const fmtPct = n => typeof n === 'number' ? (n >= 0 ? '+' : '') + n.toFixed(1) + '%' : '—';

function exportCSV(trades) {
  const headers = ['Time','Symbol','Action','Side','Shares','Fill Price','Total Value','P&L','Slippage','Reason','Auto'];
  const rows = trades.map(t => [
    new Date(t.time).toLocaleString(),
    t.symbol,
    t.action,
    t.side || 'long',
    t.shares,
    typeof t.price === 'number' ? t.price.toFixed(4) : '',
    typeof t.price === 'number' && t.shares ? (t.price * t.shares).toFixed(2) : '',
    t.pnl != null ? t.pnl.toFixed(2) : '',
    t.slippage != null ? t.slippage.toFixed(4) : '0',
    t.reason || '',
    t.auto ? 'Bot' : 'Manual',
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `arimeltona_trades_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const C = {
  green: 'var(--green)', red: 'var(--red)', yellow: 'var(--yellow)',
  accent: 'var(--accent)', blue: 'var(--blue)', text3: 'var(--text3)',
};

function SectionHead({ children }) {
  return (
    <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.14em', fontFamily: "'DM Mono',monospace",
      padding: '14px 0 8px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
      {children}
    </div>
  );
}

function MetricRow({ label, value, color, sub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{label}</div>
        {sub && <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'DM Mono',monospace", color: color || 'var(--text)' }}>{value}</div>
    </div>
  );
}

export default function PerformancePanel({ trades, equityHistory }) {
  const closed = useMemo(() => trades.filter(t => t.action === 'SELL' && t.pnl != null), [trades]);

  // ── Exit reason breakdown ───────────────────────────────────────────
  const byReason = useMemo(() => {
    const map = {};
    for (const t of closed) {
      const r = t.reason || 'manual';
      if (!map[r]) map[r] = { count: 0, pnl: 0, wins: 0 };
      map[r].count++;
      map[r].pnl += t.pnl;
      if (t.pnl > 0) map[r].wins++;
    }
    return Object.entries(map)
      .map(([reason, d]) => ({ reason, ...d, winRate: (d.wins / d.count * 100).toFixed(0) }))
      .sort((a, b) => b.count - a.count);
  }, [closed]);

  const reasonColor = r => {
    if (r === 'take-profit') return C.green;
    if (r === 'partial-exit') return '#4ade80';
    if (r?.includes('atr') || r === 'momentum-reversal') return C.red;
    if (r === 'profit-fading' || r === 'stagnation') return C.yellow;
    if (r === 'manual') return C.accent;
    return C.text3;
  };

  // ── Time of day breakdown ───────────────────────────────────────────
  const byHour = useMemo(() => {
    const map = {};
    for (const t of closed) {
      const h = new Date(t.time).getHours();
      const label = `${h}:00`;
      if (!map[label]) map[label] = { label, count: 0, pnl: 0 };
      map[label].count++;
      map[label].pnl += t.pnl;
    }
    return Object.values(map).sort((a, b) => parseInt(a.label) - parseInt(b.label));
  }, [closed]);

  // ── Symbol breakdown ────────────────────────────────────────────────
  const bySymbol = useMemo(() => {
    const map = {};
    for (const t of closed) {
      if (!map[t.symbol]) map[t.symbol] = { symbol: t.symbol, count: 0, pnl: 0, wins: 0 };
      map[t.symbol].count++;
      map[t.symbol].pnl += t.pnl;
      if (t.pnl > 0) map[t.symbol].wins++;
    }
    return Object.values(map).sort((a, b) => b.pnl - a.pnl).slice(0, 10);
  }, [closed]);

  // ── Auto vs manual ──────────────────────────────────────────────────
  const autoTrades  = closed.filter(t => t.auto);
  const manTrades   = closed.filter(t => !t.auto);
  const autoPnl     = autoTrades.reduce((s, t) => s + t.pnl, 0);
  const manPnl      = manTrades.reduce((s, t) => s + t.pnl, 0);
  const autoWR      = autoTrades.length ? (autoTrades.filter(t => t.pnl > 0).length / autoTrades.length * 100) : null;
  const manWR       = manTrades.length  ? (manTrades.filter(t => t.pnl > 0).length / manTrades.length  * 100) : null;

  // ── Max drawdown ────────────────────────────────────────────────────
  let peak = 0, maxDD = 0;
  for (const e of equityHistory) {
    if (e.value > peak) peak = e.value;
    const dd = peak > 0 ? (peak - e.value) / peak * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  }

  // ── Streak analysis ─────────────────────────────────────────────────
  let curStreak = 0, bestWin = 0, worstLoss = 0;
  for (const t of closed) {
    if (t.pnl > 0) { curStreak = Math.max(0, curStreak) + 1; bestWin  = Math.max(bestWin, curStreak); }
    else            { curStreak = Math.min(0, curStreak) - 1; worstLoss = Math.max(worstLoss, Math.abs(curStreak)); }
  }

  // Compute total slippage cost
  const totalSlippage = trades.reduce((s, t) => s + (t.slippage ?? 0), 0);

  if (!closed.length) return (
    <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text3)' }}>
      <div style={{ fontSize: 36, marginBottom: 12, opacity: .3 }}>◎</div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12 }}>No closed trades yet</div>
      <div style={{ fontSize: 11, color: 'var(--text4)', marginTop: 6 }}>Performance data will appear after your first completed trade</div>
    </div>
  );

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* ── Export + Slippage header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>
          Simulated <span style={{ color: 'var(--accent)', fontFamily: "'DM Mono',monospace" }}>0.1%</span> slippage per trade side ·
          total friction cost:{' '}
          <span style={{ color: 'var(--red)', fontFamily: "'DM Mono',monospace" }}>
            ${Math.abs(totalSlippage).toFixed(2)}
          </span>
        </div>
        <button className="btn-ghost" onClick={() => exportCSV(trades)}
          style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          ↓ EXPORT CSV
        </button>
      </div>

      {/* ── Overview grid ── */}
      <SectionHead>OVERVIEW</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
        {[
          { l: 'TOTAL TRADES',    v: closed.length,                      s: `${autoTrades.length} bot · ${manTrades.length} manual` },
          { l: 'TOTAL P&L',       v: fmtUSD(closed.reduce((s,t) => s+t.pnl, 0)), c: closed.reduce((s,t)=>s+t.pnl,0) >= 0 ? C.green : C.red },
          { l: 'MAX DRAWDOWN',    v: `-${maxDD.toFixed(1)}%`,            c: maxDD > 15 ? C.red : maxDD > 8 ? C.yellow : C.green },
          { l: 'SLIPPAGE COST',   v: `-$${Math.abs(totalSlippage).toFixed(2)}`, c: C.red, s: '0.1% per side simulated' },
        ].map(x => (
          <div key={x.l} className="stat-card">
            <div className="stat-label">{x.l}</div>
            <div className="stat-value" style={{ color: x.c || 'var(--text)' }}>{x.v}</div>
            {x.s && <div className="stat-sub">{x.s}</div>}
          </div>
        ))}
      </div>

      {/* ── Bot vs Manual ── */}
      <SectionHead>BOT VS MANUAL PERFORMANCE</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: '🤖 Auto Bot', trades: autoTrades, pnl: autoPnl, wr: autoWR },
          { label: '👤 Manual',   trades: manTrades,  pnl: manPnl,  wr: manWR  },
        ].map(x => (
          <div key={x.label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>{x.label}</div>
            <MetricRow label="Trades"   value={String(x.trades.length)} />
            <MetricRow label="Total P&L" value={fmtUSD(x.pnl)} color={x.pnl >= 0 ? C.green : C.red} />
            <MetricRow label="Win Rate"  value={x.wr != null ? x.wr.toFixed(1) + '%' : '—'} color={x.wr >= 50 ? C.green : C.red} />
          </div>
        ))}
      </div>

      {/* ── Exit reason breakdown ── */}
      <SectionHead>WHY POSITIONS CLOSED</SectionHead>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {byReason.map(r => (
            <div key={r.reason} style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: reasonColor(r.reason), flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text)', fontFamily: "'DM Mono',monospace" }}>{r.reason}</div>
                <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{r.count} trades · {r.winRate}% win rate</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, fontFamily: "'DM Mono',monospace",
                color: r.pnl >= 0 ? C.green : C.red }}>{fmtUSD(r.pnl)}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.1em', marginBottom: 10 }}>P&L BY EXIT TYPE</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byReason} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <XAxis dataKey="reason" tick={{ fontSize: 8, fill: 'var(--text3)', fontFamily: 'DM Mono,monospace' }}
                tickFormatter={r => r.split('-')[0].toUpperCase().slice(0,4)} />
              <YAxis tick={{ fontSize: 8, fill: 'var(--text3)' }} tickLine={false} axisLine={false} width={40} tickFormatter={v => '$'+v.toFixed(0)} />
              <Tooltip formatter={(v, n) => [fmtUSD(v), 'P&L']}
                contentStyle={{ background: 'var(--bg4)', border: '1px solid var(--border2)', fontSize: 10, borderRadius: 8 }} />
              <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                {byReason.map((r, i) => <Cell key={i} fill={reasonColor(r.reason)} opacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Time of day ── */}
      {byHour.length > 0 && (
        <>
          <SectionHead>PERFORMANCE BY HOUR OF DAY</SectionHead>
          <div className="card" style={{ padding: '14px 16px', marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={byHour} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text3)', fontFamily: 'DM Mono,monospace' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} width={40} tickFormatter={v => '$'+v.toFixed(0)} />
                <Tooltip formatter={(v) => [fmtUSD(v), 'P&L']}
                  contentStyle={{ background: 'var(--bg4)', border: '1px solid var(--border2)', fontSize: 10, borderRadius: 8 }} />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                  {byHour.map((h, i) => <Cell key={i} fill={h.pnl >= 0 ? C.green : C.red} opacity={0.75} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 8, fontStyle: 'italic' }}>
              Tip: if 9:00 and 15:00 bars are red, the time-of-day filter is correctly protecting you from open/close volatility.
            </div>
          </div>
        </>
      )}

      {/* ── Symbol breakdown ── */}
      {bySymbol.length > 0 && (
        <>
          <SectionHead>TOP SYMBOLS BY P&L</SectionHead>
          <div className="card" style={{ overflow: 'hidden', marginBottom: 20 }}>
            {bySymbol.map(s => {
              const wr = (s.wins / s.count * 100).toFixed(0);
              const barW = Math.min(100, Math.abs(s.pnl) / Math.max(...bySymbol.map(x => Math.abs(x.pnl))) * 100);
              return (
                <div key={s.symbol} style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600, color: 'var(--accent)', minWidth: 52 }}>{s.symbol}</span>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>{s.count} trades · {wr}% win</span>
                    </div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600, color: s.pnl >= 0 ? C.green : C.red }}>{fmtUSD(s.pnl)}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--border2)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: barW + '%', background: s.pnl >= 0 ? C.green : C.red, borderRadius: 2, transition: 'width .4s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
