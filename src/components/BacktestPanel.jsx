import { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, ComposedChart, Area, Line, Bar, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { runBacktest } from '../utils/backtest.js';

function Stat({ label, value, color, sub, big }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, padding: big ? '16px 18px' : '12px 14px' }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: big ? 24 : 18, fontWeight: 700, color: color || 'var(--text)', fontFamily: "'DM Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const PRESETS = [
  { label: 'Conservative', posSize: 10, desc: '10% per trade — low risk' },
  { label: 'Moderate', posSize: 20, desc: '20% per trade — balanced' },
  { label: 'Aggressive', posSize: 40, desc: '40% per trade — high risk/reward' },
  { label: 'All-In', posSize: 90, desc: '90% per trade — maximum exposure' },
];

export default function BacktestPanel({ bars, symbol }) {
  const [posSize, setPosSize] = useState(20);
  const [ran, setRan] = useState(false);
  const [activePreset, setActivePreset] = useState(1);

  const result = useMemo(() => {
    if (!ran || !bars || bars.length < 40) return null;
    return runBacktest(bars, { positionSizePct: posSize / 100, symbol });
  }, [ran, bars, symbol, posSize]);

  function runWithPreset(idx) {
    setActivePreset(idx);
    setPosSize(PRESETS[idx].posSize);
    setRan(true);
  }

  const equityData = result?.equity?.map((e, i) => ({
    i,
    time: e.time,
    strategy: e.value,
    baseline: 10000,
  })) ?? [];

  const barData = result?.trades?.map((t, i) => ({
    i: i + 1,
    pnl: t.pnl,
    label: `${t.symbol ?? symbol} #${i+1}`,
  })) ?? [];

  const fmtUSD = n => typeof n === 'number' ? `${n >= 0 ? '+' : ''}$${Math.abs(n).toFixed(2)}` : '—';
  const fmtPct = n => typeof n === 'number' ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : '—';

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header explainer */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>📊 What is backtesting?</div>
        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
          Backtesting simulates how our trading strategy <em>(SMA crossover + RSI + MACD + Bollinger Bands)</em> would have performed on <strong style={{ color: 'var(--text)' }}>{symbol}</strong>'s historical price data.
          It starts with <strong style={{ color: 'var(--text)' }}>$10,000</strong> in virtual cash and executes BUY/SELL signals automatically — then shows you the results.
          <br /><br />
          <span style={{ color: 'var(--text3)' }}>Note: Past performance does not guarantee future results. This is for educational purposes only.</span>
        </div>
      </div>

      {/* Config */}
      <div style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 10, padding: '20px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 14 }}>CONFIGURATION</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Symbol: <span style={{ color: 'var(--accent)', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{symbol}</span></div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Available data: <span style={{ color: 'var(--text)' }}>{bars?.length ?? 0} bars (~{Math.round((bars?.length ?? 0) * 5 / 60 / 24)} days)</span></div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Starting capital: <span style={{ color: 'var(--text)' }}>$10,000</span></div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>Position size: <span style={{ color: 'var(--accent)', fontFamily: "'DM Mono', monospace" }}>{posSize}% per trade</span></div>
            <input type="range" min={5} max={100} step={5} value={posSize}
              onChange={e => { setPosSize(Number(e.target.value)); setRan(false); }}
              style={{ width: '100%', accentColor: 'var(--accent)', marginBottom: 4 }} />
            <div style={{ fontSize: 10, color: 'var(--text3)' }}>= ${(10000 * posSize / 100).toFixed(0)} max per trade</div>
          </div>
        </div>

        {/* Strategy preset buttons */}
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>QUICK PRESETS — click to run instantly:</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => runWithPreset(i)} style={{
              background: activePreset === i && ran ? 'var(--border2)' : 'var(--bg)',
              border: `1px solid ${activePreset === i && ran ? 'var(--accent)' : 'var(--border2)'}`,
              borderRadius: 8, padding: '10px 8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: activePreset === i && ran ? 'var(--accent)' : 'var(--text)', marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>{p.desc}</div>
            </button>
          ))}
        </div>

        <button onClick={() => setRan(true)} style={{
          width: '100%', background: 'linear-gradient(135deg, #c2410c, #f97316)',
          border: 'none', color: '#fff', padding: '12px', borderRadius: 8,
          fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer',
          fontFamily: "'DM Mono', monospace",
        }}>▶ RUN BACKTEST — {symbol} @ {posSize}% position size</button>
      </div>

      {/* Results */}
      {!ran && (
        <div style={{ background: 'var(--bg)', border: '1px dashed var(--border2)', borderRadius: 10, padding: '48px 24px', textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📈</div>
          <div>Select a preset or configure above, then click Run Backtest</div>
        </div>
      )}

      {ran && result?.error && (
        <div style={{ background: '#2d0a10', border: '1px solid var(--red)', borderRadius: 8, padding: 16, color: 'var(--red)', fontSize: 13 }}>{result.error}</div>
      )}

      {ran && result && !result.error && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          {/* Verdict banner */}
          <div style={{
            background: result.totalReturnPct >= 0 ? '#0a2d1a' : '#2d0a10',
            border: `1px solid ${result.totalReturnPct >= 0 ? 'var(--green)' : 'var(--red)'}`,
            borderRadius: 10, padding: '16px 20px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: 13, color: result.totalReturnPct >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, marginBottom: 4 }}>
                {result.totalReturnPct >= 0 ? '✅ Strategy was PROFITABLE' : '❌ Strategy was UNPROFITABLE'} on {symbol} with {posSize}% position size
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                {result.totalTrades} trades over {bars?.length ?? 0} bars ·
                Strategy {result.totalReturnPct > result.buyHoldReturn ? 'outperformed' : 'underperformed'} buy & hold by {Math.abs(result.totalReturnPct - result.buyHoldReturn).toFixed(2)}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: result.totalReturnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {fmtPct(result.totalReturnPct)}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>vs B&H: {fmtPct(result.buyHoldReturn)}</div>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
            <Stat label="TOTAL RETURN" value={fmtPct(result.totalReturnPct)} color={result.totalReturnPct >= 0 ? 'var(--green)' : 'var(--red)'} sub={`Final: $${result.finalEquity.toFixed(2)}`} big />
            <Stat label="WIN RATE" value={`${result.winRate.toFixed(1)}%`} color={result.winRate >= 50 ? 'var(--green)' : 'var(--red)'} sub={`${result.winningTrades}W / ${result.losingTrades}L`} big />
            <Stat label="MAX DRAWDOWN" value={`-${result.maxDrawdown.toFixed(2)}%`} color="var(--red)" sub="Worst peak-to-trough" big />
            <Stat label="PROFIT FACTOR" value={result.profitFactor ? result.profitFactor.toFixed(2) : 'N/A'} color={result.profitFactor > 1 ? 'var(--green)' : 'var(--red)'} sub=">1.0 = profitable" big />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            <Stat label="TOTAL TRADES" value={result.totalTrades} sub="Completed round-trips" />
            <Stat label="AVG WIN" value={`+$${result.avgWin.toFixed(2)}`} color="var(--green)" sub="Per winning trade" />
            <Stat label="AVG LOSS" value={`-$${Math.abs(result.avgLoss).toFixed(2)}`} color="var(--red)" sub="Per losing trade" />
            <Stat label="BUY & HOLD" value={fmtPct(result.buyHoldReturn)} color={result.buyHoldReturn >= 0 ? 'var(--green)' : 'var(--red)'} sub="Benchmark" />
          </div>

          {/* What does this mean? */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 12 }}>📖 WHAT DO THESE NUMBERS MEAN?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12, color: '#94a3b8', lineHeight: 1.8 }}>
              <div><span style={{ color: 'var(--accent)' }}>Win Rate:</span> % of trades that made money. Above 50% is generally good.</div>
              <div><span style={{ color: 'var(--accent)' }}>Max Drawdown:</span> Biggest drop from peak. Lower is safer.</div>
              <div><span style={{ color: 'var(--accent)' }}>Profit Factor:</span> Avg win ÷ Avg loss. Above 1.5 is solid. Above 2.0 is great.</div>
              <div><span style={{ color: 'var(--accent)' }}>Buy & Hold:</span> If you just bought {symbol} and held — no trading needed.</div>
            </div>
          </div>

          {/* Equity curve */}
          <div style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 4 }}>STRATEGY EQUITY CURVE vs BUY & HOLD</div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
              <span style={{ color: result.totalReturnPct >= 0 ? 'var(--green)' : 'var(--red)' }}>— Strategy</span>
              {'  '}
              <span style={{ color: 'var(--text3)' }}>- - Baseline ($10k)</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={equityData}>
                <defs>
                  <linearGradient id="bt-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={result.totalReturnPct >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={result.totalReturnPct >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border2)" />
                <XAxis dataKey="i" hide />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} tickLine={false} axisLine={false} width={65} tickFormatter={v => ("$" + v.toFixed(0))} />
                <Tooltip formatter={(v, n) => [("$" + v.toFixed(2)), n === 'strategy' ? 'Strategy' : 'Baseline']} contentStyle={{ background: 'var(--bg4)', border: '1px solid var(--border2)', fontSize: 11 }} />
                <ReferenceLine y={10000} stroke="var(--border2)" strokeDasharray="4 4" />
                <Area dataKey="strategy" stroke={result.totalReturnPct >= 0 ? '#10b981' : '#f43f5e'} strokeWidth={2} fill="url(#bt-grad)" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Trade P&L bar chart */}
          {barData.length > 0 && (
            <div style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 12 }}>P&L PER TRADE</div>
              <ResponsiveContainer width="100%" height={120}>
                <ComposedChart data={barData}>
                  <XAxis dataKey="i" tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text3)' }} tickLine={false} axisLine={false} width={50} tickFormatter={v => ("$" + v.toFixed(0))} />
                  <Tooltip formatter={v => [("$" + v.toFixed(2)), 'P&L']} contentStyle={{ background: 'var(--bg4)', border: '1px solid var(--border2)', fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="var(--border2)" />
                  <Bar dataKey="pnl" radius={[2,2,0,0]}
                    shape={props => {
                      const { x, y, width, height, value } = props;
                      return <rect x={x} y={value >= 0 ? y : y + height} width={Math.max(width, 2)} height={Math.abs(height)} fill={value >= 0 ? '#10b981' : '#f43f5e'} opacity={0.85} rx={2} />;
                    }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Exit reason breakdown */}
          {result.exitReasons && Object.keys(result.exitReasons).length > 0 && (
            <div style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em', marginBottom: 10 }}>EXIT REASON BREAKDOWN</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(result.exitReasons).map(([reason, count]) => {
                  const color = reason === 'take-profit' ? 'var(--green)' : reason === 'atr-stop' ? 'var(--red)' : reason === 'stagnation' ? 'var(--yellow)' : reason === 'profit-fading' ? 'var(--yellow)' : reason === 'momentum-reversal' ? '#f97316' : 'var(--text3)';
                  const pct = ((count / result.totalTrades) * 100).toFixed(0);
                  return (
                    <div key={reason} style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '8px 12px', minWidth: 100 }}>
                      <div style={{ fontSize: 10, color, fontWeight: 600, marginBottom: 2 }}>{reason}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: 'var(--text)' }}>{count}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{pct}% of exits</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, lineHeight: 1.7 }}>
                Ideally: <span style={{ color: 'var(--green)' }}>take-profit</span> should be the most common. If <span style={{ color: 'var(--red)' }}>atr-stop</span> or <span style={{ color: '#f97316' }}>momentum-reversal</span> dominate, the entry signal needs to be more selective.
              </div>
            </div>
          )}

          {/* Trade log */}
          <div style={{ background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border2)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.1em' }}>
              TRADE LOG — {result.trades.length} trades
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px 90px 90px 80px', padding: '8px 16px', borderBottom: '1px solid var(--border2)' }}>
                {['DATE IN', 'ENTRY', 'EXIT', 'SHARES', 'P&L', 'RETURN', 'EXIT REASON'].map(h => (
                  <div key={h} style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.06em' }}>{h}</div>
                ))}
              </div>
              {result.trades.map((t, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 75px 75px 55px 85px 80px 100px', padding: '8px 16px', borderBottom: '1px solid var(--bg)', fontSize: 11, alignItems: 'center' }}>
                  <div style={{ color: '#64748b', fontFamily: "'DM Mono', monospace", fontSize: 10 }}>{new Date(t.entryTime).toLocaleDateString()}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace" }}>${t.entryPrice.toFixed(2)}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace" }}>${t.exitPrice.toFixed(2)}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace" }}>{t.shares}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                    {fmtUSD(t.pnl)}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", color: t.pnlPct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmtPct(t.pnlPct)}
                    {t.open && <span style={{ color: 'var(--text3)', fontSize: 9 }}> open</span>}
                  </div>
                  <div style={{ fontSize: 9, color: t.exitReason === 'take-profit' ? 'var(--green)' : t.exitReason === 'atr-stop' ? 'var(--red)' : 'var(--yellow)' }}>
                    {t.exitReason ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
