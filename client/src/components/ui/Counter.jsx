import { useState, useEffect } from 'react';

const fmtIN = (n) => {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  const l = s.slice(-3);
  return s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + l;
};

export default function Counter({ target, pre = '', suf = '' }) {
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!target) return;
    let c = 0;
    const step = target / 50;
    const t = setInterval(() => {
      c = Math.min(c + step, target);
      setV(c);
      if (c >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [target]);

  const show = target < 10 ? Number(v).toFixed(1) : fmtIN(v);
  return <>{pre}{show}{suf}</>;
}

export { fmtIN };
