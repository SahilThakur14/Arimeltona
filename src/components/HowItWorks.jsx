function Section({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text)', letterSpacing: '.02em' }}>{title}</h2>
      </div>
      <div style={{ paddingLeft: 28 }}>{children}</div>
    </div>
  );
}

function P({ children }) {
  return <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 10 }}>{children}</p>;
}

function Highlight({ children }) {
  return <span style={{ color: 'var(--text)', fontWeight: 500 }}>{children}</span>;
}

function Accent({ children }) {
  return <span style={{ color: 'var(--accent)', fontFamily: "'DM Mono',monospace", fontSize: 12 }}>{children}</span>;
}

function Good({ children }) {
  return <span style={{ color: 'var(--green)' }}>{children}</span>;
}

function Bad({ children }) {
  return <span style={{ color: 'var(--red)' }}>{children}</span>;
}

function Rule({ pts, name, desc }) {
  const ptColor = pts === 'GATE' ? 'var(--yellow)' : pts === 'REGIME' ? 'var(--blue)' : pts === '+3' ? 'var(--green)' : '#4ade80';
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: ptColor, minWidth: 48, fontWeight: 700, paddingTop: 2 }}>{pts}</span>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.55 }}>{desc}</div>
      </div>
    </div>
  );
}

function ExitRule({ color, name, desc }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 12, color, fontWeight: 600, marginBottom: 2 }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.55 }}>{desc}</div>
      </div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div style={{ background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)',
      borderRadius: 8, padding: '10px 14px', fontSize: 11, color: 'var(--yellow)',
      lineHeight: 1.65, marginTop: 10 }}>
      ⚠ {children}
    </div>
  );
}

function InfoBox({ children }) {
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '12px 16px', fontSize: 11, color: 'var(--text2)',
      lineHeight: 1.7, marginTop: 10 }}>
      {children}
    </div>
  );
}

export default function HowItWorks() {
  return (
    <div style={{ maxWidth: 780, paddingBottom: 60 }}>

      {/* Hero */}
      <div style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)',
        borderRadius: 12, padding: '20px 24px', marginBottom: 32 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800,
          color: 'var(--accent)', letterSpacing: '.04em', marginBottom: 8 }}>
          ARIMELTONA PAPER TRADER
        </div>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, margin: 0 }}>
          A simulated stock trading platform that uses <Highlight>real live prices from Yahoo Finance</Highlight> but <Highlight>fake money</Highlight>.
          Nothing you do here costs a single real dollar — but every price, signal, and market condition is 100% real.
          The goal is to test and understand a trading strategy before risking real capital.
        </p>
      </div>

      <Section icon="💰" title="The Money">
        <P>You start with <Highlight>$10,000 of virtual cash</Highlight>. Every buy reduces that cash. Every sell returns it.
          Your <Highlight>portfolio equity</Highlight> is cash plus the current market value of all open positions.
          If you're up, equity rises above $10,000. If you're down, it falls below.</P>
        <P>The <Highlight>2% position sizing rule</Highlight> means every single trade is exactly 2% of your total portfolio value.
          With $10,000 that's $200 per trade. This is intentional — it prevents any one bad trade from wrecking your account.
          In the real world, professional traders often risk 1–2% per trade for exactly this reason.</P>
      </Section>

      <Section icon="📡" title="Where the Prices Come From">
        <P>Every <Highlight>15 seconds</Highlight>, the app calls Yahoo Finance and asks for the latest price of every stock it's tracking.
          Yahoo sends back real market prices — the same ones you'd see on any financial website.</P>
        <P>Those prices get assembled into <Highlight>5-minute bars</Highlight>. Each bar records four prices:
          the price at the <Good>open</Good> of that 5-minute window, the <Good>highest</Good> price seen,
          the <Bad>lowest</Bad> price seen, and the <Good>closing</Good> price at the end.
          This is standard — every chart you've ever seen in finance uses this format.</P>
        <P>If Yahoo is unavailable, <Highlight>the app completely stops trading</Highlight>. It will never use fake or made-up prices.
          You'll see "STALE" in the header when prices haven't refreshed recently.</P>
        <Warning>The app only trades during NYSE regular hours: 9:30 AM – 4:00 PM Eastern, Monday through Friday.
          Outside those hours, every button and bot is automatically disabled.</Warning>
      </Section>

      <Section icon="🧠" title="How the Signal Engine Works — The Brain">
        <P>This is the most important part. Every time new prices arrive, the app runs each stock's price history through
          <Highlight> 10 separate tests</Highlight>, each asking a different question about whether the stock is likely to go up.
          Points are awarded. Score 5 or more bull points and it's a potential BUY signal.</P>

        <div style={{ marginBottom: 12 }}>
          <Rule pts="+3" name="Moving Average Alignment"
            desc="The 10-day, 20-day, and 50-day average prices must all be stacked upward — each shorter one above each longer one. This is the most powerful single filter. It means the stock has been consistently climbing over multiple timeframes." />
          <Rule pts="+2" name="Regression Slope (R² confirmed)"
            desc="Draw a straight line through the last 100 minutes of price data. Is it pointing up? More importantly, is the data tightly clustered around that line? If the line points up but the prices are all over the place, it's rejected. Confirmed trend only." />
          <Rule pts="+2" name="Momentum (5-bar and 10-bar)"
            desc="Not just 'going up' but accelerating. Price must be higher than 5 bars ago AND 10 bars ago by a meaningful amount. Measures whether a move is building or stalling." />
          <Rule pts="+2" name="RSI (Relative Strength Index)"
            desc="RSI measures whether a stock is overbought or oversold on a 0–100 scale. The sweet spot is 50–60: the stock has momentum but isn't yet stretched. Below 30 also scores (oversold bounce opportunity). Above 70 earns bear points — too extended." />
          <Rule pts="+2" name="MACD Crossover"
            desc="MACD compares a fast and slow moving average. When the fast one crosses above the slow one AND both are above zero AND the histogram (their gap) is growing — that's a confirmed bullish signal." />
          <Rule pts="+1" name="Bollinger Band Position"
            desc="Bollinger Bands are a price envelope. Being near the lower band suggests the stock may bounce upward from support. Small bonus point for entries with this setup." />
          <Rule pts="+1" name="Volume Spike"
            desc="Volume is the number of shares traded. A spike above 1.5× the normal average means real buyers are behind the move — not just noise or thin trading." />
          <Rule pts="+1" name="Sector Momentum"
            desc="If most of today's hot stocks are in tech, a tech buy signal is more trustworthy. The app groups stocks by sector and scores whether the overall sector is in an uptrend." />
          <Rule pts="GATE" name="Consecutive Signal (Two Readings)"
            desc="The signal must appear on two separate price updates — roughly 30 seconds apart. A single flash could be noise. Two genuine independent readings means conviction. This single rule eliminates most false breakouts." />
          <Rule pts="GATE" name="News Sentiment"
            desc="The app fetches recent headlines from Yahoo Finance. If there are 2+ negative headlines about a stock (words like 'lawsuit', 'recall', 'misses', 'downgrade'), the BUY is suppressed entirely. Bad news can move a stock 20% in seconds." />
          <Rule pts="GATE" name="Earnings Guard"
            desc="If a company reports earnings within 2 days, no new positions are opened. Earnings can gap a stock up or down 15–20% at market open — blowing straight through any stop-loss." />
          <Rule pts="GATE" name="Risk/Reward Check"
            desc="The potential profit (take-profit distance) must be at least 2× the potential loss (stop-loss distance). If the math doesn't work, the trade is skipped regardless of the score." />
          <Rule pts="REGIME" name="SPY Market Regime"
            desc="SPY (the S&P 500 index ETF) is analyzed with the same signal engine. If the overall market is in a downtrend, the entry threshold rises from 5 to 7 points. In bear markets, the strategy gets much more selective." />
        </div>

        <InfoBox>
          A stock has to pass all 4 hard gates AND score 5+ points to get a BUY signal. It then has to
          score again on the next price update to confirm. Only then does the bot act on it.
          This is deliberately strict — fewer trades, higher quality entries.
        </InfoBox>
      </Section>

      <Section icon="🤖" title="The Auto Bot">
        <P>When you flip the <Highlight>AUTO BOT</Highlight> switch in the header, the bot runs the signal engine
          on every stock in its watchlist every time prices update (~every 15 seconds).
          When a stock qualifies, it buys automatically using exactly 2% of your portfolio.</P>
        <P>The bot respects all the same gates as manual trading — market hours, news, earnings, signal quality.
          The only difference is it acts automatically, without you clicking.</P>
        <P>The <Highlight>drawdown circuit breaker</Highlight> is a safety valve: if your portfolio drops 8% from its
          highest point, the bot automatically pauses all new buys. It won't dig the hole deeper.
          You can manually reset it once you've reviewed what happened.</P>
        <P>The <Highlight>time-of-day filter</Highlight> raises the entry threshold to 9 points during the first
          and last 30 minutes of the trading session (9:30–10:00 AM and 3:30–4:00 PM).
          These windows have higher volatility and more false breakouts. The bot gets pickier automatically.</P>
      </Section>

      <Section icon="🚪" title="The Exit System — 6 Ways a Trade Closes">
        <P>Knowing when to <Bad>get out</Bad> matters as much as knowing when to get in.
          Every open position is checked every 15 seconds against these conditions:</P>

        <ExitRule color="var(--green)" name="① Partial Exit at +5% (Scale Out)"
          desc="When a position reaches +5% profit, HALF the position is sold automatically. This locks in real gains while keeping the other half open to run further. Professional traders call this 'scaling out' — you can't lose on the trade after this point." />
        <ExitRule color="var(--green)" name="② Take-Profit at +8% (Full Exit)"
          desc="Hard ceiling. If a position is up 8%, everything is sold. No exceptions. Greed is the enemy of good trading — knowing when to take the money is a skill." />
        <ExitRule color="var(--red)" name="③ ATR Dynamic Stop-Loss"
          desc="ATR (Average True Range) measures how volatile a stock normally is. The stop-loss is set at 1.5× that normal volatility. A calm stock gets a tight stop (~2–3%). A volatile stock gets more room (up to 8%). This adapts to each stock rather than using a one-size-fits-all percentage." />
        <ExitRule color="var(--red)" name="④ Momentum Reversal"
          desc="The regression line on post-entry prices has genuinely turned negative (confirmed by R² quality score). This exits before the hard stop is hit — early detection of a trend reversing. Saves money compared to waiting for the stop-loss." />
        <ExitRule color="var(--yellow)" name="⑤ Profit Fading"
          desc="The position was profitable, the slope was positive, but now the slope is declining. Momentum is fading. Exit while still in profit rather than riding it back to zero." />
        <ExitRule color="var(--yellow)" name="⑥ Stagnation"
          desc="Price has barely moved for 8+ consecutive ticks AND the R² score confirms there's genuinely no trend. The capital is doing nothing. Sell it and redeploy it into something that's actually moving." />

        <InfoBox>
          The partial exit at +5% is the most important improvement for long-term performance.
          Even if the second half gets stopped out at the ATR stop, you've still made money on the first half.
          It converts "wins that became losses" into "wins that became smaller wins."
        </InfoBox>
      </Section>

      <Section icon="📰" title="The Three Intelligence Layers">
        <P><Highlight>News Sentiment</Highlight> — The app fetches recent headlines from Yahoo Finance every 5 minutes.
          Each headline is scored by scanning for positive words (beats, surges, approval, upgrade) and negative words
          (misses, lawsuit, recall, downgrade, bankruptcy). The net sentiment is shown as a colored dot next to each headline.
          If a stock has 2+ bearish headlines, the bot won't open new positions in it.</P>
        <P><Highlight>Earnings Calendar</Highlight> — Yahoo Finance exposes each company's next scheduled earnings date.
          Within 48 hours of earnings, the app shows a warning badge and the bot blocks all new entries.
          Earnings releases are the most common cause of catastrophic overnight gaps — a stock can open 15–20% higher or lower
          the next morning, completely bypassing your stop-loss.</P>
        <P><Highlight>SPY Regime Filter</Highlight> — SPY is the most widely-traded ETF in the world, tracking the S&P 500.
          The same 10-point signal engine runs on SPY's price history continuously. When SPY is in a downtrend (BEAR regime),
          roughly 70% of individual stocks will also trend down regardless of their individual signals.
          In BEAR mode, every stock needs 7 bull points to qualify instead of 5 — the strategy gets defensive automatically.</P>
      </Section>

      <Section icon="📊" title="The Backtest">
        <P>Before trusting the bot with live paper trading, you can replay the strategy on historical data.
          The backtest tab takes the last 5 days of real Yahoo Finance price data for any symbol you choose,
          then simulates exactly what the bot would have done — bar by bar, using the same signal engine,
          same consecutive signal gate, same ATR stops, same exits.</P>
        <P>After running, you'll see: total return, win rate, max drawdown, profit factor, and crucially —
          a breakdown of how each trade exited. If <Good>take-profit</Good> dominates the exit reasons,
          the strategy is working on that symbol. If <Bad>atr-stop</Bad> dominates, the entries are wrong.</P>
        <Warning>
          Honest limitations: the backtest only covers 5 days of data (Yahoo's free limit).
          It also has selection bias — you're backtesting on stocks that are hot <em>today</em>,
          which isn't the same as stocks that were hot on a random day a year ago. Treat backtest
          results as directional evidence, not a guarantee of future performance.
        </Warning>
      </Section>

      <Section icon="⚡" title="Technical Notes (For the Curious)">
        <P>The app is built in <Highlight>React</Highlight> running locally on your machine via Vite.
          It has no backend server — everything runs in your browser tab.
          Prices are fetched through a local proxy (the Vite dev server) that adds a browser User-Agent header
          so Yahoo Finance accepts the requests.</P>
        <P>All portfolio data is saved to <Highlight>localStorage</Highlight> — the browser's built-in storage.
          This means your trades and portfolio survive page refreshes, but are specific to this browser on this computer.
          Clearing browser data will reset everything (or you can use the ↺ reset button in the header).</P>
        <P>The app uses <Highlight>DM Mono</Highlight> for financial numbers (because monospace keeps columns aligned),
          <Highlight>Outfit</Highlight> for general text, and <Highlight>Syne</Highlight> for headings.
          Charts are built with Recharts. No external financial data provider is used — everything goes through Yahoo Finance's
          unofficial endpoints, which are free but could change without notice.</P>
        <InfoBox>
          <strong style={{ color: 'var(--text)' }}>This is a paper trading simulator for educational purposes.</strong>
          {' '}Past performance of any strategy shown here does not predict future real-money results.
          Markets are unpredictable. Real trading involves real risk. Never trade more than you can afford to lose.
        </InfoBox>
      </Section>

    </div>
  );
}
