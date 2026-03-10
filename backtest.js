import { useState, useEffect, useRef } from 'react';
import { fetchNews, fetchEarningsDate } from '../services/news.js';

const TTL = 5 * 60 * 1000;

export function useNews(symbol) {
  const [news,    setNews]    = useState(null);
  const [earnings,setEarnings]= useState(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef({});

  useEffect(() => {
    if (!symbol) return;
    const c = cache.current[symbol];
    if (c && Date.now() - c.ts < TTL) { setNews(c.news); setEarnings(c.earnings); return; }
    setLoading(true);
    Promise.all([fetchNews(symbol,8), fetchEarningsDate(symbol)]).then(([n,e]) => {
      cache.current[symbol] = { news:n, earnings:e, ts:Date.now() };
      setNews(n); setEarnings(e); setLoading(false);
    });
  }, [symbol]);

  function refresh() {
    delete cache.current[symbol];
    setLoading(true);
    Promise.all([fetchNews(symbol,8), fetchEarningsDate(symbol)]).then(([n,e]) => {
      cache.current[symbol] = { news:n, earnings:e, ts:Date.now() };
      setNews(n); setEarnings(e); setLoading(false);
    });
  }

  return { news, earnings, loading, refresh };
}
