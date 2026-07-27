import Counter from './Counter';

export default function KPI({ label, target, pre = '', suf = '', accent, trend, up }) {
  return (
    <div className="card" style={{ flex: 1, position: 'relative', overflow: 'hidden', paddingBottom: 16, minHeight: 96 }}>
      <div className="slb">{label}</div>
      <div style={{ fontFamily: 'Space Mono', fontSize: 26, fontWeight: 700, color: accent, marginBottom: 6, lineHeight: 1.1 }}>
        <Counter target={target} pre={pre} suf={suf} />
      </div>
      {trend && (
        <div style={{ fontSize: 11, color: up ? 'var(--tl)' : 'var(--rd)', display: 'flex', alignItems: 'center', gap: 3 }}>
          <span>{up ? '↑' : '↓'}</span>
          <span>{trend}</span>
          <span style={{ color: 'var(--mt)' }}> vs last month</span>
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: accent }} />
    </div>
  );
}
