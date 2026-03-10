import { useState, useEffect, useRef, useCallback } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { useMarketData, CORE_SYMBOLS } from './hooks/useMarketData.js';
import { usePortfolio, TAKE_PROFIT_PCT, PARTIAL_EXIT_PCT, POSITION_PCT, DRAWDOWN_LIMIT, SLIPPAGE_PCT } from './hooks/usePortfolio.js';
import { useWatchlist } from './hooks/useWatchlist.js';
import WatchlistPanel from './components/WatchlistPanel.jsx';
import PerformancePanel from './components/PerformancePanel.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import GlobalNewsTab from './components/GlobalNewsTab.jsx';
import { useNews } from './hooks/useNews.js';
import { getSignal, smaLast, rsiLast, macdLast, momentum, atr, analysePosition, sectorMomentum, regressionSlope, detectGap } from './utils/indicators.js';
import { fetchHotStocks, getUniqueHotSymbols } from './services/hotStocks.js';
import { aggregateNewsSentiment } from './services/news.js';
import { getMarketStatus } from './utils/marketHours.js';
import Chart from './components/Chart.jsx';
import BacktestPanel from './components/BacktestPanel.jsx';
import NewsPanel, { EarningsBadge } from './components/NewsPanel.jsx';
import { ToastContainer, toast } from './components/Toast.jsx';

const STARTING_CASH = 10000;
const fmt    = (n,d=2) => typeof n==='number' ? n.toFixed(d) : '—';
const fmtUSD = n => typeof n!=='number' ? '—' : n.toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2});
const fmtPct = n => typeof n==='number' ? (n>=0?'+':'')+n.toFixed(2)+'%' : '—';
const fmtVol = n => !n?'—':n>=1e9?(n/1e9).toFixed(1)+'B':n>=1e6?(n/1e6).toFixed(1)+'M':(n/1e3).toFixed(0)+'K';

function exportPostmortem(portfolio, prices) {
  const ts   = new Date().toISOString().slice(0,19).replace('T','_').replace(/:/g,'-');
  const trades = portfolio.trades || [];
  const equity = portfolio.equityHistory || [];

  // Build sections
  const lines = [];
  lines.push('ARIMELTONA PAPER TRADER — POSTMORTEM REPORT');
  lines.push('Generated: ' + new Date().toLocaleString());
  lines.push('='.repeat(60));
  lines.push('');

  // Portfolio summary
  const totalEquity = portfolio.cash + Object.entries(portfolio.positions||{}).reduce((s,[sym,pos])=>{
    return s + (prices[sym]||pos.avgCost)*pos.shares;
  }, 0);
  const totalReturn = ((totalEquity - 10000) / 10000 * 100).toFixed(2);
  const closed = trades.filter(t => t.side==='SELL'||t.side==='COVER');
  const wins   = closed.filter(t => (t.pnl||0) > 0);
  const losses = closed.filter(t => (t.pnl||0) <= 0);
  const totalPnL = closed.reduce((s,t) => s+(t.pnl||0), 0);
  const winRate  = closed.length ? (wins.length/closed.length*100).toFixed(1) : '0.0';
  const avgWin   = wins.length   ? (wins.reduce((s,t)=>s+(t.pnl||0),0)/wins.length).toFixed(2)   : '0.00';
  const avgLoss  = losses.length ? (losses.reduce((s,t)=>s+(t.pnl||0),0)/losses.length).toFixed(2): '0.00';
  const grossW   = wins.reduce((s,t)=>s+(t.pnl||0),0);
  const grossL   = Math.abs(losses.reduce((s,t)=>s+(t.pnl||0),0));
  const pf       = grossL > 0 ? (grossW/grossL).toFixed(2) : 'INF';
  const totalSlip= trades.reduce((s,t)=>s+(t.slippage||0),0);

  lines.push('PORTFOLIO SUMMARY');
  lines.push('-'.repeat(40));
  lines.push('Starting Cash:    $10,000.00');
  lines.push('Total Equity:     $' + totalEquity.toFixed(2));
  lines.push('Total Return:     ' + (totalReturn >= 0 ? '+' : '') + totalReturn + '%');
  lines.push('Net P&L:          $' + (totalPnL >= 0 ? '+' : '') + totalPnL.toFixed(2));
  lines.push('Cash:             $' + portfolio.cash.toFixed(2));
  lines.push('Open Positions:   ' + Object.keys(portfolio.positions||{}).length);
  lines.push('');
  lines.push('TRADE STATISTICS');
  lines.push('-'.repeat(40));
  lines.push('Total Trades:     ' + trades.length);
  lines.push('Closed Trades:    ' + closed.length);
  lines.push('Wins:             ' + wins.length + ' (' + winRate + '%)');
  lines.push('Losses:           ' + losses.length);
  lines.push('Avg Win:          $' + avgWin);
  lines.push('Avg Loss:         $' + avgLoss);
  lines.push('Profit Factor:    ' + pf);
  lines.push('Total Slippage:   $' + totalSlip.toFixed(2));
  lines.push('');

  // By symbol
  const symMap = {};
  closed.forEach(t => {
    if (!symMap[t.symbol]) symMap[t.symbol] = { trades:0, pnl:0, wins:0 };
    symMap[t.symbol].trades++;
    symMap[t.symbol].pnl += (t.pnl||0);
    if ((t.pnl||0) > 0) symMap[t.symbol].wins++;
  });
  const syms = Object.entries(symMap).sort((a,b)=>b[1].pnl-a[1].pnl);
  if (syms.length) {
    lines.push('PERFORMANCE BY SYMBOL');
    lines.push('-'.repeat(40));
    lines.push('Symbol   Trades   WinRate   P&L');
    syms.forEach(([sym,d])=>{
      const wr = (d.wins/d.trades*100).toFixed(0)+'%';
      const pnlStr = (d.pnl>=0?'+':'') + d.pnl.toFixed(2);
      lines.push(sym.padEnd(9) + String(d.trades).padEnd(9) + wr.padEnd(10) + '$'+pnlStr);
    });
    lines.push('');
  }

  // Exit reasons
  const exitMap = {};
  closed.forEach(t => {
    const r = t.exitReason || (t.isBot ? 'BOT' : 'MANUAL');
    exitMap[r] = (exitMap[r]||0) + 1;
  });
  if (Object.keys(exitMap).length) {
    lines.push('EXIT REASON BREAKDOWN');
    lines.push('-'.repeat(40));
    Object.entries(exitMap).sort((a,b)=>b[1]-a[1]).forEach(([r,n])=>{
      lines.push(r.padEnd(22) + n + ' trades');
    });
    lines.push('');
  }

  // Equity curve
  if (equity.length) {
    const peak = Math.max(...equity.map(e=>e.value));
    const trough = Math.min(...equity.map(e=>e.value));
    const maxDD = ((peak - trough) / peak * 100).toFixed(2);
    lines.push('EQUITY CURVE STATS');
    lines.push('-'.repeat(40));
    lines.push('Peak Equity:      $' + peak.toFixed(2));
    lines.push('Trough Equity:    $' + trough.toFixed(2));
    lines.push('Max Drawdown:     -' + maxDD + '%');
    lines.push('Data Points:      ' + equity.length);
    lines.push('');
  }

  // Full trade log
  lines.push('FULL TRADE LOG');
  lines.push('-'.repeat(40));
  lines.push('Time,Symbol,Side,Qty,Price,Fill,P&L,Slippage,ExitReason,Bot');
  trades.forEach(t => {
    lines.push([
      t.time ? new Date(t.time).toLocaleString() : '—',
      t.symbol, t.side, t.shares,
      (t.price||0).toFixed(2),
      (t.fillPrice||t.price||0).toFixed(2),
      t.pnl != null ? (t.pnl>=0?'+':'')+t.pnl.toFixed(2) : '—',
      t.slippage != null ? t.slippage.toFixed(2) : '—',
      t.exitReason || '—',
      t.isBot ? 'BOT' : 'MANUAL'
    ].join(','));
  });
  lines.push('');

  // Equity history CSV
  if (equity.length) {
    lines.push('EQUITY HISTORY');
    lines.push('-'.repeat(40));
    lines.push('Time,Equity');
    equity.forEach(e => lines.push(new Date(e.time).toLocaleString() + ',' + e.value.toFixed(2)));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'arimeltona_postmortem_' + ts + '.txt';
  a.click(); URL.revokeObjectURL(url);
}

// ── Small shared components ────────────────────────────────────────────────
const Lbl = ({children,style={}}) => (
  <div style={{fontSize:9,color:'var(--text3)',letterSpacing:'.12em',fontFamily:"'DM Mono',monospace",marginBottom:4,...style}}>
    {children}
  </div>
);

const Sig = ({s}) => <span className={`sig sig-${s}`}>{s}</span>;

function StatCard({label,value,sub,color,accent}) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{color:color||'var(--text)'}}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {accent && <div className="stat-bar" style={{background:accent}} />}
    </div>
  );
}

function KV({l,v,c,mono=true}) {
  return (
    <div className="kv-row">
      <span className="kv-key">{l}</span>
      <span className="kv-val" style={{color:c||'var(--text)',fontFamily:mono?"'DM Mono',monospace":'inherit'}}>{v}</span>
    </div>
  );
}

// ── SPY regime (bull / bear / neutral) ────────────────────────────────────
function useSpyRegime(bars) {
  const [regime,setRegime] = useState('NEUTRAL');
  useEffect(() => {
    const b = bars['SPY'];
    if (!b || b.length < 50) return;
    const closes  = b.map(x=>x.close);
    const volumes = b.map(x=>x.volume);
    const {bullScore,bearScore} = getSignal(closes,volumes,null,0,null);
    setRegime(bullScore>=5?'BULL':bearScore>=5?'BEAR':'NEUTRAL');
  }, [bars]);
  return regime;
}

function RegimePill({regime}) {
  const cfg = {BULL:{l:'▲ BULL',c:'var(--green)'},BEAR:{l:'▼ BEAR',c:'var(--red)'},NEUTRAL:{l:'◆ NEUTRAL',c:'var(--text3)'}}[regime];
  return (
    <span className={`pill regime-${regime}`} style={{fontSize:9,letterSpacing:'.08em'}}>
      {cfg.l}
    </span>
  );
}

// ── Live CT clock ─────────────────────────────────────────────────────────
function useCTClock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');
  useEffect(() => {
    function tick() {
      const now = new Date();
      const ct  = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
      const hh  = String(ct.getHours()).padStart(2,'0');
      const mm  = String(ct.getMinutes()).padStart(2,'0');
      const ss  = String(ct.getSeconds()).padStart(2,'0');
      setTime(hh+':'+mm+':'+ss);
      setDate(ct.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'America/Chicago'}).toUpperCase());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return { time, date };
}

// ── Market status ticker banner ───────────────────────────────────────────
function ClosedBanner({status}) {
  if (status.isOpen) return null;
  const msg = [
    '● MARKET CLOSED — ' + status.reason.toUpperCase(),
    '·',
    'Trading & bot paused',
    '·',
    'Last known prices shown',
    '·',
    status.nextOpen ? 'Opens ' + status.nextOpen : 'Opens at next market session',
    '·',
    'All signals suspended until market open',
    '·',
    'Auto-bot will resume automatically',
    '·',
  ].join('   ');

  return (
    <div style={{
      background:'rgba(245,158,11,.03)',
      borderBottom:'1px solid rgba(245,158,11,.1)',
      height:28, overflow:'hidden', position:'relative', flexShrink:0,
      display:'flex', alignItems:'center',
    }}>
      {/* Fade edges */}
      <div style={{position:'absolute',left:0,top:0,bottom:0,width:60,
        background:'linear-gradient(90deg,rgba(3,6,14,1),transparent)',zIndex:2,pointerEvents:'none'}} />
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:60,
        background:'linear-gradient(-90deg,rgba(3,6,14,1),transparent)',zIndex:2,pointerEvents:'none'}} />
      {/* Scrolling content */}
      <div style={{
        display:'flex', whiteSpace:'nowrap',
        animation:'statusScroll 18s linear infinite',
        willChange:'transform',
      }}>
        {[msg, msg, msg].map((m,i)=>(
          <span key={i} style={{
            fontSize:9, fontFamily:"'DM Mono',monospace", letterSpacing:'.07em',
            paddingRight:80,
          }}>
            {m.split('·').map((part,j)=>(
              <span key={j}>
                {j>0 && <span style={{color:'var(--border3)',margin:'0 8px'}}>·</span>}
                <span style={{color: part.trim().startsWith('●') ? 'var(--yellow)' : 'var(--text3)'}}>
                  {part.trim()}
                </span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Trade ticker ──────────────────────────────────────────────────────────
function TradeTicker({trades}) {
  const rc = r => r==='take-profit'?'var(--green)':r?.includes('atr')||r==='momentum-reversal'?'var(--red)':r==='stagnation'||r==='profit-fading'?'var(--yellow)':'var(--text3)';
  if (!trades?.length) return (
    <div className="ticker-wrap">
      <div className="ticker-item" style={{color:'var(--text3)',fontStyle:'italic'}}>No trades yet — system watching for signals</div>
    </div>
  );
  const items  = [...trades].reverse().slice(0,50);
  const doubled= [...items,...items];
  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {doubled.map((t,i)=>(
          <div key={i} className="ticker-item">
            {t.auto && <span style={{color:'var(--accent)',fontSize:8,fontWeight:700,letterSpacing:'.05em'}}>BOT</span>}
            <span style={{color:t.action==='BUY'?'var(--green)':'var(--red)',fontWeight:700}}>{t.action}</span>
            <span style={{color:'var(--text)',fontWeight:600}}>{t.symbol}</span>
            <span style={{color:'var(--text2)'}}>{t.shares}@{fmtUSD(t.price)}</span>
            {t.pnl!=null && <span style={{color:t.pnl>=0?'var(--green)':'var(--red)',fontWeight:600}}>{t.pnl>=0?'+':''}{fmtUSD(t.pnl)}</span>}
            {t.reason && <span style={{fontSize:9,color:rc(t.reason)}}>[{t.reason}]</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hot stocks table ──────────────────────────────────────────────────────
function HotTable({data,quotes,selected,onSelect}) {
  const [tab,setTab] = useState('gainers');
  if (!data) return (
    <div style={{padding:'60px 0',textAlign:'center',color:'var(--text3)'}}>
      <div style={{fontSize:24,marginBottom:10}}>⏳</div>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:11}}>Fetching today's movers...</div>
    </div>
  );
  const TABS = [{k:'gainers',l:'TOP GAINERS',c:'var(--green)'},{k:'losers',l:'TOP LOSERS',c:'var(--red)'},{k:'active',l:'MOST ACTIVE',c:'var(--accent)'}];
  const rows = (data[tab]??[]).map(s=>{ const q=quotes[s.symbol]; return q?{...s,...q}:s; });
  return (
    <div className="card">
      <div style={{display:'flex',borderBottom:'1px solid var(--border)'}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            style={{flex:1,background:'none',border:'none',borderBottom:`2px solid ${tab===t.k?t.c:'transparent'}`,
              color:tab===t.k?t.c:'var(--text3)',padding:'10px 0',fontSize:10,letterSpacing:'.08em',
              fontFamily:"'DM Mono',monospace",cursor:'pointer',transition:'color .15s'}}>
            {t.l} ({data[t.k]?.length??0})
          </button>
        ))}
      </div>
      {/* Column headers */}
      <div style={{display:'grid',gridTemplateColumns:'64px 1fr 76px 68px 64px 52px',padding:'6px 14px',borderBottom:'1px solid var(--border)'}}>
        {['SYM','NAME','PRICE','CHG%','VOL','VOL×'].map(h=>(
          <div key={h} style={{fontSize:8,color:'var(--text3)',letterSpacing:'.1em'}}>{h}</div>
        ))}
      </div>
      <div style={{maxHeight:420,overflowY:'auto'}}>
        {rows.map(s=>{
          const up  = (s.changePct??0)>=0;
          const hot = (s.volRatio??0)>2;
          const sel = selected===s.symbol;
          return (
            <div key={s.symbol} className="rh" onClick={()=>onSelect(s.symbol)}
              style={{display:'grid',gridTemplateColumns:'64px 1fr 76px 68px 64px 52px',padding:'8px 14px',
                borderBottom:'1px solid var(--border)',background:sel?'var(--bg4)':'transparent',
                borderLeft:`2px solid ${sel?'var(--accent)':'transparent'}`}}>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:700,color:sel?'var(--accent)':'var(--text)'}}>
                {s.symbol}
              </div>
              <div style={{fontSize:10,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:8}}>
                {s.name}
              </div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11}}>${fmt(s.price)}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:600,color:up?'var(--green)':'var(--red)'}}>
                {up?'+':''}{fmt(s.changePct)}%
              </div>
              <div style={{fontSize:10,color:'var(--text3)',fontFamily:"'DM Mono',monospace"}}>{fmtVol(s.volume)}</div>
              <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:hot?'var(--accent)':(s.volRatio??0)>1.5?'var(--yellow)':'var(--text3)'}}>
                {s.volRatio?fmt(s.volRatio,1)+'×':'—'}{hot?' 🔥':''}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{padding:'7px 14px',fontSize:9,color:'var(--text3)',borderTop:'1px solid var(--border)'}}>
        🔥 Volume &gt;2× average · Yahoo Finance · refreshed every 5 min
      </div>
    </div>
  );
}

// ── Strategy modal ────────────────────────────────────────────────────────
function StrategyModal({onClose}) {
  return (
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.88)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={e=>e.stopPropagation()} className="card" style={{maxWidth:700,width:'100%',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{padding:'20px 28px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'var(--bg3)',zIndex:1}}>
          <span style={{fontFamily:"'Syne',sans-serif",fontSize:22,letterSpacing:'.12em',color:'var(--accent)'}}>STRATEGY REFERENCE</span>
          <button onClick={onClose} className="btn-ghost" style={{padding:'4px 10px'}}>✕ CLOSE</button>
        </div>
        <div style={{padding:'22px 28px'}}>
          {/* Config grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:24}}>
            {[
              {l:'POSITION SIZE',v:(POSITION_PCT*100)+'% portfolio',c:'var(--text)'},
              {l:'MAX POSITIONS',v:'cash-limited',c:'var(--text)'},
              {l:'TAKE PROFIT',  v:'+8%',c:'var(--green)'},
              {l:'STOP LOSS',    v:'1.5× ATR (2–8%)',c:'var(--red)'},
            ].map(x=>(
              <div key={x.l} className="card-sm" style={{padding:'10px 12px'}}>
                <Lbl>{x.l}</Lbl>
                <div style={{fontSize:12,fontWeight:600,color:x.c,fontFamily:"'DM Mono',monospace"}}>{x.v}</div>
              </div>
            ))}
          </div>

          <Lbl style={{marginBottom:8}}>ENTRY SCORING — BUY REQUIRES 5+ BULL POINTS (7+ IN BEAR REGIME)</Lbl>
          {[
            {pts:'+3',n:'Trend alignment (SMA 10/20/50)',d:'All MAs stacked upward. Primary gate — most powerful filter.'},
            {pts:'+2',n:'Regression slope 20-bar (R²>0.5)',d:'Linear regression on real 5-min bar history. R² quality check rejects noisy signals.'},
            {pts:'+2',n:'Momentum (5-bar + 10-bar ROC)',d:'5-bar >+0.3% AND 10-bar positive. Price must already be moving.'},
            {pts:'+2',n:'RSI full-range scoring',d:'50–60 = momentum sweet spot (+2). <30 = oversold bounce (+2). >70 = overbought (bear points).'},
            {pts:'+2',n:'MACD + zero-line cross',d:'Above zero + above signal line + histogram positive = full 2pts.'},
            {pts:'+1',n:'Bollinger band position',d:'Lower 25% of band = support bounce probability bonus.'},
            {pts:'+1',n:'Volume spike >1.5×',d:'Conviction behind the move.'},
            {pts:'+1',n:'Sector momentum',d:'Sector regression slope positive — market tailwind.'},
            {pts:'GATE',n:'News sentiment',d:'2+ bearish headlines → BUY suppressed for that symbol.'},
            {pts:'GATE',n:'Earnings guard',d:'No entries within 2 days of earnings — gaps blow through any stop-loss.'},
            {pts:'GATE',n:'Consecutive signal',d:'Signal must fire on 2 consecutive price updates (~30s apart). Eliminates single-bar false breakouts — two genuinely independent readings.'},
            {pts:'GATE',n:'Risk/reward check',d:'TP distance must be ≥ 2× ATR stop. Rejects bad risk/reward.'},
            {pts:'REGIME',n:'SPY regime filter',d:'Bear market detected → entry threshold raised from 5 to 7 pts. Defensive mode.'},
          ].map(x=>{
            const ptColor = x.pts==='REGIME'?'var(--blue)':x.pts==='GATE'?'var(--yellow)':x.pts==='+3'?'var(--green)':x.pts==='+2'?'#4ade80':'#a3e635';
            return (
              <div key={x.n} style={{display:'flex',gap:12,padding:'8px 0',borderBottom:'1px solid var(--border)',alignItems:'flex-start'}}>
                <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:ptColor,minWidth:44,paddingTop:1,fontWeight:700}}>{x.pts}</span>
                <div>
                  <div style={{fontSize:12,color:'var(--text)',marginBottom:2}}>{x.n}</div>
                  <div style={{fontSize:11,color:'var(--text3)',lineHeight:1.5}}>{x.d}</div>
                </div>
              </div>
            );
          })}

          <Lbl style={{marginTop:22,marginBottom:8}}>EXIT SYSTEM — 5 MODES, CHECKED EVERY 15s ON REAL PRICES ONLY</Lbl>
          {[
            {n:'Take-profit +8%',c:'var(--green)',d:'Hard ceiling — locks in gains regardless of momentum.'},
            {n:'ATR dynamic stop',c:'var(--red)',d:'1.5× ATR. Volatile stocks get more room (up to 8%). Quiet stocks tighter (min 2%).'},
            {n:'Momentum reversal',c:'var(--red)',d:'Slope turns negative + R²>0.5 confirms it\'s real. Exits before the hard stop is hit.'},
            {n:'Profit fading',c:'var(--yellow)',d:'Was profitable, slope now declining with R²>0.35. Locks partial gains before full reversal.'},
            {n:'Stagnation ±0.5%',c:'var(--yellow)',d:'8+ consecutive real-price ticks within ±0.5% AND R²<0.2. Capital idle — redeploy it.'},
          ].map(x=>(
            <div key={x.n} style={{display:'flex',gap:10,padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:x.c,marginTop:5,flexShrink:0}} />
              <div>
                <div style={{fontSize:12,color:x.c,fontWeight:600,marginBottom:2}}>{x.n}</div>
                <div style={{fontSize:11,color:'var(--text3)',lineHeight:1.5}}>{x.d}</div>
              </div>
            </div>
          ))}

          <div className="card-sm" style={{padding:'14px 16px',marginTop:20}}>
            <div style={{fontSize:11,color:'var(--blue)',fontWeight:600,marginBottom:10}}>CAPITAL & RISK RULES</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,fontSize:11,color:'var(--text3)',lineHeight:1.7}}>
              <div>2% of total portfolio per position. $10k = $200 max per trade.</div>
              <div>No hard position cap — bot enters any qualifying signal as long as cash covers the 2% position. Natural diversification through sizing.</div>
              <div>Bot only trades NYSE regular hours (9:30am–4pm ET, Mon–Fri).</div>
              <div>Zero simulated prices. Yahoo data unavailable = trading halted entirely.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [hotData,      setHotData]      = useState(null);
  const [hotSymbols,   setHotSymbols]   = useState(CORE_SYMBOLS);
  const [sectorScores, setSectorScores] = useState({});
  const [autoTrade,    setAutoTrade]    = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [tab,          setTab]          = useState('market');
  const [selected,     setSelected]     = useState('AAPL');
  const [qty,          setQty]          = useState(1);
  const [symSearch,    setSymSearch]    = useState('');

  const { watchlist, addSymbol, removeSymbol, moveSymbol, resetWatchlist } = useWatchlist();
  const { portfolio, executeBuy, executeSell, executeShort, executeCover, markPartialExit, tickPositions, recordEquity, resetPortfolio, resetCircuit } = usePortfolio();
  const allTrackedSymbols = [...new Set([...hotSymbols, ...watchlist])];
  const { bars, prices, quotes, isLive, marketStatus, loadHistory } = useMarketData(allTrackedSymbols);
  const { news, earnings, loading: newsLoading, refresh: refreshNews } = useNews(selected);
  const spyRegime  = useSpyRegime(bars);
  const { time: ctTime, date: ctDate } = useCTClock();
  const newsSent   = aggregateNewsSentiment(news);

  // Stable refs
  const portfolioRef = useRef(portfolio);
  const barsRef      = useRef(bars);
  const pricesRef    = useRef(prices);
  const sectorRef    = useRef(sectorScores);
  const regimeRef    = useRef(spyRegime);
  const newsRef      = useRef({});     // sym -> sentiment label
  const earningsRef  = useRef({});     // sym -> earnings obj
  const lastRawSig   = useRef({});
  portfolioRef.current = portfolio;
  barsRef.current      = bars;
  pricesRef.current    = prices;
  sectorRef.current    = sectorScores;
  regimeRef.current    = spyRegime;

  // Cache news/earnings sentiment for bot to read
  useEffect(() => { newsRef.current[selected] = newsSent.label; }, [newsSent.label, selected]);
  useEffect(() => { if (earnings) earningsRef.current[selected] = earnings; }, [earnings, selected]);

  // ── Hot stocks loader ────────────────────────────────────────────────
  const loadHot = useCallback(async () => {
    if (!getMarketStatus().isOpen) return;
    const data = await fetchHotStocks();
    if (data) {
      setHotData(data);
      setHotSymbols([...new Set([...CORE_SYMBOLS, ...getUniqueHotSymbols(data)])]);
    }
  }, []);

  useEffect(() => {
    loadHot();
    const id = setInterval(loadHot, 5*60*1000);
    return () => clearInterval(id);
  }, [loadHot]);

  // ── Live price ticks ─────────────────────────────────────────────────
  useEffect(() => {
    if (!marketStatus.isOpen || !isLive || !Object.keys(prices).length) return;
    recordEquity(prices);
    tickPositions(prices);
  }, [prices, marketStatus.isOpen, isLive]);

  // ── Sector momentum ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hotData || !Object.keys(bars).length) return;
    const groups = {};
    if (hotData.gainers?.length) groups['Gainers'] = hotData.gainers.map(s=>s.symbol);
    if (hotData.losers?.length)  groups['Losers']  = hotData.losers.map(s=>s.symbol);
    if (hotData.active?.length)  groups['Active']  = hotData.active.map(s=>s.symbol);
    if (Object.keys(groups).length) setSectorScores(sectorMomentum(groups, bars));
  }, [bars, hotData]);

  // ── Trajectory + risk exits (every 15s, real prices only) ───────────
  useEffect(() => {
    const id = setInterval(() => {
      if (!getMarketStatus().isOpen) return;
      const port = portfolioRef.current;
      const pxs  = pricesRef.current;
      const br   = barsRef.current;
      Object.entries(port.positions).forEach(([sym, pos]) => {
        const price = pxs[sym];
        if (!price) return;
        const pnlPct = (price - pos.avgCost) / pos.avgCost;

        // ① Partial exit at +5%: sell half, let rest ride
        if (!pos.partialExitDone && pnlPct >= PARTIAL_EXIT_PCT) {
          const halfShares = Math.max(1, Math.floor(pos.shares / 2));
          executeSell(sym, halfShares, price, true, 'partial-exit');
          markPartialExit(sym);
          toast('½ PARTIAL EXIT ' + sym + ' ' + fmtPct(pnlPct * 100) + ' — letting rest ride', 'success');
          return;
        }

        // ② Full take-profit at +8%
        if (pnlPct >= TAKE_PROFIT_PCT) {
          executeSell(sym, pos.shares, price, true, 'take-profit');
          toast('TAKE-PROFIT ' + sym + ' ' + fmtPct(pnlPct * 100), 'success');
          return;
        }

        // ③ ATR dynamic stop-loss
        const symBars = br[sym] ?? [];
        const atrPct  = atr(symBars, 14);
        const dynStop = atrPct ? Math.min(Math.max(atrPct * 1.5 / 100, .02), .08) : .04;
        if (pnlPct <= -dynStop) {
          executeSell(sym, pos.shares, price, true, 'atr-stop (' + (dynStop * 100).toFixed(1) + '%)');
          toast('ATR STOP ' + sym + ' ' + fmtPct(pnlPct * 100), 'error');
          return;
        }

        // ④⑤⑥ Trajectory analysis: momentum reversal, profit fading, stagnation
        const analysis = analysePosition({ entryPrice: pos.avgCost, recentBars: pos.priceHistory ?? [], atrPct });
        if (analysis.shouldExit) {
          executeSell(sym, pos.shares, price, true, analysis.reason);
          toast('EXIT [' + analysis.reason + '] ' + sym + ' ' + fmtPct(pnlPct * 100),
            analysis.urgency === 'immediate' ? 'error' : 'warn');
        }
      });

      // ── Short position exits ──────────────────────────────────────────
      Object.entries(port.shorts || {}).forEach(([sym, pos]) => {
        const price = pxs[sym];
        if (!price) return;
        const pnlPct = (pos.entryPrice - price) / pos.entryPrice; // positive when price falls

        // Partial cover at +5%
        if (!pos.partialExitDone && pnlPct >= PARTIAL_EXIT_PCT) {
          const halfShares = Math.max(1, Math.floor(pos.shares / 2));
          executeCover(sym, halfShares, price, true, 'partial-cover');
          markPartialExit(sym, 'short');
          toast('½ PARTIAL COVER ' + sym + ' ' + fmtPct(pnlPct * 100) + ' — letting rest ride', 'success');
          return;
        }
        // Full take-profit
        if (pnlPct >= TAKE_PROFIT_PCT) {
          executeCover(sym, pos.shares, price, true, 'take-profit');
          toast('SHORT TAKE-PROFIT ' + sym + ' ' + fmtPct(pnlPct * 100), 'success');
          return;
        }
        // Stop-loss (price went UP against us)
        const symBars = br[sym] ?? [];
        const atrPct  = atr(symBars, 14);
        const dynStop = atrPct ? Math.min(Math.max(atrPct * 1.5 / 100, .02), .08) : .04;
        if (pnlPct <= -dynStop) {
          executeCover(sym, pos.shares, price, true, 'atr-stop (' + (dynStop * 100).toFixed(1) + '%)');
          toast('SHORT ATR STOP ' + sym + ' ' + fmtPct(pnlPct * 100), 'error');
          return;
        }
        // Momentum analysis (short: bad if price starts rising)
        const analysis = analysePosition({ entryPrice: pos.entryPrice, recentBars: pos.priceHistory ?? [], atrPct });
        // For shorts, "momentum reversal" means price going UP — exit
        if (analysis.shouldExit && analysis.reason === 'momentum-reversal') {
          executeCover(sym, pos.shares, price, true, 'short-reversal');
          toast('SHORT REVERSAL ' + sym + ' ' + fmtPct(pnlPct * 100), 'warn');
        }
      });
    }, 15000);
    return () => clearInterval(id);
  }, []);

  // ── Auto-trade bot — fires on each real price update (every ~15s) ─────
  // Using prices as the trigger means:
  //   1. We never run on stale data (no wasted CPU)
  //   2. Consecutive signal gate is genuinely two independent price readings
  //   3. Cadence matches data freshness exactly
  const prevPricesRef = useRef({});
  useEffect(() => {
    if (!autoTrade) return;
    if (!getMarketStatus().isOpen) return;

    // Check that at least one price actually changed vs last evaluation
    const pxs = prices;
    const prev = prevPricesRef.current;
    const hasNewData = Object.entries(pxs).some(([sym, px]) => prev[sym] !== px);
    if (!hasNewData) return;
    prevPricesRef.current = { ...pxs };

    const port      = portfolioRef.current;
    const br        = barsRef.current;
    const sScores   = sectorRef.current;
    const regime    = regimeRef.current;
    // Time-of-day filter: raise bar during first/last 30 min of session (noisy opens/closes)
    const nyHour = new Date().toLocaleString('en-US',{timeZone:'America/New_York',hour:'numeric',hour12:false});
    const nyMin  = new Date().toLocaleString('en-US',{timeZone:'America/New_York',minute:'numeric'});
    const mins   = parseInt(nyHour)*60 + parseInt(nyMin);
    const isNoisyWindow = (mins < 10*60) || (mins >= 15*30 && mins < 10*60) ||
                          (mins >= 9*60+30 && mins < 10*60) || (mins >= 15*30);
    // 9:30–10:00 = first 30 min, 15:30–16:00 = last 30 min
    const openNoise  = mins >= 9*60+30 && mins < 10*60;
    const closeNoise = mins >= 15*60+30;
    const timeBoost  = (openNoise || closeNoise) ? 2 : 0;
    const threshold  = (regime === 'BEAR' ? 7 : 5) + timeBoost;

    // Circuit breaker — don't buy if portfolio is in drawdown protection mode
    if (port.circuitOpen) return;
    const positions = Object.keys(port.positions);
    const totalEquity = port.cash + positions.reduce(
      (s, sym) => s + port.positions[sym].shares * (pxs[sym] ?? port.positions[sym].avgCost), 0
    );

    hotSymbols.forEach(sym => {
      const symBars = br[sym];
      if (!symBars || symBars.length < 50) return;
      const closes  = symBars.map(b => b.close);
      const volumes = symBars.map(b => b.volume);
      const price   = pxs[sym];
      if (!price) return;

      if ((newsRef.current[sym] ?? 'neutral') === 'bearish') return;
      const earn = earningsRef.current[sym];
      if (earn?.isImminent) return;

      // Gap detection: skip if stock gapped >3% today (move already happened)
      const gap = detectGap(symBars);
      if (gap.gapUp   && true)  { /* suppress BUY on gap-up  */ }
      if (gap.gapDown && true)  { /* suppress SHORT on gap-down */ }

      const atrPct = atr(symBars, 14);
      const sector = hotData
        ? (Object.entries({ Gainers: hotData.gainers?.map(s => s.symbol) ?? [], Active: hotData.active?.map(s => s.symbol) ?? [] })
            .find(([, syms]) => syms.includes(sym))?.[0] ?? '')
        : '';
      const sScore = sScores[sector] ?? 0;
      const last   = lastRawSig.current[sym] ?? null;

      const { signal, rawSignal, confidence, bullScore, bearScore } = getSignal(closes, volumes, last, sScore, atrPct);
      lastRawSig.current[sym] = rawSignal;

      const posValue = Math.floor((totalEquity * POSITION_PCT) / price);
      const shares   = posValue;
      if (shares <= 0) return;

      // LONG entry: BUY signal, no gap-up trap
      const longPos = port.positions[sym];
      if (signal === 'BUY' && !longPos && !gap.gapUp && confidence >= 65 && bullScore >= threshold) {
        if (port.cash >= shares * price) executeBuy(sym, shares, price, true);
      }

      // SHORT entry: SELL signal confirmed, no gap-down trap, bear regime or neutral ok
      const shortPos = (port.shorts || {})[sym];
      const shortThreshold = regime === 'BULL' ? 8 : threshold; // harder to short in bull market
      if (signal === 'SELL' && !shortPos && !gap.gapDown && confidence >= 65 && bearScore >= shortThreshold) {
        const marginNeeded = shares * price * 1.5;
        if (port.cash >= marginNeeded) executeShort(sym, shares, price, true);
      }
    });
  }, [prices, autoTrade, hotSymbols, hotData]);

  // ── Derived data for selected symbol ────────────────────────────────
  const selBars    = bars[selected]??[];
  const selCloses  = selBars.map(b=>b.close);
  const selVols    = selBars.map(b=>b.volume);
  const selPrice   = prices[selected];
  const selQuote   = quotes[selected];
  const prevClose  = selBars.length>1 ? selBars[selBars.length-2]?.close : selPrice;
  const dayChg     = selPrice&&prevClose ? selPrice-prevClose : null;
  const dayChgPct  = selPrice&&prevClose ? (dayChg/prevClose)*100 : null;
  const atrPct     = atr(selBars,14);
  const dynStop    = atrPct ? Math.min(Math.max(atrPct*1.5/100,.02),.08) : .04;
  const sma10      = smaLast(selCloses,10);
  const sma20      = smaLast(selCloses,20);
  const sma50      = smaLast(selCloses,50);
  const rsiVal     = rsiLast(selCloses,14);
  const {macd:macdVal} = macdLast(selCloses);
  const mom10      = momentum(selCloses,10);
  const slope20    = regressionSlope(selCloses,20);
  const selSector  = hotData ? (Object.entries({Gainers:hotData.gainers?.map(s=>s.symbol)??[],Active:hotData.active?.map(s=>s.symbol)??[]}).find(([,syms])=>syms.includes(selected))?.[0]??'') : '';
  const sScore     = sectorScores[selSector]??0;
  const lastSig    = lastRawSig.current[selected]??null;
  const {signal,rawSignal,reason,confidence,bullScore,bearScore} = getSignal(selCloses,selVols,lastSig,sScore,atrPct);

  // ── Portfolio metrics ────────────────────────────────────────────────
  const totalPosValue = Object.entries(portfolio.positions).reduce((s,[sym,pos])=>s+pos.shares*(prices[sym]??pos.avgCost),0);
  const totalEquity   = portfolio.cash + totalPosValue;
  const totalReturn   = totalEquity - STARTING_CASH;
  const totalRetPct   = (totalReturn/STARTING_CASH)*100;
  const completed     = portfolio.trades.filter(t=>t.pnl!=null);
  const wins          = completed.filter(t=>t.pnl>0);
  const losses        = completed.filter(t=>t.pnl<=0);
  const winRate       = completed.length>0 ? (wins.length/completed.length)*100 : null;
  const avgWin        = wins.length>0   ? wins.reduce((s,t)=>s+t.pnl,0)/wins.length     : null;
  const avgLoss       = losses.length>0 ? losses.reduce((s,t)=>s+t.pnl,0)/losses.length : null;
  const eqColor       = totalReturn>=0 ? 'var(--green)' : 'var(--red)';
  const openPos       = portfolio.positions[selected];
  const openCount     = Object.keys(portfolio.positions).length;

  function handleBuy() {
    if (!marketStatus.isOpen) return toast('Market is closed','error');
    if (!selPrice) return toast('No live price for '+selected,'error');
    const n = parseInt(qty)||0;
    if (n<=0) return toast('Invalid quantity','error');
    if (selPrice*n > portfolio.cash) return toast('Insufficient cash','error');
    executeBuy(selected,n,selPrice,false);
    toast('BUY '+n+'× '+selected+' @ '+fmtUSD(selPrice));
  }
  function handleSell() {
    if (!marketStatus.isOpen) return toast('Market is closed','error');
    if (!selPrice) return toast('No live price','error');
    const n = parseInt(qty)||0;
    if (!openPos || openPos.shares<n) return toast('Not enough shares','error');
    executeSell(selected,n,selPrice,false,'manual');
    toast('SELL '+n+'× '+selected+' @ '+fmtUSD(selPrice));
  }

  // ── Helper: compute signal for any symbol (used by watchlist) ─────────
  function getSignalForSym(sym) {
    const symBars = bars[sym];
    if (!symBars || symBars.length < 50) return null;
    const closes  = symBars.map(b => b.close);
    const volumes = symBars.map(b => b.volume);
    const last    = lastRawSig.current[sym] ?? null;
    const symAtr  = atr(symBars, 14);
    return getSignal(closes, volumes, last, 0, symAtr);
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div style={{height:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <ToastContainer />
      {showStrategy && <StrategyModal onClose={()=>setShowStrategy(false)} />}

      {/* ═══ HEADER ══════════════════════════════════════════════════════ */}
      <header className="app-header">

        {/* ── ZONE 1: Logo + Brand ── */}
        <div style={{display:'flex',alignItems:'center',gap:10,minWidth:200}}>
          {/* SVG Logo — fist/atom, steel blue + white */}
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Hub circle */}
            <circle cx="18" cy="18" r="4.5" fill="#4d87f6" opacity=".9"/>
            <circle cx="18" cy="18" r="3" fill="#e0edf8"/>
            {/* 4 arms */}
            <line x1="18" y1="13.5" x2="18" y2="4"  stroke="#4d87f6" strokeWidth="2" strokeLinecap="round"/>
            <line x1="18" y1="22.5" x2="18" y2="32" stroke="#4d87f6" strokeWidth="2" strokeLinecap="round"/>
            <line x1="13.5" y1="18" x2="4"  y2="18" stroke="#4d87f6" strokeWidth="2" strokeLinecap="round"/>
            <line x1="22.5" y1="18" x2="32" y2="18" stroke="#4d87f6" strokeWidth="2" strokeLinecap="round"/>
            {/* 4 endpoint fist shapes (simplified knuckle blocks) */}
            {/* TOP */}
            <rect x="14.5" y="1" width="7" height="4.5" rx="1.5" fill="#94b8d8"/>
            <rect x="15"   y="2" width="2" height="3.5" rx=".7" fill="#e0edf8" opacity=".7"/>
            <rect x="17.5" y="2" width="2" height="3.5" rx=".7" fill="#e0edf8" opacity=".7"/>
            <rect x="20"   y="2" width="1.5" height="3.5" rx=".7" fill="#e0edf8" opacity=".5"/>
            {/* BOTTOM */}
            <rect x="14.5" y="30.5" width="7" height="4.5" rx="1.5" fill="#94b8d8"/>
            <rect x="15"   y="31" width="2" height="3.5" rx=".7" fill="#e0edf8" opacity=".7"/>
            <rect x="17.5" y="31" width="2" height="3.5" rx=".7" fill="#e0edf8" opacity=".7"/>
            <rect x="20"   y="31" width="1.5" height="3.5" rx=".7" fill="#e0edf8" opacity=".5"/>
            {/* LEFT */}
            <rect x="1" y="14.5" width="4.5" height="7" rx="1.5" fill="#94b8d8"/>
            <rect x="1.5" y="15" width="3.5" height="2" rx=".7" fill="#e0edf8" opacity=".7"/>
            <rect x="1.5" y="17.5" width="3.5" height="2" rx=".7" fill="#e0edf8" opacity=".7"/>
            <rect x="1.5" y="20"   width="3.5" height="1.5" rx=".7" fill="#e0edf8" opacity=".5"/>
            {/* RIGHT */}
            <rect x="30.5" y="14.5" width="4.5" height="7" rx="1.5" fill="#94b8d8"/>
            <rect x="31" y="15" width="3.5" height="2" rx=".7" fill="#e0edf8" opacity=".7"/>
            <rect x="31" y="17.5" width="3.5" height="2" rx=".7" fill="#e0edf8" opacity=".7"/>
            <rect x="31" y="20"   width="3.5" height="1.5" rx=".7" fill="#e0edf8" opacity=".5"/>
            {/* Wing accents on diagonals */}
            <path d="M11 11 L6 6 L9 11 L6 9 Z"  fill="#4d87f6" opacity=".5"/>
            <path d="M25 11 L30 6 L27 11 L30 9 Z" fill="#4d87f6" opacity=".5"/>
            <path d="M11 25 L6 30 L9 25 L6 27 Z"  fill="#4d87f6" opacity=".5"/>
            <path d="M25 25 L30 30 L27 25 L30 27 Z" fill="#4d87f6" opacity=".5"/>
          </svg>
          {/* Brand text */}
          <div>
            <div className="brand-wrap">
              <span className="brand-name">ARIMELTONA</span>
            </div>
          </div>
        </div>

        {/* ── ZONE 2: Date + Clock (dead center) ── */}
        <div style={{position:'absolute',left:'50%',transform:'translateX(-50%)',
          display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
          <div style={{fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace",
            letterSpacing:'.12em'}}>{ctDate}</div>
          <div style={{fontSize:18,fontWeight:700,color:'var(--text)',fontFamily:"'DM Mono',monospace",
            letterSpacing:'.04em',lineHeight:1,
            textShadow:'0 0 20px rgba(77,135,246,.25)'}}>
            {ctTime}
            <span style={{fontSize:9,color:'var(--text3)',marginLeft:5,letterSpacing:'.1em',fontWeight:400}}>CT</span>
          </div>
        </div>

        {/* ── ZONE 3: Controls + Portfolio ── */}
        <div style={{display:'flex',alignItems:'stretch',gap:0,height:'100%'}}>

          {/* Regime + data status */}
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 14px',
            borderLeft:'1px solid var(--border2)',borderRight:'1px solid var(--border2)'}}>
            <RegimePill regime={spyRegime} />
            <span style={{display:'flex',alignItems:'center',gap:4,fontSize:8,fontFamily:"'DM Mono',monospace",
              color:isLive?'var(--green)':'var(--text3)',letterSpacing:'.06em'}}>
              <span style={{fontSize:6,animation:isLive?'pulseDot 2s ease-in-out infinite':'none',lineHeight:1}}>●</span>
              {isLive?'LIVE':'STALE'}
            </span>
          </div>

          {/* Bot toggle */}
          <div style={{display:'flex',alignItems:'center',gap:7,padding:'0 14px',
            borderRight:'1px solid var(--border2)'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:1}}>
              <span style={{fontSize:7,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:'.1em'}}>AUTO BOT</span>
              <span style={{fontSize:7,fontFamily:"'DM Mono',monospace",letterSpacing:'.06em',
                color:autoTrade&&marketStatus.isOpen?'var(--accent)':autoTrade?'var(--yellow)':'var(--text4)'}}>
                {autoTrade&&marketStatus.isOpen?'SCANNING':autoTrade?'PAUSED':'OFF'}
              </span>
            </div>
            <button className={`bot-toggle ${autoTrade?'on':'off'}`}
              onClick={()=>{if(!marketStatus.isOpen&&!autoTrade) return toast('Market closed — cannot enable bot','warn'); setAutoTrade(p=>!p);}}>
              <span className="bot-knob" />
            </button>
          </div>

          {/* Portfolio value */}
          <div style={{display:'flex',flexDirection:'column',justifyContent:'center',
            padding:'0 14px',borderRight:'1px solid var(--border2)',gap:1}}>
            <div style={{fontSize:7,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:'.14em'}}>PORTFOLIO</div>
            <div style={{fontSize:16,fontWeight:700,color:eqColor,fontFamily:"'DM Mono',monospace",lineHeight:1}}>
              {fmtUSD(totalEquity)}
            </div>
            <div style={{fontSize:8,color:eqColor,fontFamily:"'DM Mono',monospace",opacity:.7}}>
              {fmtPct(totalRetPct)}
            </div>
          </div>

          {/* Actions group */}
          <div style={{display:'flex',flexDirection:'column',justifyContent:'center',
            padding:'0 10px',gap:4}}>
            <button className="btn-ghost" onClick={()=>setShowStrategy(true)}
              style={{fontSize:7,letterSpacing:'.1em',padding:'3px 8px',color:'var(--text3)',
                display:'block',textAlign:'center'}}>
              STRATEGY
            </button>
            <div style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{fontSize:7,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:'.06em'}}>
                PAPER TRADER
              </span>
              {atrPct && <>
                <span className="pill pill-red" style={{fontSize:7,padding:'1px 5px'}}>SL {(dynStop*100).toFixed(1)}%</span>
                <span className="pill pill-green" style={{fontSize:7,padding:'1px 5px'}}>TP +8%</span>
              </>}
            </div>
          </div>

          {/* Utility icons */}
          <div style={{display:'flex',alignItems:'center',gap:2,padding:'0 8px',
            borderLeft:'1px solid var(--border2)'}}>
            <button title="Export postmortem"
              onClick={()=>{ exportPostmortem(portfolio, prices); toast('Postmortem saved','success'); }}
              style={{background:'rgba(245,158,11,.05)',border:'1px solid rgba(245,158,11,.18)',
                borderRadius:4,padding:'5px 8px',color:'var(--accent)',fontSize:10,cursor:'pointer',
                transition:'all .15s',lineHeight:1}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(245,158,11,.12)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(245,158,11,.05)'}}>
              ⬇
            </button>
            <button title="Reset portfolio"
              onClick={()=>{if(confirm('Reset portfolio to $10,000?')) resetPortfolio();}}
              style={{background:'none',border:'1px solid var(--border2)',borderRadius:4,
                padding:'5px 8px',color:'var(--text4)',fontSize:12,cursor:'pointer',
                transition:'all .15s',lineHeight:1}}
              onMouseEnter={e=>{e.currentTarget.style.color='var(--red)';e.currentTarget.style.borderColor='rgba(239,68,97,.3)'}}
              onMouseLeave={e=>{e.currentTarget.style.color='var(--text4)';e.currentTarget.style.borderColor='var(--border2)'}}>
              ↺
            </button>
          </div>
        </div>

      </header>

      <ClosedBanner status={marketStatus} />

      {/* ═══ CIRCUIT BREAKER BANNER ══════════════════════════════════════ */}
      {portfolio.circuitOpen && (
        <div style={{background:'rgba(240,75,106,.07)',borderBottom:'1px solid rgba(240,75,106,.25)',
          padding:'7px 22px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:12,color:'var(--red)'}}>⛔</span>
            <span style={{fontSize:10,color:'var(--red)',fontFamily:"'DM Mono',monospace",fontWeight:600,letterSpacing:'.06em'}}>
              CIRCUIT BREAKER OPEN
            </span>
            <span style={{fontSize:10,color:'var(--text3)'}}>
              Portfolio dropped {(DRAWDOWN_LIMIT*100).toFixed(0)}% from peak · bot buys paused · manual trading still active
            </span>
          </div>
          <button onClick={resetCircuit} className="btn-ghost" style={{fontSize:9,color:'var(--red)',borderColor:'rgba(240,75,106,.3)'}}>
            RESET & RESUME
          </button>
        </div>
      )}

      <TradeTicker trades={portfolio.trades} />

      {/* ═══ BODY ════════════════════════════════════════════════════════ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 310px',flex:1,minHeight:0,overflow:'hidden'}}>

        {/* ═══ LEFT ════════════════════════════════════════════════════ */}
        <div style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>

          {/* Stats row — compact bar */}
          <div style={{padding:'10px 16px 0',flexShrink:0}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:6,marginBottom:8}}>
              <StatCard label="CASH"          value={fmtUSD(portfolio.cash)} accent="var(--blue)" />
              <StatCard label="TOTAL RETURN"  value={fmtPct(totalRetPct)} sub={fmtUSD(totalReturn)} color={eqColor} accent={eqColor} />
              <StatCard label="WIN RATE"      value={winRate!=null?winRate.toFixed(0)+'%':'—'} sub={completed.length+' closed'} color={winRate>=50?'var(--green)':winRate!=null?'var(--red)':'var(--text)'} />
              <StatCard label="PROFIT FACTOR" value={avgWin&&avgLoss?Math.abs(avgWin/avgLoss).toFixed(2):'—'} color={avgWin&&avgLoss?Math.abs(avgWin/avgLoss)>1?'var(--green)':'var(--red)':'var(--text)'} />
              <StatCard label="POSITIONS"     value={String(openCount)} sub={fmtUSD(totalPosValue)+' · '+(totalPosValue/totalEquity*100).toFixed(0)+'% deployed'} />
              <StatCard label="EQUITY"        value={fmtUSD(totalEquity)} color={eqColor} accent={eqColor} />
            </div>

            {/* Equity sparkline */}
            {portfolio.equityHistory.length > 4 && (
              <div className="card" style={{padding:'7px 12px',marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                  <Lbl style={{marginBottom:0}}>EQUITY CURVE</Lbl>
                  <span style={{fontSize:10,color:eqColor,fontFamily:"'DM Mono',monospace"}}>{fmtPct(totalRetPct)}</span>
                </div>
                <ResponsiveContainer width="100%" height={56}>
                  <AreaChart data={portfolio.equityHistory.slice(-300)}>
                    <defs>
                      <linearGradient id="eqg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={eqColor} stopOpacity={.28} />
                        <stop offset="100%" stopColor={eqColor} stopOpacity={.02} />
                      </linearGradient>
                    </defs>
                    <XAxis hide /><YAxis hide domain={['auto','auto']} />
                    <ReferenceLine y={STARTING_CASH} stroke="var(--border2)" strokeDasharray="3 3" />
                    <Tooltip formatter={v=>[fmtUSD(v),'Equity']} contentStyle={{background:'var(--bg3)',border:'1px solid var(--border)',fontSize:10}} />
                    <Area dataKey="value" stroke={eqColor} strokeWidth={1.5} fill="url(#eqg)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{flexShrink:0}}>
            <div className="tabs" style={{padding:'0 16px'}}>
              {[
                {k:'market',      l:'MARKET'},
                {k:'hot',         l:'MOVERS'},
                {k:'watchlist',   l:'WATCHLIST'},
                {k:'positions',   l:'POSITIONS'},
                {k:'trades',      l:'TRADE LOG'},
                {k:'performance', l:'ANALYTICS'},
                {k:'backtest',    l:'BACKTEST'},
                {k:'news',        l:'WORLD NEWS'},
                {k:'guide',       l:'HOW IT WORKS'},
              ].map(t=>(
                <button key={t.k} className={`tab ${tab===t.k?'active':''}`} onClick={()=>setTab(t.k)}>{t.l}</button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{flex:1,overflow:tab==='market'?'hidden':'auto',padding:tab==='market'?'12px 16px 8px':'12px 16px 40px',display:'flex',flexDirection:'column'}}>

            {/* ══ MARKET TAB ════════════════════════════════════════════ */}
            {tab==='market' && (
              <div className="fade-up" style={{display:'flex',flexDirection:'column',gap:0,flex:1,minHeight:0,overflow:'hidden'}}>

                {/* ── Row 1: Symbol search bar (full width, always works) ── */}
                <div style={{position:'relative',marginBottom:10}}>
                  <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',
                    color:'var(--text3)',fontSize:13,pointerEvents:'none',zIndex:1}}>⌕</span>
                  <input
                    value={symSearch}
                    onChange={e=>setSymSearch(e.target.value.toUpperCase().replace(/[^A-Z.]/g,''))}
                    onKeyDown={e=>{
                      if(e.key==='Enter'&&symSearch.trim()){
                        const sym=symSearch.trim();
                        setSelected(sym); setSymSearch(''); loadHistory(sym);
                      }
                      if(e.key==='Escape') setSymSearch('');
                    }}
                    placeholder="Search any symbol — NVDA, TSLA, AAPL, SPY... press Enter to load"
                    maxLength={8}
                    style={{
                      width:'100%', background:'var(--bg2)',
                      border:'1px solid var(--border2)', borderRadius:'var(--r-md)',
                      padding:'9px 14px 9px 34px',
                      color:'var(--text)', fontFamily:"'DM Mono',monospace",
                      fontSize:12, outline:'none', transition:'border-color .15s, box-shadow .15s',
                    }}
                    onFocus={e=>{e.target.style.borderColor='var(--accent)';e.target.style.boxShadow='0 0 0 2px rgba(245,158,11,.08)'}}
                    onBlur={e=>{e.target.style.borderColor='var(--border2)';e.target.style.boxShadow='none'}}
                  />
                  {/* Dropdown */}
                  {symSearch.length>0 && (
                    <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,
                      background:'var(--bg4)',border:'1px solid var(--border2)',borderRadius:8,
                      zIndex:200,boxShadow:'0 16px 48px rgba(0,0,0,.7)',overflow:'hidden',maxHeight:260,overflowY:'auto'}}>
                      {[...new Set([...watchlist,...hotSymbols,...Object.keys(bars)])].filter(s=>s.startsWith(symSearch)).slice(0,8).map(sym=>{
                        const q=quotes[sym]; const chg=q?.changePct??null;
                        return (
                          <div key={sym} className="rh"
                            onClick={()=>{setSelected(sym);setSymSearch('');loadHistory(sym);}}
                            style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                              padding:'9px 14px',borderBottom:'1px solid var(--border)',cursor:'pointer'}}>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              <span style={{fontFamily:"'DM Mono',monospace",fontSize:12,fontWeight:700,color:'var(--text)',minWidth:52}}>{sym}</span>
                              {q?.name && <span style={{fontSize:10,color:'var(--text3)'}}>{q.name.slice(0,28)}</span>}
                            </div>
                            <div style={{display:'flex',alignItems:'center',gap:10}}>
                              {q?.price && <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:'var(--text2)'}}>${q.price.toFixed(2)}</span>}
                              {chg!=null && <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,
                                color:chg>=0?'var(--green)':'var(--red)',minWidth:52,textAlign:'right'}}>
                                {chg>=0?'+':''}{chg.toFixed(2)}%
                              </span>}
                              {watchlist.includes(sym) && <span style={{fontSize:10,color:'var(--accent)'}}>★</span>}
                            </div>
                          </div>
                        );
                      })}
                      <div className="rh"
                        onClick={()=>{setSelected(symSearch);setSymSearch('');loadHistory(symSearch);}}
                        style={{padding:'9px 14px',fontSize:11,color:'var(--accent)',cursor:'pointer',
                          fontFamily:"'DM Mono',monospace",borderTop:'1px solid var(--border2)',
                          display:'flex',alignItems:'center',gap:8}}>
                        <span style={{opacity:.5}}>↩</span> Load "{symSearch}" directly from Yahoo Finance
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Row 2: Stock header — Google Finance style ── */}
                <div style={{
                  background:'var(--bg2)', border:'1px solid var(--border)',
                  borderRadius:'var(--r-lg)', marginBottom:10, overflow:'hidden',
                }}>
                  {/* Name row */}
                  <div style={{
                    padding:'12px 16px 8px',
                    borderBottom:'1px solid var(--border)',
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                  }}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                          <span style={{fontSize:16,fontWeight:600,color:'var(--text)',letterSpacing:'-.01em',fontFamily:"'Outfit',sans-serif"}}>
                            {selQuote?.name || selected}
                          </span>
                          <span style={{fontSize:11,color:'var(--text3)',fontFamily:"'DM Mono',monospace",fontWeight:600}}>
                            ({selected})
                          </span>
                          <button
                            onClick={()=>watchlist.includes(selected)?removeSymbol(selected):addSymbol(selected)}
                            style={{background:'none',border:'none',cursor:'pointer',fontSize:14,
                              color:watchlist.includes(selected)?'var(--accent)':'var(--text3)',
                              transition:'color .2s',lineHeight:1,padding:0}}
                            title={watchlist.includes(selected)?'Remove from watchlist':'Add to watchlist'}>
                            {watchlist.includes(selected)?'★':'☆'}
                          </button>
                          {earnings && !earnings.isPast && <EarningsBadge earnings={earnings} />}
                        </div>
                        <div style={{fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:'.08em'}}>
                          {selQuote?.exchange || 'NASDAQ'} · {selQuote?.currency || 'USD'} · Real-time data via Yahoo Finance
                        </div>
                      </div>
                    </div>
                    {/* Signal badge — right of name */}
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:5}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <Sig s={signal} />
                        <span style={{fontSize:10,color:'var(--text3)',fontFamily:"'DM Mono',monospace"}}>{confidence}%</span>
                        {rawSignal!==signal && rawSignal!=='HOLD' && (
                          <span style={{fontSize:8,color:'var(--yellow)',fontFamily:"'DM Mono',monospace"}}>⏳ 2nd {rawSignal} pending</span>
                        )}
                      </div>
                      <div style={{display:'flex',gap:4,alignItems:'center',fontSize:8,fontFamily:"'DM Mono',monospace"}}>
                        <span style={{color:'var(--green)',minWidth:22,textAlign:'right'}}>▲ {bullScore}</span>
                        <div style={{width:52,height:3,background:'var(--border2)',borderRadius:2,overflow:'hidden'}}>
                          <div style={{height:'100%',width:(bullScore/11*100)+'%',background:'var(--green)',borderRadius:2}} />
                        </div>
                        <div style={{width:52,height:3,background:'var(--border2)',borderRadius:2,overflow:'hidden'}}>
                          <div style={{height:'100%',width:(bearScore/11*100)+'%',background:'var(--red)',borderRadius:2}} />
                        </div>
                        <span style={{color:'var(--red)',minWidth:22}}>▼ {bearScore}</span>
                      </div>
                      {spyRegime==='BEAR' && <span style={{fontSize:8,color:'var(--red)',fontFamily:"'DM Mono',monospace"}}>⚠ BEAR market — threshold 7pts</span>}
                    </div>
                  </div>

                  {/* Price row */}
                  <div style={{padding:'12px 16px 10px',display:'flex',alignItems:'flex-end',gap:20,flexWrap:'wrap'}}>
                    {/* Big price — Outfit font, tabular nums, no DM Mono weirdness */}
                    <span style={{
                      fontFamily:"'Outfit',sans-serif",
                      fontVariantNumeric:'tabular-nums',
                      fontSize:40, fontWeight:700, lineHeight:1,
                      letterSpacing:'-.02em',
                      color: selPrice ? (dayChg!=null&&dayChg<0 ? 'var(--red)' : 'var(--text)') : 'var(--text3)',
                    }}>
                      {selPrice ? '$'+selPrice.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}
                    </span>
                    {/* Change */}
                    {dayChg!=null && (
                      <div style={{display:'flex',alignItems:'baseline',gap:6,paddingBottom:3}}>
                        <span style={{
                          fontFamily:"'Outfit',sans-serif", fontVariantNumeric:'tabular-nums',
                          fontSize:20, fontWeight:600, lineHeight:1,
                          color:dayChg>=0?'var(--green)':'var(--red)',
                        }}>
                          {dayChg>=0?'+':''}{dayChg.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
                        </span>
                        <span style={{
                          fontFamily:"'Outfit',sans-serif", fontVariantNumeric:'tabular-nums',
                          fontSize:16, fontWeight:500,
                          color:dayChg>=0?'var(--green)':'var(--red)', opacity:.85,
                        }}>
                          ({dayChg>=0?'+':''}{dayChgPct?.toFixed(2)}%)
                        </span>
                      </div>
                    )}
                    {/* Close/live label */}
                    <div style={{paddingBottom:4}}>
                      <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",
                        color: marketStatus.isOpen ? 'var(--green)' : 'var(--text3)',
                        background: marketStatus.isOpen ? 'var(--green-dim)' : 'var(--bg4)',
                        border: `1px solid ${marketStatus.isOpen ? 'var(--green-border)' : 'var(--border2)'}`,
                        borderRadius:3, padding:'2px 7px', letterSpacing:'.06em'}}>
                        {marketStatus.isOpen ? '● LIVE' : 'AT CLOSE'}
                      </span>
                    </div>
                  </div>

                  {/* OHLCV + Indicator strip */}
                  <div style={{
                    display:'flex', overflowX:'auto',
                    borderTop:'1px solid var(--border)',
                  }}>
                    {/* OHLCV group */}
                    {selQuote && [
                      {k:'OPEN',   v:selQuote.open?.toFixed(2)??'—', c:'var(--text2)'},
                      {k:'HIGH',   v:selQuote.high?.toFixed(2)??'—', c:'var(--green)'},
                      {k:'LOW',    v:selQuote.low?.toFixed(2)??'—',  c:'var(--red)'},
                      {k:'VOLUME', v:fmtVol(selQuote.volume),        c:'var(--text2)'},
                      ...(selQuote.volRatio?[{k:'VOL RATIO',v:selQuote.volRatio.toFixed(1)+'×',c:selQuote.volRatio>1.5?'var(--accent)':'var(--text3)'}]:[]),
                    ].map((x,i)=>(
                      <div key={x.k} style={{padding:'6px 14px',flexShrink:0,
                        borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:2}}>
                        <div style={{fontSize:7,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:'.1em'}}>{x.k}</div>
                        <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,color:x.c}}>{x.v}</div>
                      </div>
                    ))}
                    {/* Divider */}
                    {selQuote && <div style={{width:1,background:'var(--border2)',margin:'6px 0',flexShrink:0}} />}
                    {/* Technical indicators */}
                    {[
                      {k:'RSI',    v:rsiVal!=null?rsiVal.toFixed(0):'—',
                        c:rsiVal>=70?'var(--red)':rsiVal<30?'var(--green)':rsiVal>=50?'var(--text2)':'var(--text3)'},
                      {k:'MACD',   v:macdVal!=null?macdVal.toFixed(3):'—', c:macdVal>0?'var(--green)':'var(--red)'},
                      {k:'MOM',    v:mom10!=null?(mom10>=0?'+':'')+mom10.toFixed(1)+'%':'—',
                        c:mom10>0.3?'var(--green)':mom10<-0.3?'var(--red)':'var(--text2)'},
                      {k:'SMA10',  v:sma10!=null?sma10.toFixed(2):'—', c:'var(--text2)'},
                      {k:'SMA20',  v:sma20!=null?sma20.toFixed(2):'—', c:'var(--text2)'},
                      {k:'SMA50',  v:sma50!=null?sma50.toFixed(2):'—', c:'var(--text2)'},
                      {k:'ATR',    v:atrPct!=null?atrPct.toFixed(2)+'%':'—', c:'var(--text2)'},
                      {k:'STOP',   v:atrPct?'-'+(dynStop*100).toFixed(1)+'%':'—', c:'var(--red)'},
                      {k:'TARGET', v:'+8.0%', c:'var(--green)'},
                      {k:'SLOPE',  v:slope20!=null?(slope20>=0?'+':'')+slope20.toFixed(3)+'%':'—',
                        c:slope20>0.05?'var(--green)':slope20<-0.05?'var(--red)':'var(--text2)'},
                      {k:'REGIME', v:spyRegime,
                        c:spyRegime==='BULL'?'var(--green)':spyRegime==='BEAR'?'var(--red)':'var(--text3)'},
                      ...(selBars.length>5?[{
                        k:'GAP', v:(()=>{const g=detectGap(selBars);return g.gapPct?(g.gapPct>=0?'+':'')+g.gapPct.toFixed(1)+'%':'—'})(),
                        c:(()=>{const g=detectGap(selBars);return g.gapUp?'var(--yellow)':g.gapDown?'var(--red)':'var(--text2)'})(),
                      }]:[]),
                    ].map((x,i,arr)=>(
                      <div key={x.k} style={{
                        padding:'6px 14px', flexShrink:0,
                        borderRight: i<arr.length-1?'1px solid var(--border)':'none',
                        display:'flex', flexDirection:'column', gap:2,
                      }}>
                        <div style={{fontSize:7,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:'.1em'}}>{x.k}</div>
                        <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",fontWeight:600,color:x.c||'var(--text2)'}}>{x.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Row 3: Chart + Right panel (signal top, news bottom) ── */}
                <div className="market-split" style={{flex:1,minHeight:0}}>

                  {/* Chart — full height, with built-in timeframe tabs */}
                  <div style={{
                    overflow:'hidden', display:'flex', flexDirection:'column',
                    background:'var(--bg2)', border:'1px solid var(--border)',
                    borderRadius:'var(--r-lg)',
                  }}>
                    {selBars.length>0
                      ? <Chart bars={selBars} symbol={selected} />
                      : <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',
                          justifyContent:'center',gap:10,color:'var(--text3)',padding:40}}>
                          <span style={{fontSize:32,opacity:.2}}>📈</span>
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:'.08em'}}>
                            Search a symbol above and press Enter
                          </span>
                        </div>
                    }
                  </div>

                  {/* Right panel: Signal (top 50%) + News (bottom 50%) */}
                  <div style={{display:'flex',flexDirection:'column',gap:10,overflow:'hidden',minHeight:0}}>

                    {/* ── Signal score card ── */}
                    <div style={{
                      flex:1, minHeight:0, overflow:'hidden',
                      background:'var(--bg2)', border:'1px solid var(--border)',
                      borderRadius:'var(--r-lg)', display:'flex', flexDirection:'column',
                    }}>
                      {/* Header */}
                      <div style={{padding:'9px 12px',borderBottom:'1px solid var(--border)',
                        display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
                        <span style={{fontSize:8,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:'.14em'}}>SIGNAL ANALYSIS</span>
                        <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",color:'var(--accent)',fontWeight:700}}>{selected}</span>
                      </div>

                      {/* Signal + confidence */}
                      <div style={{padding:'12px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                          <span className={`sig sig-${signal}`} style={{fontSize:12,padding:'5px 14px'}}>{signal}</span>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontSize:18,fontWeight:700,color:'var(--text)',fontFamily:"'DM Mono',monospace",lineHeight:1}}>{confidence}%</div>
                            <div style={{fontSize:8,color:'var(--text3)',letterSpacing:'.1em'}}>CONFIDENCE</div>
                          </div>
                        </div>
                        {rawSignal!==signal && rawSignal!=='HOLD' && (
                          <div style={{fontSize:9,color:'var(--yellow)',fontFamily:"'DM Mono',monospace",
                            background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.15)',
                            borderRadius:4,padding:'4px 8px',marginBottom:6}}>
                            ⏳ Awaiting 2nd {rawSignal} confirmation
                          </div>
                        )}
                        <div style={{fontSize:10,color:'var(--text3)',lineHeight:1.6}}>{reason}</div>
                      </div>

                      {/* Bull vs Bear score bars */}
                      <div style={{padding:'10px 12px',flexShrink:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                          <span style={{fontSize:8,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:'.1em',minWidth:28}}>BULL</span>
                          <div style={{flex:1,height:4,background:'var(--border2)',borderRadius:2,overflow:'hidden'}}>
                            <div style={{height:'100%',width:(bullScore/11*100)+'%',background:'var(--green)',borderRadius:2,transition:'width .4s ease'}} />
                          </div>
                          <span style={{fontSize:9,color:'var(--green)',fontFamily:"'DM Mono',monospace",fontWeight:600,minWidth:16,textAlign:'right'}}>{bullScore}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:8,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:'.1em',minWidth:28}}>BEAR</span>
                          <div style={{flex:1,height:4,background:'var(--border2)',borderRadius:2,overflow:'hidden'}}>
                            <div style={{height:'100%',width:(bearScore/11*100)+'%',background:'var(--red)',borderRadius:2,transition:'width .4s ease'}} />
                          </div>
                          <span style={{fontSize:9,color:'var(--red)',fontFamily:"'DM Mono',monospace",fontWeight:600,minWidth:16,textAlign:'right'}}>{bearScore}</span>
                        </div>
                      </div>

                      {/* Regime warning */}
                      {spyRegime==='BEAR' && (
                        <div style={{margin:'0 12px 10px',padding:'6px 10px',borderRadius:4,
                          background:'var(--red-dim)',border:'1px solid var(--red-border)',
                          fontSize:9,color:'var(--red)',fontFamily:"'DM Mono',monospace",lineHeight:1.5}}>
                          ⚠ BEAR MARKET — signal threshold raised to 7pts
                        </div>
                      )}
                    </div>

                    {/* ── News feed ── */}
                    <div style={{
                      flex:1, minHeight:0, overflow:'hidden',
                      borderRadius:'var(--r-lg)', border:'1px solid var(--border)',
                    }}>
                      <NewsPanel news={news} earnings={earnings} loading={newsLoading} symbol={selected} onRefresh={refreshNews} />
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* ══ WATCHLIST TAB ════════════════════════════════════════ */}
            {tab==='watchlist' && (
              <div className="fade-up">
                <WatchlistPanel
                  watchlist={watchlist}
                  addSymbol={addSymbol}
                  removeSymbol={removeSymbol}
                  moveSymbol={moveSymbol}
                  resetWatchlist={resetWatchlist}
                  quotes={quotes}
                  bars={bars}
                  prices={prices}
                  onSelectSymbol={sym=>{ setSelected(sym); setTab('market'); }}
                  selected={selected}
                  getSignalForSym={getSignalForSym}
                />
              </div>
            )}

            {/* ══ MOVERS TAB ════════════════════════════════════════════ */}
            {tab==='hot' && (
              <div className="fade-up">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <span style={{fontSize:11,color:'var(--text3)'}}>
                    {hotData ? (hotSymbols.length-CORE_SYMBOLS.length)+' movers tracked today alongside '+CORE_SYMBOLS.length+' core symbols' : 'Unavailable outside market hours'}
                  </span>
                  <button className="btn-ghost" onClick={loadHot} disabled={!marketStatus.isOpen} style={{fontSize:9,opacity:marketStatus.isOpen?1:.4}}>
                    ↻ REFRESH
                  </button>
                </div>
                {!marketStatus.isOpen ? (
                  <div style={{padding:'60px 0',textAlign:'center',color:'var(--text3)'}}>
                    <div style={{fontSize:26,marginBottom:10}}>🕐</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:11}}>Hot stocks data only available during market hours</div>
                  </div>
                ) : (
                  <HotTable data={hotData} quotes={quotes} selected={selected} onSelect={sym=>{setSelected(sym);setTab('market');}} />
                )}
              </div>
            )}

            {/* ══ POSITIONS TAB ═════════════════════════════════════════ */}
            {tab==='positions' && (
              <div className="fade-up">
                {/* Short positions */}
                {Object.keys(portfolio.shorts||{}).length > 0 && (
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:9,color:'var(--red)',letterSpacing:'.12em',fontFamily:"'DM Mono',monospace",marginBottom:8,padding:'0 2px'}}>
                      SHORT POSITIONS — {Object.keys(portfolio.shorts).length} open
                    </div>
                    {Object.entries(portfolio.shorts).map(([sym,pos])=>{
                      const price  = prices[sym]??pos.entryPrice;
                      const pnl    = (pos.entryPrice - price) * pos.shares;
                      const pnlPct = ((pos.entryPrice - price)/pos.entryPrice)*100;
                      const pc     = pnl>=0?'var(--green)':'var(--red)';
                      return (
                        <div key={sym} className="card" style={{padding:'14px 16px',marginBottom:8,borderLeft:`3px solid ${pc}`}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700,color:'var(--red)'}}>{sym}</span>
                              <span className="pill pill-red">SHORT</span>
                              <span className="pill pill-gray">{pos.shares} shares</span>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <div style={{fontSize:18,fontWeight:700,color:pc,fontFamily:"'DM Mono',monospace"}}>{pnl>=0?'+':''}{fmtUSD(pnl)}</div>
                              <div style={{fontSize:11,color:pc}}>{fmtPct(pnlPct)}</div>
                            </div>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                            {[
                              {l:'ENTRY',   v:fmtUSD(pos.entryPrice)},
                              {l:'CURRENT', v:fmtUSD(price)},
                              {l:'STOP',    v:fmtUSD(pos.entryPrice*1.04), c:'var(--red)'},
                              {l:'TARGET',  v:fmtUSD(pos.entryPrice*0.92), c:'var(--green)'},
                            ].map(s=>(
                              <div key={s.l} className="card-sm" style={{padding:'6px 9px'}}>
                                <div style={{fontSize:7,color:'var(--text3)',letterSpacing:'.1em',marginBottom:3}}>{s.l}</div>
                                <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:s.c||'var(--text)'}}>{s.v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Long positions */}
                {!openCount && !Object.keys(portfolio.shorts||{}).length ? (
                  <div style={{padding:'60px 0',textAlign:'center',color:'var(--text3)'}}>
                    <div style={{fontSize:26,marginBottom:10}}>📭</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:11}}>No open positions</div>
                  </div>
                ) : openCount > 0 && Object.entries(portfolio.positions).map(([sym,pos])=>{
                  const price  = prices[sym]??pos.avgCost;
                  const pnl    = (price-pos.avgCost)*pos.shares;
                  const pnlPct = ((price-pos.avgCost)/pos.avgCost)*100;
                  const symAtr = atr(bars[sym]??[],14);
                  const sl     = symAtr ? Math.min(Math.max(symAtr*1.5/100,.02),.08) : .04;
                  const hist   = pos.priceHistory??[];
                  const slp    = hist.length>=5 ? (hist[hist.length-1].close-hist[0].close)/hist[0].close*100 : null;
                  const pc     = pnl>=0?'var(--green)':'var(--red)';
                  return (
                    <div key={sym} className={`pos-card ${pnl>=0?'pos-up':'pos-down'}`}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          <span style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:700,color:'var(--accent)'}}>{sym}</span>
                          <span className="pill pill-gray">{pos.shares} shares</span>
                          {slp!=null && <span className={`pill ${slp>0.05?'pill-green':slp<-0.05?'pill-red':'pill-gray'}`}>slope {slp>=0?'+':''}{slp.toFixed(2)}%</span>}
                          <span className="pill pill-gray">{hist.length} ticks</span>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:18,fontWeight:700,color:pc,fontFamily:"'DM Mono',monospace"}}>{pnl>=0?'+':''}{fmtUSD(pnl)}</div>
                          <div style={{fontSize:11,color:pc}}>{fmtPct(pnlPct)}</div>
                        </div>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6}}>
                        {[
                          {l:'ENTRY',  v:fmtUSD(pos.avgCost)},
                          {l:'CURRENT',v:fmtUSD(price)},
                          {l:'VALUE',  v:fmtUSD(pos.shares*price)},
                          {l:'STOP',   v:fmtUSD(pos.avgCost*(1-sl)),  c:'var(--red)'},
                          {l:'TARGET', v:fmtUSD(pos.avgCost*(1+TAKE_PROFIT_PCT)), c:'var(--green)'},
                        ].map(s=>(
                          <div key={s.l} className="card-sm" style={{padding:'6px 9px'}}>
                            <div style={{fontSize:7,color:'var(--text3)',letterSpacing:'.1em',marginBottom:3}}>{s.l}</div>
                            <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:s.c||'var(--text)'}}>{s.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ══ TRADES TAB ════════════════════════════════════════════ */}
            {tab==='trades' && (
              <div className="fade-up">
                {!portfolio.trades.length ? (
                  <div style={{padding:'60px 0',textAlign:'center',color:'var(--text3)'}}>
                    <div style={{fontSize:26,marginBottom:10}}>📋</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:11}}>No trade history yet</div>
                  </div>
                ) : (
                  <div className="card">
                    <div style={{display:'grid',gridTemplateColumns:'40px 56px 44px 88px 90px 90px 90px 20px',padding:'7px 14px',borderBottom:'1px solid var(--border)'}}>
                      {['TYPE','SYM','SIDE','QTY','PRICE','P&L','SLIP','REASON',''].map(h=>(
                        <div key={h} style={{fontSize:8,color:'var(--text3)',letterSpacing:'.1em'}}>{h}</div>
                      ))}
                    </div>
                    <div style={{maxHeight:520,overflowY:'auto'}}>
                      {[...portfolio.trades].reverse().map((t,i)=>{
                        const rc = t.reason==='take-profit'?'var(--green)':t.reason?.includes('atr')||t.reason==='momentum-reversal'?'var(--red)':'var(--text3)';
                        return (
                          <div key={t.id??i} className="rh"
                            style={{display:'grid',gridTemplateColumns:'48px 52px 40px 36px 80px 80px 60px 80px 20px',padding:'7px 14px',borderBottom:'1px solid var(--border)',alignItems:'center',gap:2}}>
                            <span style={{fontSize:9,fontWeight:700,color:t.action==='BUY'||t.action==='COVER'?'var(--green)':t.action==='SHORT'?'var(--red)':'var(--red)',fontFamily:"'DM Mono',monospace"}}>{t.action}</span>
                            <span style={{fontSize:11,color:'var(--accent)',fontFamily:"'DM Mono',monospace",fontWeight:600}}>{t.symbol}</span>
                            <span style={{fontSize:8,color:t.side==='short'?'var(--red)':'var(--green)',fontFamily:"'DM Mono',monospace"}}>{(t.side||'long').toUpperCase()}</span>
                            <span style={{fontSize:10,fontFamily:"'DM Mono',monospace"}}>{t.shares}</span>
                            <span style={{fontSize:10,fontFamily:"'DM Mono',monospace"}}>{fmtUSD(t.price)}</span>
                            <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:t.pnl==null?'var(--text3)':t.pnl>=0?'var(--green)':'var(--red)',fontWeight:t.pnl!=null?600:400}}>
                              {t.pnl==null?'—':(t.pnl>=0?'+':'')+fmtUSD(t.pnl)}
                            </span>
                            <span style={{fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace"}}>{t.slippage!=null?'-$'+Math.abs(t.slippage).toFixed(2):'—'}</span>
                            <span style={{fontSize:8,color:rc}}>{t.reason||(t.auto?'bot':'manual')}</span>
                            <span style={{fontSize:10}}>{t.auto?'🤖':'👤'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab==='performance' && (
              <div className="fade-up">
                <PerformancePanel trades={portfolio.trades} equityHistory={portfolio.equityHistory} />
              </div>
            )}

            {tab==='backtest' && <BacktestPanel bars={selBars} symbol={selected} />}

            {tab==='news' && (
              <div className="fade-up">
                <GlobalNewsTab />
              </div>
            )}

            {tab==='guide' && (
              <div className="fade-up">
                <HowItWorks />
              </div>
            )}
          </div>
        </div>

        {/* ═══ RIGHT SIDEBAR ══════════════════════════════════════════════ */}
        <div className="sidebar">

          {/* Panel header */}
          <div style={{
            padding:'10px 12px', borderBottom:'1px solid var(--border)',
            display:'flex', justifyContent:'space-between', alignItems:'center',
            background:'var(--bg2)', flexShrink:0,
          }}>
            <span style={{fontSize:8,color:'var(--text3)',fontFamily:"'DM Mono',monospace",letterSpacing:'.14em',textTransform:'uppercase'}}>
              EXECUTE TRADE
            </span>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:marketStatus.isOpen?'var(--green)':'var(--text3)',display:'inline-block',flexShrink:0,animation:marketStatus.isOpen?'pulseDot 2s ease-in-out infinite':'none'}} />
              <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:'var(--accent)',fontWeight:700,letterSpacing:'.04em'}}>{selected}</span>
            </div>
          </div>

          {/* Market closed warning */}
          {!marketStatus.isOpen && (
            <div style={{margin:'8px 14px 0',background:'rgba(245,158,11,.05)',border:'1px solid rgba(245,158,11,.15)',borderRadius:'var(--r-sm)',padding:'7px 12px',fontSize:10,color:'var(--yellow)',display:'flex',alignItems:'center',gap:6}}>
              <span>⏱</span> Market closed · trading disabled
            </div>
          )}

          {/* Signal card */}
          <div style={{margin:'8px 14px 0'}}>
            <div className="card-sm" style={{padding:'10px 12px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                <Sig s={signal} />
                <span style={{fontSize:9,color:'var(--text3)',fontFamily:"'DM Mono',monospace"}}>{confidence}%</span>
              </div>
              {rawSignal!==signal && rawSignal!=='HOLD' && (
                <div style={{fontSize:9,color:'var(--yellow)',marginBottom:4}}>⏳ Awaiting 2nd {rawSignal}...</div>
              )}
              <div style={{fontSize:10,color:'var(--text3)',lineHeight:1.6,marginBottom:7}}>{reason}</div>
              {/* Score bar */}
              <div style={{display:'flex',gap:4,alignItems:'center',fontSize:8,fontFamily:"'DM Mono',monospace",marginTop:4}}>
                <span style={{color:'var(--green)',minWidth:22}}>B {bullScore}</span>
                <div className="score-track" style={{flex:1}}>
                  <div className="score-fill" style={{width:(bullScore/11*100)+'%',background:'var(--green)'}} />
                </div>
                <span style={{color:'var(--text4)',fontSize:7,minWidth:14,textAlign:'center'}}>vs</span>
                <div className="score-track" style={{flex:1}}>
                  <div className="score-fill" style={{width:(bearScore/11*100)+'%',background:'var(--red)'}} />
                </div>
                <span style={{color:'var(--red)',minWidth:22,textAlign:'right'}}>{bearScore} B</span>
              </div>
            </div>
          </div>

          {/* Qty input */}
          <div style={{padding:'10px 14px 0'}}>
            <Lbl>SHARES</Lbl>
            <input type="number" value={qty} min="1"
              onChange={e=>setQty(e.target.value)}
              disabled={!marketStatus.isOpen}
              className="inp"
              onFocus={e=>e.target.style.borderColor='var(--accent)'}
              onBlur={e=>e.target.style.borderColor='var(--border2)'} />
          </div>

          {/* Trade calc */}
          {selPrice && (
            <div style={{margin:'8px 14px 0'}}>
              <div className="card-sm" style={{padding:'8px 12px'}}>
                {[
                  {l:'Price',   v:fmtUSD(selPrice)},
                  {l:'Total',   v:fmtUSD(selPrice*(parseInt(qty)||0))},
                  {l:'ATR Stop',v:fmtUSD(selPrice*(1-dynStop)), c:'var(--red)'},
                  {l:'Target',  v:fmtUSD(selPrice*(1+TAKE_PROFIT_PCT)), c:'var(--green)'},
                ].map(r=><KV key={r.l} l={r.l} v={r.v} c={r.c} />)}
              </div>
            </div>
          )}

          {/* Buy / Sell buttons */}
          <div style={{padding:'10px 14px 0',display:'flex',gap:7}}>
            <button className={`btn-buy ${!marketStatus.isOpen||!selPrice?'btn-disabled':''}`}
              onClick={handleBuy} disabled={!marketStatus.isOpen||!selPrice}>
              BUY
            </button>
            <button className={`btn-sell ${!marketStatus.isOpen||!selPrice?'btn-disabled':''}`}
              onClick={handleSell} disabled={!marketStatus.isOpen||!selPrice}>
              SELL
            </button>
          </div>

          {/* Open position card */}
          {openPos && (()=>{
            const pnl  = (selPrice-openPos.avgCost)*openPos.shares;
            const pnlP = ((selPrice-openPos.avgCost)/openPos.avgCost)*100;
            const hist = openPos.priceHistory??[];
            const slp  = hist.length>=5 ? (hist[hist.length-1].close-hist[0].close)/hist[0].close*100 : null;
            const pc   = pnl>=0?'var(--green)':'var(--red)';
            return (
              <div style={{margin:'10px 14px 0'}}>
                <div className="card-sm" style={{padding:'10px 12px',borderLeft:`3px solid ${pc}`}}>
                  <Lbl>OPEN POSITION</Lbl>
                  {[
                    {l:'Shares', v:openPos.shares},
                    {l:'Entry',  v:fmtUSD(openPos.avgCost)},
                    {l:'P&L',    v:(pnl>=0?'+':'')+fmtUSD(pnl), c:pc},
                    {l:'Return', v:fmtPct(pnlP), c:pc},
                    {l:'Slope',  v:slp!=null?(slp>=0?'+':'')+slp.toFixed(2)+'%':'—', c:slp>0.05?'var(--green)':slp<-0.05?'var(--red)':'var(--text3)'},
                    {l:'Ticks',  v:hist.length},
                  ].map(r=><KV key={r.l} l={r.l} v={r.v} c={r.c} />)}
                </div>
              </div>
            );
          })()}

          {/* System status */}
          <div style={{margin:'10px 14px 14px'}}>
            <div className="card-inset" style={{padding:'10px 12px'}}>
              <Lbl>SYSTEM STATUS</Lbl>
              {(()=>{
                const peakEq = portfolio.peakEquity ?? STARTING_CASH;
                const ddPct  = peakEq > 0 ? ((peakEq - totalEquity) / peakEq * 100) : 0;
                return [
                  {l:'MARKET',  v:marketStatus.isOpen?'OPEN':marketStatus.reason.toUpperCase(), c:marketStatus.isOpen?'var(--green)':'var(--yellow)'},
                  {l:'DATA',    v:isLive?'● LIVE':'○ STALE', c:isLive?'var(--green)':'var(--text3)'},
                  {l:'BOT',     v:portfolio.circuitOpen?'CIRCUIT OPEN':autoTrade&&marketStatus.isOpen?'SCANNING':autoTrade?'PAUSED':'OFF',
                                c:portfolio.circuitOpen?'var(--red)':autoTrade&&marketStatus.isOpen?'var(--accent)':'var(--text3)'},
                  {l:'REGIME',  v:spyRegime, c:spyRegime==='BULL'?'var(--green)':spyRegime==='BEAR'?'var(--red)':'var(--text3)'},
                  {l:'DRAWDOWN',v:ddPct>0?'-'+ddPct.toFixed(1)+'%':'—', c:ddPct>=(DRAWDOWN_LIMIT*100)?'var(--red)':ddPct>4?'var(--yellow)':'var(--green)'},
                  {l:'NEWS',    v:newsSent.label.toUpperCase(), c:newsSent.label==='bullish'?'var(--green)':newsSent.label==='bearish'?'var(--red)':'var(--text3)'},
                ];
              })().map(r=>(
                <div className="status-row" key={r.l}>
                  <span className="status-key">{r.l}</span>
                  <span className="status-val" style={{color:r.c}}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
