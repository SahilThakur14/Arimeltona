import { aggregateNewsSentiment } from '../services/news.js';

export function EarningsBadge({ earnings }) {
  if (!earnings || earnings.isPast) return null;
  const warn = earnings.isImminent;
  return (
    <span className={`pill ${warn?'pill-yellow':'pill-gray'}`}>
      {warn ? '⚠ EARNINGS ' : '📅 '}
      {earnings.date}
      {warn && ` · ${earnings.daysUntil===0?'TODAY':earnings.daysUntil+'d'}`}
    </span>
  );
}

const sentimentColors = {bullish:'var(--green)', bearish:'var(--red)', neutral:'var(--text3)'};
const sentimentBgs    = {bullish:'var(--green-dim)', bearish:'var(--red-dim)', neutral:'var(--bg4)'};

export default function NewsPanel({ news, earnings, loading, symbol, onRefresh }) {
  const sent = aggregateNewsSentiment(news);

  return (
    <div className="card" style={{overflow:'hidden'}}>
      {/* Header */}
      <div style={{padding:'11px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:9,color:'var(--text3)',letterSpacing:'.14em',fontFamily:"'DM Mono',monospace"}}>NEWS</span>
          <span style={{fontSize:12,fontWeight:600,color:'var(--accent)',fontFamily:"'DM Mono',monospace"}}>{symbol}</span>
          {!loading && news && sent.label !== 'neutral' && (
            <span style={{
              display:'inline-flex',alignItems:'center',gap:4,
              padding:'2px 9px',borderRadius:20,fontSize:9,fontFamily:"'DM Mono',monospace",
              background:sentimentBgs[sent.label], color:sentimentColors[sent.label],
              border:`1px solid ${sent.label==='bullish'?'var(--green-border)':'var(--red-border)'}`,
              fontWeight:500,letterSpacing:'.04em',
            }}>
              {sent.label==='bullish' ? '▲' : '▼'} {sent.label.toUpperCase()} {sent.bullish+sent.bearish} signals
            </span>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {earnings && !earnings.isPast && <EarningsBadge earnings={earnings} />}
          <button onClick={onRefresh} className="btn-ghost" style={{padding:'3px 9px',fontSize:11,lineHeight:1}}>↻</button>
        </div>
      </div>

      {/* Earnings warning */}
      {earnings?.isImminent && (
        <div className="earn-warn" style={{margin:'10px 14px 0',borderRadius:'var(--r-sm)'}}>
          <span style={{fontSize:13,flexShrink:0}}>⚠</span>
          <span>
            <strong>Earnings {earnings.daysUntil===0?'today':earnings.daysUntil+' day'+(earnings.daysUntil===1?'':'s')+' away'}.</strong>
            {' '}Bot blocking new entries — gaps at earnings blow through any stop-loss.
          </span>
        </div>
      )}

      {/* News list */}
      <div style={{maxHeight:320,overflowY:'auto'}}>
        {loading && (
          <div style={{padding:'14px 16px',display:'flex',flexDirection:'column',gap:9}}>
            {[60,48,54].map((h,i)=><div key={i} className="skel" style={{height:h}} />)}
          </div>
        )}
        {!loading && !news && (
          <div style={{padding:'40px 16px',textAlign:'center',color:'var(--text3)'}}>
            <div style={{fontSize:22,marginBottom:8,opacity:.4}}>◎</div>
            <div style={{fontSize:11,fontFamily:"'DM Mono',monospace"}}>No news available</div>
            <div style={{fontSize:10,color:'var(--text4)',marginTop:4}}>Yahoo may be throttling · try refreshing</div>
          </div>
        )}
        {!loading && news && news.map((item,i)=>(
          <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
            className="news-item" style={{textDecoration:'none'}}>
            <div className={`sdot sdot-${item.sentiment}`} />
            <div style={{flex:1,minWidth:0}}>
              <div className="news-title" style={{overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                {item.title}
              </div>
              <div className="news-meta">
                <span>{item.publisher}</span>
                <span style={{margin:'0 5px',opacity:.4}}>·</span>
                <span>{item.timeAgo}</span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Sentiment footer */}
      {news && sent.label !== 'neutral' && (
        <div style={{
          padding:'8px 16px',
          borderTop:`1px solid ${sent.label==='bullish'?'var(--green-border)':'var(--red-border)'}`,
          background: sentimentBgs[sent.label],
          fontSize:10, color: sentimentColors[sent.label],
          display:'flex', gap:7, alignItems:'center',
          fontFamily:"'DM Mono',monospace",
        }}>
          <span style={{fontSize:12}}>{sent.label==='bullish'?'↑':'↓'}</span>
          <span>
            {sent.label==='bullish'
              ? `${sent.bullish} bullish signal${sent.bullish>1?'s':''} — news supports BUY entries for ${symbol}`
              : `${sent.bearish} bearish signal${sent.bearish>1?'s':''} — bot suppressing BUY for ${symbol}`}
          </span>
        </div>
      )}
    </div>
  );
}
