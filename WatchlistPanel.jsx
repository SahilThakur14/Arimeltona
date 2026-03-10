import { useState, useEffect, useRef } from 'react';

const toastBus = [];
let toastSetFn = null;
let idCounter  = 0;

export function toast(msg, type = 'info') {
  const id = ++idCounter;
  const item = { id, msg, type };
  if (toastSetFn) {
    toastSetFn(prev => [...prev.slice(-4), item]);
  } else {
    toastBus.push(item);
  }
}

const typeStyle = {
  info:    { bg:'var(--bg4)',    border:'var(--border3)',  text:'var(--text)',   icon:'◆' },
  success: { bg:'rgba(15,186,129,.08)', border:'var(--green-border)', text:'var(--green)',  icon:'✓' },
  error:   { bg:'rgba(240,75,106,.08)', border:'var(--red-border)',   text:'var(--red)',    icon:'✕' },
  warn:    { bg:'rgba(245,158,11,.06)', border:'rgba(245,158,11,.2)', text:'var(--yellow)', icon:'⚠' },
};

function ToastItem({ item, onRemove }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(item.id), 280);
    }, 3500);
    return () => clearTimeout(t);
  }, []);

  const s = typeStyle[item.type] || typeStyle.info;

  return (
    <div style={{
      display:'flex', alignItems:'flex-start', gap:9,
      padding:'10px 14px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius:'var(--r-md)',
      minWidth:240, maxWidth:320,
      boxShadow:'0 8px 24px rgba(0,0,0,.4)',
      transform: visible ? 'none' : 'translateY(10px)',
      opacity: visible ? 1 : 0,
      transition:'transform .28s cubic-bezier(.16,1,.3,1), opacity .25s ease',
      backdropFilter:'blur(8px)',
    }}>
      <span style={{fontSize:11,color:s.text,marginTop:1,flexShrink:0,fontFamily:"'DM Mono',monospace"}}>{s.icon}</span>
      <span style={{fontSize:12,color:s.text,lineHeight:1.5,flex:1}}>{item.msg}</span>
      <button onClick={()=>onRemove(item.id)} style={{
        background:'none',border:'none',color:s.text,opacity:.4,fontSize:12,
        padding:0,cursor:'pointer',marginLeft:4,flexShrink:0,lineHeight:1,
      }}>×</button>
    </div>
  );
}

export function ToastContainer() {
  const [items, setItems] = useState([]);
  toastSetFn = setItems;

  useEffect(() => {
    if (toastBus.length) {
      setItems(toastBus.splice(0));
    }
    return () => { toastSetFn = null; };
  }, []);

  const remove = id => setItems(p => p.filter(i => i.id !== id));

  return (
    <div style={{
      position:'fixed', bottom:22, right:22,
      display:'flex', flexDirection:'column', gap:8,
      zIndex:9999, pointerEvents:'none',
    }}>
      {items.map(item => (
        <div key={item.id} style={{pointerEvents:'all'}}>
          <ToastItem item={item} onRemove={remove} />
        </div>
      ))}
    </div>
  );
}
