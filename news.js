import { useState, useMemo } from 'react';

const fmtUSD = n => typeof n === 'number' ? '$' + n.toFixed(2) : '—';
const fmtPct = (n, digits=2) => typeof n === 'number' ? (n >= 0 ? '+' : '') + n.toFixed(digits) + '%' : '—';
const sigColor = s => s === 'BUY' ? 'var(--green)' : s === 'SELL' ? 'var(--red)' : 'var(--text3)';
const sigBg    = s => s === 'BUY' ? 'var(--green-dim)' : s === 'SELL' ? 'var(--red-dim)' : 'var(--bg3)';
const sigBorder= s => s === 'BUY' ? 'var(--green-border)' : s === 'SELL' ? 'var(--red-border)' : 'var(--border)';

// Compute YTD, MTD, 3-day returns from bar history
function computeReturns(bars) {
  if (!bars || bars.length < 2) return { ytd: null, mtd: null, d3: null, d1: null };
  const now      = new Date();
  const latest   = bars[bars.length - 1];
  const curPrice = latest.close;

  const findClose = (targetDate) => {
    // Find the last bar before or on targetDate
    for (let i = bars.length - 1; i >= 0; i--) {
      const d = new Date(bars[i].time);
      if (d <= targetDate) return bars[i].close;
    }
    return null;
  };

  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const d3Start  = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const d1Start  = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

  const ytdPrice = findClose(ytdStart);
  const mtdPrice = findClose(mtdStart);
  const d3Price  = findClose(d3Start);
  const d1Price  = findClose(d1Start);

  const ret = (base) => base && base > 0 ? (curPrice - base) / base * 100 : null;

  return {
    ytd: ret(ytdPrice),
    mtd: ret(mtdPrice),
    d3:  ret(d3Price),
    d1:  ret(d1Price),
  };
}

function ColHeader({ children, width }) {
  return (
    <div style={{ width, fontSize: 8, color: 'var(--text3)', letterSpacing: '.1em',
      fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
      {children}
    </div>
  );
}

function RetCell({ value, width }) {
  const color = value == null ? 'var(--text3)' : value >= 1 ? 'var(--green)' : value <= -1 ? 'var(--red)' : 'var(--text2)';
  return (
    <div style={{ width, fontFamily: "'DM Mono',monospace", fontSize: 10, color, flexShrink: 0, fontWeight: value != null && Math.abs(value) >= 2 ? 600 : 400 }}>
      {fmtPct(value, 1)}
    </div>
  );
}

export default function WatchlistPanel({ watchlist, addSymbol, removeSymbol,
  quotes, bars, prices, onSelectSymbol, selected, getSignalForSym }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  function handleAdd() {
    const sym = input.trim().toUpperCase();
    if (!sym) return;
    const ok = addSymbol(sym);
    if (!ok) {
      setError(sym.length > 6 ? 'Symbol too long (max 6)' : `${sym} already in watchlist`);
      setTimeout(() => setError(''), 2500);
    } else {
      setInput('');
      setError('');
    }
  }

  // Precompute returns for all watchlist symbols
  const returns = useMemo(() => {
    const map = {};
    for (const sym of watchlist) {
      map[sym] = computeReturns(bars[sym]);
    }
    return map;
  }, [watchlist, bars]);

  const COL = { sym: 58, price: 86, chg: 68, signal: 72, bull: 72, bear: 72, d1: 60, d3: 60, mtd: 64, ytd: 64, del: 24 };

  return (
    <div>
      {/* Add symbol row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="inp"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase().replace(/[^A-Z.]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Add symbol  e.g. GOOGL"
              maxLength={6}
              style={{ fontSize: 12, padding: '8px 12px' }}
            />
            <button className="btn-accent" onClick={handleAdd}
              style={{ padding: '8px 18px', fontSize: 11, flexShrink: 0, letterSpacing: '.06em' }}>
              + ADD
            </button>
          </div>
          {error && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 5 }}>{error}</div>}
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', padding: '6px 14px', borderBottom: '1px solid var(--border)',
        gap: 6, alignItems: 'center' }}>
        <ColHeader width={COL.sym}>SYM</ColHeader>
        <ColHeader width={COL.price}>PRICE</ColHeader>
        <ColHeader width={COL.chg}>TODAY</ColHeader>
        <ColHeader width={COL.signal}>SIGNAL</ColHeader>
        <ColHeader width={COL.bull}>BULL▲</ColHeader>
        <ColHeader width={COL.bear}>BEAR▼</ColHeader>
        <ColHeader width={COL.d1}>1D</ColHeader>
        <ColHeader width={COL.d3}>3D</ColHeader>
        <ColHeader width={COL.mtd}>MTD</ColHeader>
        <ColHeader width={COL.ytd}>YTD</ColHeader>
        <div style={{ width: COL.del }} />
      </div>

      {watchlist.length === 0 && (
        <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 10, opacity: .25 }}>◎</div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11 }}>Watchlist empty — add symbols above</div>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {watchlist.map(sym => {
          const q    = quotes[sym];
          const price= prices[sym];
          const chg  = q?.changePct ?? null;
          const sig  = getSignalForSym(sym);
          const ret  = returns[sym] ?? {};
          const isSel= sym === selected;

          return (
            <div key={sym} className="rh" onClick={() => onSelectSymbol(sym)}
              style={{ display: 'flex', padding: '10px 14px', gap: 6, alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                background: isSel ? 'rgba(245,158,11,.04)' : 'transparent',
                borderLeft: `3px solid ${isSel ? 'var(--accent)' : 'transparent'}` }}>

              {/* Symbol */}
              <div style={{ width: COL.sym, fontFamily: "'DM Mono',monospace", fontSize: 12,
                fontWeight: 700, color: isSel ? 'var(--accent)' : 'var(--text)', flexShrink: 0 }}>
                {sym}
              </div>

              {/* Price */}
              <div style={{ width: COL.price, fontFamily: "'DM Mono',monospace", fontSize: 11,
                color: 'var(--text)', flexShrink: 0 }}>
                {price ? fmtUSD(price) : <span style={{ color: 'var(--text4)' }}>—</span>}
              </div>

              {/* Today % */}
              <div style={{ width: COL.chg, fontFamily: "'DM Mono',monospace", fontSize: 11, flexShrink: 0,
                color: chg == null ? 'var(--text3)' : chg >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                {chg != null ? fmtPct(chg) : '—'}
              </div>

              {/* Signal */}
              <div style={{ width: COL.signal, flexShrink: 0 }}>
                {sig ? (
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fontWeight: 700,
                    color: sigColor(sig.signal), background: sigBg(sig.signal),
                    border: `1px solid ${sigBorder(sig.signal)}`,
                    padding: '2px 7px', borderRadius: 4 }}>
                    {sig.signal}
                  </span>
                ) : <span style={{ color: 'var(--text4)', fontSize: 10 }}>—</span>}
              </div>

              {/* Bull score bar */}
              <div style={{ width: COL.bull, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <div style={{ flex: 1, height: 3, background: 'var(--border2)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: sig ? (sig.bullScore / 11 * 100) + '%' : '0%',
                    background: 'var(--green)', borderRadius: 2, transition: 'width .4s' }} />
                </div>
                <span style={{ fontSize: 9, color: 'var(--green)', fontFamily: "'DM Mono',monospace", minWidth: 14, textAlign: 'right' }}>
                  {sig?.bullScore ?? '—'}
                </span>
              </div>

              {/* Bear score bar */}
              <div style={{ width: COL.bear, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <div style={{ flex: 1, height: 3, background: 'var(--border2)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: sig ? (sig.bearScore / 11 * 100) + '%' : '0%',
                    background: 'var(--red)', borderRadius: 2, transition: 'width .4s' }} />
                </div>
                <span style={{ fontSize: 9, color: 'var(--red)', fontFamily: "'DM Mono',monospace", minWidth: 14, textAlign: 'right' }}>
                  {sig?.bearScore ?? '—'}
                </span>
              </div>

              {/* 1D, 3D, MTD, YTD */}
              <RetCell value={ret.d1}  width={COL.d1} />
              <RetCell value={ret.d3}  width={COL.d3} />
              <RetCell value={ret.mtd} width={COL.mtd} />
              <RetCell value={ret.ytd} width={COL.ytd} />

              {/* Remove */}
              <button onClick={e => { e.stopPropagation(); removeSymbol(sym); }}
                style={{ width: COL.del, background: 'none', border: 'none', color: 'var(--text4)',
                  cursor: 'pointer', fontSize: 15, padding: 0, lineHeight: 1, flexShrink: 0,
                  transition: 'color .12s' }}
                onMouseEnter={e => e.target.style.color = 'var(--red)'}
                onMouseLeave={e => e.target.style.color = 'var(--text4)'}>
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text3)', lineHeight: 1.6 }}>
        Symbols are always tracked and scanned — even outside today's hot stocks list.
        Click any row to open the full chart. 1D/3D/MTD/YTD returns are based on available bar history.
      </div>
    </div>
  );
}
