import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Area,
} from 'recharts';
import { useMemo, useState } from 'react';
import { sma, bollingerBands, macd, rsiSeries } from '../utils/indicators.js';

function fmt(n, d = 2) { return typeof n === 'number' ? n.toFixed(d) : '—'; }

const TIMEFRAMES = [
  { k: '1D',  label: '1D',  bars: null  },  // today's bars only
  { k: '5D',  label: '5D',  bars: 288   },  // ~5 days of 5-min bars
  { k: '1M',  label: '1M',  bars: 1152  },  // ~1 month
  { k: '3M',  label: '3M',  bars: 3456  },  // ~3 months
  { k: 'YTD', label: 'YTD', bars: null  },  // from Jan 1
  { k: 'ALL', label: 'ALL', bars: 99999 },
];

function filterByTimeframe(bars, tfKey) {
  if (!bars || !bars.length) return bars;
  if (tfKey === '1D') {
    // today's bars: same calendar date as last bar
    const last = new Date(bars[bars.length - 1].time);
    const dayStr = `${last.getFullYear()}-${last.getMonth()}-${last.getDate()}`;
    return bars.filter(b => {
      const d = new Date(b.time);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === dayStr;
    });
  }
  if (tfKey === 'YTD') {
    const year = new Date().getFullYear();
    return bars.filter(b => new Date(b.time).getFullYear() === year);
  }
  const tf = TIMEFRAMES.find(t => t.k === tfKey);
  if (!tf || !tf.bars) return bars;
  return bars.slice(-tf.bars);
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const dt = new Date(d.time);
  const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border2)',
      borderRadius: 6, padding: '10px 14px',
      fontSize: 11, lineHeight: 1.9,
      boxShadow: '0 8px 32px rgba(0,0,0,.7)',
      fontFamily: "'DM Mono',monospace",
    }}>
      <div style={{ color: 'var(--text3)', marginBottom: 5, fontSize: 9 }}>{dateStr} {timeStr}</div>
      {d.close  != null && <div style={{color:'var(--text)'}}>Price <span style={{color:'#e2e8f0',fontWeight:600}}>${fmt(d.close)}</span></div>}
      {d.sma10  != null && <div style={{color:'var(--text3)'}}>SMA10 <span style={{color:'#f97316'}}>${fmt(d.sma10)}</span></div>}
      {d.sma30  != null && <div style={{color:'var(--text3)'}}>SMA30 <span style={{color:'#3b82f6'}}>${fmt(d.sma30)}</span></div>}
      {d.bbUpper!= null && <div style={{color:'var(--text3)'}}>BB Upper <span style={{color:'#8b8cf8'}}>${fmt(d.bbUpper)}</span></div>}
      {d.bbLower!= null && <div style={{color:'var(--text3)'}}>BB Lower <span style={{color:'#8b8cf8'}}>${fmt(d.bbLower)}</span></div>}
    </div>
  );
};

const MACDTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 6, padding: '8px 12px', fontSize: 11, fontFamily:"'DM Mono',monospace" }}>
      {d.macdLine   != null && <div>MACD   <span style={{ color: '#f97316' }}>{fmt(d.macdLine, 3)}</span></div>}
      {d.signalLine != null && <div>Signal <span style={{ color: '#3b82f6' }}>{fmt(d.signalLine, 3)}</span></div>}
      {d.histogram  != null && <div>Hist   <span style={{ color: d.histogram >= 0 ? '#00c98a' : '#ef4461' }}>{fmt(d.histogram, 3)}</span></div>}
    </div>
  );
};

export default function Chart({ bars, symbol }) {
  const [tf, setTf] = useState('1D');

  const filteredBars = useMemo(() => filterByTimeframe(bars, tf), [bars, tf]);

  const chartData = useMemo(() => {
    const b = filteredBars;
    if (!b || b.length < 5) return [];
    const closes = b.map(x => x.close);
    const sma10arr  = sma(closes, 10);
    const sma30arr  = sma(closes, 30);
    const bb        = bollingerBands(closes, 20);
    const rsiArr    = rsiSeries(closes, 14);
    const { macdLine, signalLine, histogram } = macd(closes);

    const o10 = closes.length - sma10arr.length;
    const o30 = closes.length - sma30arr.length;
    const obb = closes.length - bb.middle.length;
    const ori = closes.length - rsiArr.length;
    const omc = closes.length - macdLine.length;
    const osl = closes.length - signalLine.length;
    const ohi = closes.length - histogram.length;

    const slice = b.slice(-300);
    const offset = b.length - slice.length;
    return slice.map((bar, rawI) => {
      const i = offset + rawI;
      return {
        time:       bar.time,
        close:      bar.close,
        volume:     bar.volume,
        sma10:      i >= o10 ? sma10arr[i - o10]  : null,
        sma30:      i >= o30 ? sma30arr[i - o30]  : null,
        bbUpper:    i >= obb ? bb.upper[i - obb]  : null,
        bbMiddle:   i >= obb ? bb.middle[i - obb] : null,
        bbLower:    i >= obb ? bb.lower[i - obb]  : null,
        rsi:        i >= ori ? rsiArr[i - ori]     : null,
        macdLine:   i >= omc ? macdLine[i - omc]  : null,
        signalLine: i >= osl ? signalLine[i - osl]: null,
        histogram:  i >= ohi ? histogram[i - ohi] : null,
      };
    });
  }, [filteredBars]);

  // Choose tick format based on timeframe
  const tickFmt = v => {
    const d = new Date(v);
    if (tf === '1D') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (tf === '5D') return d.toLocaleDateString('en-US', { weekday: 'short' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const priceFmt = v => '$' + v.toFixed(0);
  const tickStyle = { fontSize: 9, fill: 'var(--text3)', fontFamily: 'DM Mono,monospace' };

  if (!chartData.length) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'var(--text3)', fontFamily:"'DM Mono',monospace", fontSize:11 }}>
      {bars?.length ? 'Not enough data for this timeframe' : 'Loading chart data…'}
    </div>
  );

  // Color price line by direction
  const first = chartData[0]?.close;
  const last  = chartData[chartData.length - 1]?.close;
  const priceColor = last >= first ? '#00c98a' : '#ef4461';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Timeframe tab bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px 0', borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        {/* Legend */}
        <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: '.08em', fontFamily:"'DM Mono',monospace", display:'flex', gap:12, alignItems:'center' }}>
          <span style={{color: priceColor}}>━ PRICE</span>
          <span style={{color:'#f97316'}}>━ SMA10</span>
          <span style={{color:'#3b82f6'}}>━ SMA30</span>
          <span style={{color:'#8b8cf8'}}>⋯ BB</span>
        </div>
        {/* Timeframe tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {TIMEFRAMES.map(t => (
            <button key={t.k} onClick={() => setTf(t.k)} style={{
              background: tf === t.k ? 'rgba(77,135,246,.12)' : 'none',
              border: `1px solid ${tf === t.k ? 'rgba(77,135,246,.3)' : 'transparent'}`,
              borderRadius: 4, padding: '3px 9px',
              color: tf === t.k ? '#4d87f6' : 'var(--text3)',
              fontSize: 9, fontFamily: "'DM Mono',monospace", letterSpacing: '.06em',
              cursor: 'pointer', transition: 'all .12s', fontWeight: tf === t.k ? 600 : 400,
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price + BB + SMA */}
      <div style={{ flex: 3, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
            <XAxis dataKey="time" tickFormatter={tickFmt} tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={['auto','auto']} tickFormatter={priceFmt} tick={tickStyle} tickLine={false} axisLine={false} width={50} />
            <Tooltip content={<CustomTooltip />} />
            {/* BB bands fill */}
            <Area dataKey="bbUpper" stroke="none" fill="#6366f1" fillOpacity={0.05} legendType="none" />
            <Area dataKey="bbLower" stroke="none" fill="#6366f1" fillOpacity={0.05} legendType="none" />
            <Line dataKey="bbUpper"  stroke="#8b8cf8" strokeWidth={1} dot={false} strokeDasharray="3 3" />
            <Line dataKey="bbMiddle" stroke="#8b8cf8" strokeWidth={.5} dot={false} strokeDasharray="2 4" opacity={.4} />
            <Line dataKey="bbLower"  stroke="#8b8cf8" strokeWidth={1} dot={false} strokeDasharray="3 3" />
            <Line dataKey="sma10"    stroke="#f97316" strokeWidth={1.5} dot={false} />
            <Line dataKey="sma30"    stroke="#3b82f6" strokeWidth={1.5} dot={false} />
            <Line dataKey="close"    stroke={priceColor} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MACD */}
      <div style={{ flex: 1, minHeight: 0, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: '.1em', padding: '4px 14px 0', fontFamily:"'DM Mono',monospace" }}>
          MACD
        </div>
        <ResponsiveContainer width="100%" height="80%">
          <ComposedChart data={chartData} margin={{ top: 2, right: 10, bottom: 0, left: 0 }}>
            <XAxis dataKey="time" hide />
            <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={50} tickFormatter={v => v.toFixed(2)} />
            <Tooltip content={<MACDTooltip />} />
            <ReferenceLine y={0} stroke="var(--border2)" />
            <Bar dataKey="histogram" fill="#00c98a"
              shape={props => {
                const { x, y, width, height, value } = props;
                return <rect x={x} y={value >= 0 ? y : y + height} width={Math.max(width-1, 1)} height={Math.abs(height)} fill={value >= 0 ? '#00c98a' : '#ef4461'} opacity={.65} rx={1} />;
              }}
            />
            <Line dataKey="macdLine"   stroke="#f97316" strokeWidth={1.5} dot={false} />
            <Line dataKey="signalLine" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* RSI */}
      <div style={{ flex: 1, minHeight: 0, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: '.1em', padding: '4px 14px 0', fontFamily:"'DM Mono',monospace" }}>
          RSI (14)
        </div>
        <ResponsiveContainer width="100%" height="80%">
          <ComposedChart data={chartData} margin={{ top: 2, right: 10, bottom: 4, left: 0 }}>
            <XAxis dataKey="time" tickFormatter={tickFmt} tick={tickStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} ticks={[30, 50, 70]} tick={tickStyle} tickLine={false} axisLine={false} width={50} />
            <Tooltip formatter={v => [v?.toFixed(1), 'RSI']} contentStyle={{ background:'var(--bg)', border:'1px solid var(--border2)', fontSize:10, fontFamily:'DM Mono,monospace', borderRadius:6 }} />
            <ReferenceLine y={70} stroke="#ef4461" strokeDasharray="3 3" opacity={.4} />
            <ReferenceLine y={30} stroke="#00c98a" strokeDasharray="3 3" opacity={.4} />
            <ReferenceLine y={50} stroke="var(--border2)" />
            <Line dataKey="rsi" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
