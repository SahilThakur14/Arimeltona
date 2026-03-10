// ── Market hours utility ───────────────────────────────────────────────────
// All times in US/Eastern. NYSE hours: 9:30am–4:00pm Mon–Fri
// Pre-market 4am–9:30am and after-hours 4pm–8pm exist but we ignore them
// for this system — we ONLY trade regular session with confirmed prices.

export function getNYTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

export function getMarketStatus() {
  const ny = getNYTime();
  const day = ny.getDay(); // 0=Sun,6=Sat
  const h   = ny.getHours();
  const m   = ny.getMinutes();
  const mins = h * 60 + m;

  if (day === 0 || day === 6) {
    return { isOpen: false, reason: 'Weekend', nextOpen: nextOpenString(ny) };
  }

  // US federal holidays (static list for current year — good enough)
  const mmdd = String(ny.getMonth() + 1).padStart(2, '0') + '-' + String(ny.getDate()).padStart(2, '0');
  const holidays2025 = ['01-01','01-20','02-17','04-18','05-26','06-19','07-04','09-01','11-27','12-25'];
  const holidays2026 = ['01-01','01-19','02-16','04-03','05-25','06-19','07-03','09-07','11-26','12-25'];
  const allHolidays  = [...holidays2025, ...holidays2026];
  if (allHolidays.includes(mmdd)) {
    return { isOpen: false, reason: 'Market Holiday', nextOpen: nextOpenString(ny) };
  }

  const openMins  = 9 * 60 + 30;   // 9:30
  const closeMins = 16 * 60;        // 16:00

  if (mins < openMins) {
    const waitMins = openMins - mins;
    return { isOpen: false, reason: 'Pre-market', opensIn: waitMins, nextOpen: 'Today ' + formatTime(openMins) };
  }
  if (mins >= closeMins) {
    return { isOpen: false, reason: 'After-hours', nextOpen: nextOpenString(ny) };
  }

  // Within session
  const minsLeft = closeMins - mins;
  return {
    isOpen: true,
    reason: 'Regular session',
    minsLeft,
    closesAt: formatTime(closeMins),
    nyTime: formatTime(mins),
  };
}

function formatTime(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return (h > 12 ? h - 12 : h) + ':' + String(m).padStart(2, '0') + ' ' + ampm + ' ET';
}

function nextOpenString(ny) {
  const next = new Date(ny);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1);
  return next.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' 9:30 AM ET';
}
