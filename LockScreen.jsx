@import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;500;600;700;800&family=Outfit:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:      #03060e;
  --bg2:     #060b16;
  --bg3:     #090f1e;
  --bg4:     #0d1526;
  --bg5:     #111c30;

  --border:  #0f1b2e;
  --border2: #162339;
  --border3: #1c2e4a;

  --text:    #dce8f5;
  --text2:   #6080a8;
  --text3:   #2d4a6e;
  --text4:   #1a2e48;

  --accent:  #f59e0b;
  --accent2: #d97706;
  --accent-bg: rgba(245,158,11,.06);
  --accent-border: rgba(245,158,11,.2);

  --green:        #00c98a;
  --green-dim:    rgba(0,201,138,.07);
  --green-border: rgba(0,201,138,.22);
  --red:          #ef4461;
  --red-dim:      rgba(239,68,97,.07);
  --red-border:   rgba(239,68,97,.22);
  --yellow:       #f59e0b;
  --blue:         #4d87f6;
  --blue-dim:     rgba(77,135,246,.08);
  --blue-border:  rgba(77,135,246,.22);
  --purple:       #a78bfa;

  --glow-green:  0 0 16px rgba(0,201,138,.22);
  --glow-red:    0 0 16px rgba(239,68,97,.22);
  --glow-accent: 0 0 16px rgba(245,158,11,.22);

  --r-sm: 4px;
  --r-md: 8px;
  --r-lg: 10px;

  /* Nav */
  --nav-w: 52px;
}

html, body, #root {
  height: 100%; background: var(--bg);
  color: var(--text);
  font-family: 'Outfit', -apple-system, sans-serif;
  font-size: 13px; line-height: 1.5;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 3px; height: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border3); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: var(--text3); }

button { cursor: pointer; font-family: inherit; }
input  { font-family: inherit; }

/* ── Animations ──────────────────────────────────────────────── */
@keyframes fadeUp    { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
@keyframes fadeIn    { from{opacity:0} to{opacity:1} }
@keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.15} }
@keyframes pulseDot  { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:.5} }
@keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes tickerRun { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
@keyframes statusScroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-33.333%); }
}
@keyframes lightSweep {
  0%   { background-position: 200% 0; }
  50%  { background-position:   0% 0; }
  100% { background-position: 200% 0; }
}
@keyframes neonPulse {
  0%,100% {
    text-shadow: 0 0 6px rgba(245,158,11,.9), 0 0 18px rgba(245,158,11,.5), 0 0 36px rgba(245,158,11,.2);
  }
  50% {
    text-shadow: 0 0 10px rgba(245,158,11,1), 0 0 28px rgba(245,158,11,.75), 0 0 55px rgba(245,158,11,.4);
  }
}

.fade-up { animation: fadeUp .22s cubic-bezier(.16,1,.3,1) forwards; }
.fade-in { animation: fadeIn .18s ease forwards; }

/* ── Ticker strip ─────────────────────────────────────────── */
.ticker-wrap {
  height: 28px; overflow: hidden; position: relative;
  background: var(--bg2); border-bottom: 1px solid var(--border);
  display: flex; align-items: center; flex-shrink: 0;
}
.ticker-wrap::before,.ticker-wrap::after {
  content:''; position:absolute; top:0; bottom:0; width:40px; z-index:2; pointer-events:none;
}
.ticker-wrap::before { left:0; background:linear-gradient(90deg,var(--bg2),transparent); }
.ticker-wrap::after  { right:0; background:linear-gradient(-90deg,var(--bg2),transparent); }
.ticker-track { display:flex; white-space:nowrap; animation:tickerRun 120s linear infinite; }
.ticker-track:hover { animation-play-state:paused; }
.ticker-item {
  padding: 0 18px; font-size: 9px; font-family:'DM Mono',monospace;
  display:flex; align-items:center; gap:6px; color:var(--text2);
}
.ticker-item + .ticker-item { border-left:1px solid var(--border); }

/* ── Pills ─────────────────────────────────────────────────── */
.pill {
  display:inline-flex; align-items:center; gap:3px;
  padding:2px 7px; border-radius:3px;
  font-size:9px; font-family:'DM Mono',monospace;
  font-weight:500; letter-spacing:.04em; border:1px solid;
  white-space:nowrap; line-height:1.6;
}
.pill-green  { background:var(--green-dim);  color:var(--green); border-color:var(--green-border); }
.pill-red    { background:var(--red-dim);    color:var(--red);   border-color:var(--red-border); }
.pill-yellow { background:rgba(245,158,11,.07); color:var(--yellow); border-color:rgba(245,158,11,.2); }
.pill-blue   { background:var(--blue-dim);   color:var(--blue);  border-color:var(--blue-border); }
.pill-gray   { background:var(--bg3); color:var(--text3); border-color:var(--border2); }
.pill-orange { background:var(--accent-bg); color:var(--accent); border-color:var(--accent-border); }

/* ── Signal badge ─────────────────────────────────────────── */
.sig {
  display:inline-flex; align-items:center;
  padding:4px 12px; border-radius:var(--r-sm);
  font-size:10px; font-weight:700; letter-spacing:.14em;
  font-family:'DM Mono',monospace; border:1px solid;
}
.sig-BUY  { background:var(--green-dim);  color:var(--green); border-color:var(--green-border); box-shadow:var(--glow-green); }
.sig-SELL { background:var(--red-dim);    color:var(--red);   border-color:var(--red-border);   box-shadow:var(--glow-red); }
.sig-HOLD { background:var(--bg3); color:var(--text3); border-color:var(--border2); }

/* ── Cards ─────────────────────────────────────────────────── */
.card {
  background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--r-lg); transition:border-color .2s;
}
.card:hover { border-color:var(--border2); }
.card-sm { background:var(--bg2); border:1px solid var(--border); border-radius:var(--r-md); }
.card-accent { background:var(--accent-bg); border:1px solid var(--accent-border); border-radius:var(--r-md); }
.card-inset { background:var(--bg); border:1px solid var(--border); border-radius:var(--r-sm); }

/* ── Stat card ─────────────────────────────────────────────── */
.stat-card {
  background:var(--bg2); border:1px solid var(--border);
  border-radius:var(--r-md); padding:10px 12px;
  position:relative; overflow:hidden;
  transition:border-color .2s, background .2s;
}
.stat-card:hover { background:var(--bg3); border-color:var(--border2); }
.stat-label { font-size:8px; color:var(--text3); letter-spacing:.14em; font-family:'DM Mono',monospace; margin-bottom:4px; text-transform:uppercase; }
.stat-value { font-size:15px; font-weight:600; font-family:'DM Mono',monospace; letter-spacing:-.01em; line-height:1.2; }
.stat-sub   { font-size:9px; color:var(--text3); margin-top:2px; font-family:'DM Mono',monospace; }
.stat-bar   { position:absolute; bottom:0; left:0; right:0; height:2px; border-radius:0 0 var(--r-md) var(--r-md); opacity:.5; }

/* ── Top-level nav tabs (left sidebar) ────────────────────── */
.nav-sidebar {
  width: var(--nav-w);
  background: var(--bg2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  flex-shrink: 0;
  z-index: 10;
  gap: 2px;
}
.nav-item {
  width: 40px; height: 40px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  border-radius: var(--r-md);
  cursor: pointer; border: 1px solid transparent;
  font-size: 7px; font-family: 'DM Mono', monospace;
  letter-spacing: .06em; color: var(--text3);
  gap: 3px; transition: all .15s;
  background: none;
}
.nav-item:hover { color: var(--text2); background: var(--bg3); border-color: var(--border); }
.nav-item.active {
  color: var(--accent);
  background: var(--accent-bg);
  border-color: var(--accent-border);
}
.nav-icon { font-size: 14px; line-height: 1; }
.nav-spacer { flex: 1; }

/* ── Horizontal sub-tabs ──────────────────────────────────── */
.tabs {
  display:flex; border-bottom:1px solid var(--border); gap:0;
  background: var(--bg2);
}
.tab {
  background:none; border:none;
  border-bottom:2px solid transparent;
  color:var(--text3);
  padding:9px 14px;
  font-size:9px; letter-spacing:.1em;
  font-family:'DM Mono',monospace;
  cursor:pointer;
  transition:color .15s, border-color .15s;
  white-space:nowrap;
}
.tab:hover  { color:var(--text2); }
.tab.active { color:var(--text); border-bottom-color:var(--accent); }

/* ── Inputs ───────────────────────────────────────────────── */
.inp {
  width:100%; background:var(--bg);
  border:1px solid var(--border2);
  border-radius:var(--r-sm); padding:8px 11px;
  color:var(--text); font-family:'DM Mono',monospace;
  font-size:14px; outline:none;
  transition:border-color .15s, box-shadow .15s;
}
.inp:focus { border-color:var(--accent); box-shadow:0 0 0 2px rgba(245,158,11,.1); }
.inp:disabled { opacity:.3; cursor:not-allowed; }

/* ── Buttons ──────────────────────────────────────────────── */
.btn-buy {
  flex:1; padding:10px;
  border-radius:var(--r-sm); border:1px solid var(--green-border);
  font-size:10px; font-weight:700; letter-spacing:.1em;
  font-family:'DM Mono',monospace; cursor:pointer;
  background:linear-gradient(135deg,rgba(0,201,138,.1),rgba(0,201,138,.2));
  color:var(--green); transition:all .15s;
}
.btn-buy:hover:not(:disabled) { background:linear-gradient(135deg,rgba(0,201,138,.2),rgba(0,201,138,.32)); box-shadow:var(--glow-green); }
.btn-sell {
  flex:1; padding:10px;
  border-radius:var(--r-sm); border:1px solid var(--red-border);
  font-size:10px; font-weight:700; letter-spacing:.1em;
  font-family:'DM Mono',monospace; cursor:pointer;
  background:linear-gradient(135deg,rgba(239,68,97,.1),rgba(239,68,97,.2));
  color:var(--red); transition:all .15s;
}
.btn-sell:hover:not(:disabled) { background:linear-gradient(135deg,rgba(239,68,97,.2),rgba(239,68,97,.32)); box-shadow:var(--glow-red); }
.btn-ghost {
  background:none; border:1px solid var(--border2);
  border-radius:var(--r-sm); padding:5px 11px;
  color:var(--text2); font-size:9px;
  font-family:'DM Mono',monospace; letter-spacing:.08em;
  cursor:pointer; transition:all .15s;
}
.btn-ghost:hover { border-color:var(--border3); color:var(--text); background:var(--bg3); }
.btn-accent {
  background:var(--accent); border:none; border-radius:var(--r-sm);
  padding:8px 16px; color:#000; font-size:10px; font-weight:700;
  font-family:'DM Mono',monospace; letter-spacing:.08em; cursor:pointer;
  transition:all .15s;
}
.btn-accent:hover { background:var(--accent2); box-shadow:var(--glow-accent); }
.btn-disabled { opacity:.22 !important; cursor:not-allowed !important; filter:none !important; box-shadow:none !important; }

/* ── Header ───────────────────────────────────────────────── */
.app-header {
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  height: 56px;
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0; z-index: 100; position: relative;
  /* subtle gradient depth */
  background: linear-gradient(180deg, #080e1c 0%, #060b16 100%);
}
.app-header::after {
  content:''; position:absolute;
  bottom:0; left:0; right:0; height:1px;
  background:linear-gradient(90deg, transparent 0%, rgba(245,158,11,.08) 30%, rgba(245,158,11,.18) 50%, rgba(245,158,11,.08) 70%, transparent 100%);
  pointer-events:none;
}

/* ── Brand ─────────────────────────────────────────────────── */
.brand-wrap {
  display: flex; align-items: baseline; gap: 0; line-height: 1;
}
.brand-name {
  font-family: 'Syne', sans-serif;
  font-size: 19px; font-weight: 800;
  letter-spacing: .07em; line-height: 1;
  /* Full cinematic sweep — steel blue → white → amber → back */
  background: linear-gradient(
    100deg,
    #4d87f6 0%,
    #94b8d8 15%,
    #dce8f5 30%,
    #ffffff 42%,
    #fce38a 52%,
    #f59e0b 60%,
    #94b8d8 75%,
    #4d87f6 100%
  );
  background-size: 250% 100%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: lightSweep 4s ease-in-out infinite;
}
.brand-tona { display: none; }
.brand-sub  { display: none; }

/* ── Market status ─────────────────────────────────────────── */
.market-pill {
  display:flex; align-items:center; gap:5px;
  padding:3px 10px; border-radius:3px;
  font-size:8px; font-family:'DM Mono',monospace;
  font-weight:600; letter-spacing:.06em; border:1px solid;
}
.market-pill-open   { background:rgba(0,201,138,.05); border-color:rgba(0,201,138,.2); color:var(--green); }
.market-pill-closed { background:rgba(245,158,11,.05); border-color:rgba(245,158,11,.18); color:var(--yellow); }
.market-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; }
.market-dot-open   { background:var(--green); animation:pulseDot 2s ease-in-out infinite; }
.market-dot-closed { background:var(--yellow); }

/* ── Closed banner ─────────────────────────────────────────── */
.closed-banner {
  background:rgba(245,158,11,.03);
  border-bottom:1px solid rgba(245,158,11,.1);
  padding:5px 16px;
  display:flex; align-items:center; gap:10px; flex-shrink:0;
}

/* ── Symbol search ─────────────────────────────────────────── */
.sym-search-wrap { position:relative; margin-bottom:10px; }
.sym-search-wrap input {
  width:100%; background:var(--bg2);
  border:1px solid var(--border2); border-radius:var(--r-md);
  padding:8px 12px 8px 32px; color:var(--text);
  font-family:'DM Mono',monospace; font-size:12px;
  outline:none; transition:border-color .15s, box-shadow .15s;
}
.sym-search-wrap input:focus { border-color:var(--accent); box-shadow:0 0 0 2px rgba(245,158,11,.08); }
.sym-search-wrap input::placeholder { color:var(--text3); }
.sym-search-icon { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--text3); font-size:12px; pointer-events:none; }

/* ── News sentiment dot ────────────────────────────────────── */
.sdot { width:5px; height:5px; border-radius:50%; flex-shrink:0; margin-top:5px; }
.sdot-bullish { background:var(--green); }
.sdot-bearish { background:var(--red); }
.sdot-neutral { background:var(--text3); }

/* ── Skeleton ──────────────────────────────────────────────── */
.skel {
  background:linear-gradient(90deg,var(--bg3) 25%,var(--bg4) 50%,var(--bg3) 75%);
  background-size:200% 100%;
  animation:shimmer 1.6s ease-in-out infinite;
  border-radius:var(--r-sm);
}

/* ── Row hover ─────────────────────────────────────────────── */
.rh { transition:background .12s; }
.rh:hover { background:var(--bg4) !important; cursor:pointer; }

/* ── Regime pill ───────────────────────────────────────────── */
.regime-BULL    { background:var(--green-dim); color:var(--green); border:1px solid var(--green-border); }
.regime-BEAR    { background:var(--red-dim);   color:var(--red);   border:1px solid var(--red-border); }
.regime-NEUTRAL { background:var(--bg3); color:var(--text3); border:1px solid var(--border2); }

/* ── Earnings warning ──────────────────────────────────────── */
.earn-warn {
  background:rgba(245,158,11,.04); border:1px solid rgba(245,158,11,.18);
  border-radius:var(--r-md); padding:9px 12px;
  font-size:10px; color:var(--yellow);
  display:flex; align-items:flex-start; gap:7px; line-height:1.6;
}

/* ── Divider ───────────────────────────────────────────────── */
.divider { height:1px; background:var(--border); margin:10px 0; }

/* ── KV row ────────────────────────────────────────────────── */
.kv-row { display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid var(--border); }
.kv-row:last-child { border-bottom:none; }
.kv-key  { font-size:9px; color:var(--text3); }
.kv-val  { font-size:9px; font-family:'DM Mono',monospace; color:var(--text); }

/* ── Score bar ─────────────────────────────────────────────── */
.score-track { height:2px; background:var(--border2); border-radius:2px; overflow:hidden; }
.score-fill  { height:100%; border-radius:2px; transition:width .4s ease; }

/* ── Pos card ──────────────────────────────────────────────── */
.pos-card {
  background:var(--bg3); border:1px solid var(--border);
  border-radius:var(--r-lg); padding:12px 14px;
  margin-bottom:7px; position:relative; overflow:hidden;
  transition:border-color .2s;
}
.pos-card::before { content:''; position:absolute; top:0; left:0; bottom:0; width:3px; }
.pos-card.pos-up::before   { background:var(--green); }
.pos-card.pos-down::before { background:var(--red); }

/* ── Hot table ─────────────────────────────────────────────── */
.hot-tab {
  flex:1; background:none; border:none;
  border-bottom:2px solid transparent;
  padding:9px 0; font-size:8px;
  letter-spacing:.08em; font-family:'DM Mono',monospace;
  cursor:pointer; transition:color .15s,border-color .15s; color:var(--text3);
}
.hot-tab:hover { color:var(--text2); }

/* ── Right sidebar ─────────────────────────────────────────── */
.sidebar {
  background:var(--bg2); border-left:1px solid var(--border);
  display:flex; flex-direction:column; overflow-y:auto;
}
.sidebar-section { padding:12px 12px 0; }

/* ── Status rows ───────────────────────────────────────────── */
.status-row { display:flex; justify-content:space-between; align-items:center; padding:3px 0; }
.status-key { font-size:8px; color:var(--text3); font-family:'DM Mono',monospace; letter-spacing:.06em; }
.status-val { font-size:8px; font-family:'DM Mono',monospace; font-weight:600; letter-spacing:.04em; }

/* ── Bot toggle ────────────────────────────────────────────── */
.bot-toggle {
  width:36px; height:20px; border-radius:10px; border:none;
  position:relative; cursor:pointer; transition:background .2s, box-shadow .2s;
}
.bot-toggle.on  { background:var(--accent); box-shadow:0 0 8px rgba(245,158,11,.3); }
.bot-toggle.off { background:var(--border2); }
.bot-knob {
  position:absolute; width:14px; height:14px; border-radius:50%;
  background:#fff; top:3px; transition:left .18s cubic-bezier(.34,1.56,.64,1);
  box-shadow:0 1px 4px rgba(0,0,0,.4);
}
.bot-toggle.on  .bot-knob { left:19px; }
.bot-toggle.off .bot-knob { left:3px; }

/* ── News items ────────────────────────────────────────────── */
.news-item {
  display:flex; gap:10px; padding:11px 14px;
  border-bottom:1px solid var(--border);
  transition:background .12s; cursor:pointer;
}
.news-item:hover { background:var(--bg4); }
.news-title { font-size:11px; color:var(--text); line-height:1.5; }
.news-meta  { font-size:9px; color:var(--text3); margin-top:4px; font-family:'DM Mono',monospace; }

/* ── Section header ────────────────────────────────────────── */
.sec-label {
  font-size:8px; color:var(--text3); letter-spacing:.14em;
  font-family:'DM Mono',monospace; text-transform:uppercase; margin-bottom:5px;
}

/* ── Panel header (inside content areas) ──────────────────── */
.panel-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-bottom: 1px solid var(--border);
  background: var(--bg2); flex-shrink: 0;
}
.panel-title {
  font-size: 9px; font-family: 'DM Mono', monospace;
  letter-spacing: .14em; color: var(--text3); text-transform: uppercase;
}

/* ── Main content pane ─────────────────────────────────────── */
.pane {
  flex: 1; overflow-y: auto; padding: 12px 14px 32px;
}

/* ── Dashboard grid ────────────────────────────────────────── */
.dash-grid {
  display: grid;
  grid-template-columns: 1fr 330px;
  grid-template-rows: auto 1fr;
  gap: 0;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.dash-main {
  display: flex; flex-direction: column;
  border-right: 1px solid var(--border);
  overflow: hidden;
}
.dash-right {
  display: flex; flex-direction: column;
  overflow: hidden;
}
/* ── Indicator strip cell ──────────────────────────────────── */
.ind-card {
  display: flex; flex-direction: column; gap: 2px;
  padding: 7px 14px; flex-shrink: 0;
  border-right: 1px solid var(--border);
}
.ind-card:last-child { border-right: none; }
.ind-key { font-size: 7px; color: var(--text3); font-family: 'DM Mono', monospace; letter-spacing: .1em; }
.ind-val { font-size: 11px; font-family: 'DM Mono', monospace; font-weight: 600; color: var(--text2); }

/* ── Market split layout ──────────────────────────────────── */
.market-split {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 10px;
  min-height: 0;
}
.market-split-right {
  overflow-y: auto;
  background: var(--bg2);
}

/* ── Price display — Outfit with tabular nums ─────────────── */
.price-big {
  font-family: 'Outfit', sans-serif;
  font-variant-numeric: tabular-nums;
  font-size: 40px; font-weight: 700;
  line-height: 1; letter-spacing: -.02em;
}
.price-change {
  font-family: 'Outfit', sans-serif;
  font-variant-numeric: tabular-nums;
  font-size: 20px; font-weight: 600; line-height: 1;
}
.price-changepct {
  font-family: 'Outfit', sans-serif;
  font-variant-numeric: tabular-nums;
  font-size: 16px; font-weight: 500;
}
