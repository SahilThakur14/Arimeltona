# ARIMELTONA Paper Trader

Professional algorithmic paper trading dashboard. $10,000 virtual portfolio, live Yahoo Finance data, technical signal engine.

## Local Development

```bash
npm install
npm run dev
```
Open http://localhost:5173

## Deploy to Vercel (free)

1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import your GitHub repo
3. Framework: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Click Deploy

The `/api/yahoo` serverless function handles Yahoo Finance proxying automatically.

## Tech Stack
- React 18 + Vite
- Recharts for charting
- Yahoo Finance (proxied via Vercel serverless function)
- Pure CSS design system (no UI library)
