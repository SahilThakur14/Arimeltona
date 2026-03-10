import { useState, useEffect, useRef } from 'react';

const VISITOR_PASS = 'welcome';
const ADMIN_PASS   = 'fpp24to25';

// Animated background grid
function GridBackground() {
  return (
    <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:.07,pointerEvents:'none'}} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4d87f6" strokeWidth="0.5"/>
        </pattern>
        <pattern id="grid2" width="200" height="200" patternUnits="userSpaceOnUse">
          <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#4d87f6" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      <rect width="100%" height="100%" fill="url(#grid2)"/>
    </svg>
  );
}

// Floating particles
function Particles() {
  const particles = Array.from({length: 24}, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 6,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none'}}>
      {particles.map(p => (
        <div key={p.id} style={{
          position:'absolute',
          left: p.x + '%',
          top: p.y + '%',
          width: p.size,
          height: p.size,
          borderRadius: '50%',
          background: '#4d87f6',
          opacity: p.opacity,
          animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
        }}/>
      ))}
    </div>
  );
}

// Scanline overlay
function Scanlines() {
  return (
    <div style={{
      position:'absolute',inset:0,pointerEvents:'none',
      background:'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.08) 2px, rgba(0,0,0,.08) 4px)',
      zIndex:1,
    }}/>
  );
}

// Blinking cursor
function Cursor() {
  const [vis, setVis] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setVis(v => !v), 530);
    return () => clearInterval(id);
  }, []);
  return <span style={{opacity: vis ? 1 : 0, color:'#4d87f6', fontWeight:700}}>█</span>;
}

export default function LockScreen({ onAuth }) {
  const [adminPw, setAdminPw]       = useState('');
  const [visitorPw, setVisitorPw]   = useState('');
  const [adminState, setAdminState] = useState('idle');   // idle | error | success
  const [visState, setVisState]     = useState('idle');
  const [adminMsg, setAdminMsg]     = useState('');
  const [visMsg, setVisMsg]         = useState('');
  const [phase, setPhase]           = useState('enter');  // enter | granted
  const [grantedRole, setGrantedRole] = useState('');
  const adminRef  = useRef();
  const visitorRef = useRef();

  function shake(setter) {
    setter('error');
    setTimeout(() => setter('idle'), 600);
  }

  function tryAdmin(e) {
    e?.preventDefault();
    if (adminPw === ADMIN_PASS) {
      setAdminState('success');
      setAdminMsg('ACCESS GRANTED');
      setGrantedRole('admin');
      setPhase('granted');
      setTimeout(() => onAuth('admin'), 1600);
    } else {
      shake(setAdminState);
      setAdminMsg('ACCESS DENIED — INVALID CREDENTIALS');
      setTimeout(() => setAdminMsg(''), 2000);
      setAdminPw('');
    }
  }

  function tryVisitor(e) {
    e?.preventDefault();
    if (visitorPw === VISITOR_PASS) {
      setVisState('success');
      setVisMsg('ACCESS GRANTED');
      setGrantedRole('visitor');
      setPhase('granted');
      setTimeout(() => onAuth('visitor'), 1600);
    } else {
      shake(setVisState);
      setVisMsg('ACCESS DENIED — INVALID CREDENTIALS');
      setTimeout(() => setVisMsg(''), 2000);
      setVisitorPw('');
    }
  }

  // Granted overlay
  if (phase === 'granted') {
    return (
      <div style={{
        position:'fixed',inset:0,zIndex:9999,
        background:'#03060e',
        display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
        animation:'grantedFadeOut 1.6s ease forwards',
      }}>
        <GridBackground />
        <Scanlines />
        <div style={{textAlign:'center',zIndex:2}}>
          <div style={{
            fontSize:11,fontFamily:"'DM Mono',monospace",letterSpacing:'.3em',
            color:'var(--green)',marginBottom:16,
            animation:'pulse 0.4s ease infinite',
          }}>
            ● IDENTITY VERIFIED
          </div>
          <div style={{
            fontSize:28,fontFamily:"'Syne',sans-serif",fontWeight:800,
            color:'var(--green)',letterSpacing:'.1em',marginBottom:8,
            textShadow:'0 0 30px rgba(0,201,138,.6), 0 0 60px rgba(0,201,138,.3)',
          }}>
            ACCESS GRANTED
          </div>
          <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:'.2em',color:'var(--text3)'}}>
            ENTERING AS {grantedRole.toUpperCase()} — INITIALIZING DASHBOARD
          </div>
          {/* Loading bar */}
          <div style={{marginTop:24,width:320,height:2,background:'var(--border2)',borderRadius:2,overflow:'hidden',margin:'24px auto 0'}}>
            <div style={{height:'100%',background:'var(--green)',borderRadius:2,animation:'loadBar 1.4s ease forwards'}}/>
          </div>
        </div>
      </div>
    );
  }

  const panelBase = {
    background:'rgba(6,11,22,.85)',
    border:'1px solid',
    borderRadius:12,
    padding:'28px 24px',
    width:280,
    display:'flex',flexDirection:'column',gap:16,
    backdropFilter:'blur(12px)',
    position:'relative',overflow:'hidden',
    transition:'all .2s',
  };

  const adminBorder = adminState==='error' ? '#ef4461'
    : adminState==='success' ? '#00c98a' : 'rgba(77,135,246,.25)';
  const visBorder   = visState==='error'   ? '#ef4461'
    : visState==='success'   ? '#00c98a' : 'rgba(77,135,246,.15)';

  return (
    <>
      <style>{`
        @keyframes floatParticle {
          from { transform: translateY(0px) translateX(0px); }
          to   { transform: translateY(-30px) translateX(15px); }
        }
        @keyframes loadBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes grantedFadeOut {
          0%   { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes shakeX {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-5px); }
          80%     { transform: translateX(5px); }
        }
        @keyframes lockSweep {
          0%   { background-position: 200% 0; }
          50%  { background-position:   0% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes glowPulse {
          0%,100% { opacity: .5; }
          50%     { opacity: 1; }
        }
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:none; }
        }
        .lock-panel-shake { animation: shakeX .5s ease; }
        .lock-input {
          width: 100%; background: rgba(3,6,14,.8);
          border: 1px solid rgba(77,135,246,.2);
          border-radius: 6px; padding: 10px 12px;
          color: #4d87f6; font-family: 'DM Mono', monospace;
          font-size: 13px; outline: none; letter-spacing: .08em;
          transition: border-color .15s, box-shadow .15s;
          box-sizing: border-box;
        }
        .lock-input:focus {
          border-color: rgba(77,135,246,.6);
          box-shadow: 0 0 0 2px rgba(77,135,246,.1), 0 0 16px rgba(77,135,246,.1);
        }
        .lock-input::placeholder { color: rgba(77,135,246,.3); letter-spacing: .08em; }
        .lock-btn {
          width: 100%; padding: 11px;
          border-radius: 6px; border: 1px solid;
          font-family: 'DM Mono', monospace;
          font-size: 10px; font-weight: 700;
          letter-spacing: .14em; cursor: pointer;
          transition: all .15s;
        }
        .lock-btn-visitor {
          background: rgba(77,135,246,.08);
          border-color: rgba(77,135,246,.25);
          color: #4d87f6;
        }
        .lock-btn-visitor:hover {
          background: rgba(77,135,246,.16);
          box-shadow: 0 0 20px rgba(77,135,246,.15);
        }
        .lock-btn-admin {
          background: rgba(245,158,11,.08);
          border-color: rgba(245,158,11,.3);
          color: #f59e0b;
        }
        .lock-btn-admin:hover {
          background: rgba(245,158,11,.16);
          box-shadow: 0 0 20px rgba(245,158,11,.2);
        }
      `}</style>

      <div style={{
        position:'fixed',inset:0,zIndex:9999,
        background:'#03060e',
        display:'flex',flexDirection:'column',
        alignItems:'center',justifyContent:'center',
        gap:40, overflow:'hidden',
      }}>
        <GridBackground />
        <Particles />
        <Scanlines />

        {/* ── Brand ── */}
        <div style={{textAlign:'center',zIndex:2,animation:'fadeInUp .6s ease forwards'}}>
          {/* Logo */}
          <div style={{marginBottom:12,display:'flex',justifyContent:'center'}}>
            <svg width="44" height="44" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="4.5" fill="#4d87f6" opacity=".9"/>
              <circle cx="18" cy="18" r="3" fill="#e0edf8"/>
              <line x1="18" y1="13.5" x2="18" y2="4"  stroke="#4d87f6" strokeWidth="2" strokeLinecap="round"/>
              <line x1="18" y1="22.5" x2="18" y2="32" stroke="#4d87f6" strokeWidth="2" strokeLinecap="round"/>
              <line x1="13.5" y1="18" x2="4"  y2="18" stroke="#4d87f6" strokeWidth="2" strokeLinecap="round"/>
              <line x1="22.5" y1="18" x2="32" y2="18" stroke="#4d87f6" strokeWidth="2" strokeLinecap="round"/>
              <rect x="14.5" y="1"    width="7" height="4.5" rx="1.5" fill="#94b8d8"/>
              <rect x="14.5" y="30.5" width="7" height="4.5" rx="1.5" fill="#94b8d8"/>
              <rect x="1"    y="14.5" width="4.5" height="7" rx="1.5" fill="#94b8d8"/>
              <rect x="30.5" y="14.5" width="4.5" height="7" rx="1.5" fill="#94b8d8"/>
              <path d="M11 11 L6 6 L9 11 L6 9 Z"    fill="#4d87f6" opacity=".5"/>
              <path d="M25 11 L30 6 L27 11 L30 9 Z"  fill="#4d87f6" opacity=".5"/>
              <path d="M11 25 L6 30 L9 25 L6 27 Z"   fill="#4d87f6" opacity=".5"/>
              <path d="M25 25 L30 30 L27 25 L30 27 Z" fill="#4d87f6" opacity=".5"/>
            </svg>
          </div>
          {/* Name */}
          <div style={{
            fontFamily:"'Syne',sans-serif", fontSize:32, fontWeight:800,
            letterSpacing:'.1em', lineHeight:1,
            background:'linear-gradient(100deg, #4d87f6 0%, #94b8d8 18%, #dce8f5 32%, #fff 42%, #fce38a 52%, #f59e0b 60%, #94b8d8 75%, #4d87f6 100%)',
            backgroundSize:'250% 100%',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            backgroundClip:'text',
            animation:'lockSweep 4s ease-in-out infinite',
          }}>
            ARIMELTONA
          </div>
          <div style={{
            fontFamily:"'DM Mono',monospace", fontSize:9,
            letterSpacing:'.28em', color:'rgba(77,135,246,.5)',
            marginTop:6, textTransform:'uppercase',
          }}>
            Secure Terminal Access
          </div>
          {/* Divider line */}
          <div style={{
            width:200, height:1, margin:'14px auto 0',
            background:'linear-gradient(90deg, transparent, rgba(77,135,246,.4), transparent)',
            animation:'glowPulse 2s ease-in-out infinite',
          }}/>
        </div>

        {/* ── Two panels ── */}
        <div style={{
          display:'flex', gap:16, zIndex:2,
          animation:'fadeInUp .6s ease .15s both',
        }}>

          {/* VISITOR panel */}
          <div
            className={visState==='error' ? 'lock-panel-shake' : ''}
            style={{...panelBase, borderColor: visBorder}}
          >
            {/* Corner accent */}
            <div style={{position:'absolute',top:0,left:0,width:30,height:30,
              borderTop:'2px solid rgba(77,135,246,.3)',borderLeft:'2px solid rgba(77,135,246,.3)',
              borderRadius:'12px 0 0 0',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:0,right:0,width:30,height:30,
              borderBottom:'2px solid rgba(77,135,246,.3)',borderRight:'2px solid rgba(77,135,246,.3)',
              borderRadius:'0 0 12px 0',pointerEvents:'none'}}/>

            <div>
              <div style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:'.2em',
                color:'rgba(77,135,246,.5)',marginBottom:4}}>ACCESS LEVEL</div>
              <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",fontWeight:700,
                color:'#4d87f6',letterSpacing:'.08em'}}>VISITOR</div>
            </div>

            <div style={{fontSize:10,color:'rgba(220,232,245,.4)',lineHeight:1.7,fontFamily:"'DM Mono',monospace"}}>
              · View all market data<br/>
              · Browse charts & signals<br/>
              · Read-only access<br/>
              <span style={{color:'rgba(239,68,97,.4)'}}>· Trading disabled</span>
            </div>

            <form onSubmit={tryVisitor} style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{position:'relative'}}>
                <input
                  ref={visitorRef}
                  className="lock-input"
                  type="password"
                  value={visitorPw}
                  onChange={e => setVisitorPw(e.target.value)}
                  placeholder="enter access code"
                  autoComplete="off"
                />
              </div>
              {visMsg && (
                <div style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:'.08em',
                  color: visState==='success' ? '#00c98a' : '#ef4461',
                  textAlign:'center'}}>
                  {visMsg}
                </div>
              )}
              <button type="submit" className="lock-btn lock-btn-visitor">
                ENTER AS VISITOR →
              </button>
            </form>
          </div>

          {/* Vertical divider */}
          <div style={{
            width:1, alignSelf:'stretch',
            background:'linear-gradient(180deg, transparent, rgba(77,135,246,.2), transparent)',
          }}/>

          {/* ADMIN panel */}
          <div
            className={adminState==='error' ? 'lock-panel-shake' : ''}
            style={{...panelBase, borderColor: adminBorder}}
          >
            {/* Corner accents */}
            <div style={{position:'absolute',top:0,left:0,width:30,height:30,
              borderTop:'2px solid rgba(245,158,11,.3)',borderLeft:'2px solid rgba(245,158,11,.3)',
              borderRadius:'12px 0 0 0',pointerEvents:'none'}}/>
            <div style={{position:'absolute',bottom:0,right:0,width:30,height:30,
              borderBottom:'2px solid rgba(245,158,11,.3)',borderRight:'2px solid rgba(245,158,11,.3)',
              borderRadius:'0 0 12px 0',pointerEvents:'none'}}/>

            <div>
              <div style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:'.2em',
                color:'rgba(245,158,11,.5)',marginBottom:4}}>ACCESS LEVEL</div>
              <div style={{fontSize:18,fontFamily:"'Syne',sans-serif",fontWeight:700,
                color:'#f59e0b',letterSpacing:'.08em'}}>ADMIN</div>
            </div>

            <div style={{fontSize:10,color:'rgba(220,232,245,.4)',lineHeight:1.7,fontFamily:"'DM Mono',monospace"}}>
              · Full trading access<br/>
              · Bot controls enabled<br/>
              · Portfolio management<br/>
              <span style={{color:'rgba(245,158,11,.5)'}}>· Restricted access</span>
            </div>

            <form onSubmit={tryAdmin} style={{display:'flex',flexDirection:'column',gap:10}}>
              <div style={{
                background:'rgba(3,6,14,.9)', border:'1px solid rgba(245,158,11,.2)',
                borderRadius:6, padding:'9px 12px',
                fontFamily:"'DM Mono',monospace", fontSize:12,
                color:'#f59e0b', letterSpacing:'.06em',
                display:'flex', alignItems:'center', gap:6,
              }}>
                <span style={{color:'rgba(245,158,11,.4)',fontSize:10}}>root@arimeltona:~$</span>
                <input
                  ref={adminRef}
                  type="password"
                  value={adminPw}
                  onChange={e => setAdminPw(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="off"
                  style={{
                    background:'none', border:'none', outline:'none',
                    color:'#f59e0b', fontFamily:"'DM Mono',monospace",
                    fontSize:12, flex:1, letterSpacing:'.1em',
                    caretColor:'#f59e0b',
                  }}
                />
                <Cursor />
              </div>
              {adminMsg && (
                <div style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:'.08em',
                  color: adminState==='success' ? '#00c98a' : '#ef4461',
                  textAlign:'center'}}>
                  {adminMsg}
                </div>
              )}
              <button type="submit" className="lock-btn lock-btn-admin">
                AUTHENTICATE →
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          zIndex:2, textAlign:'center',
          animation:'fadeInUp .6s ease .3s both',
        }}>
          <div style={{fontSize:8,fontFamily:"'DM Mono',monospace",letterSpacing:'.16em',
            color:'rgba(77,135,246,.2)'}}>
            ARIMELTONA PAPER TRADING SYSTEM · UNAUTHORIZED ACCESS PROHIBITED
          </div>
        </div>
      </div>
    </>
  );
}
