import Badge from '../ui/Badge';

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now - d) / 86400000);
  if (days === 0) return 'Today';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.ceil(days / 7)}w ago`;
  return `${Math.ceil(days / 30)}mo ago`;
};

export default function ViolationCard({ v, onClick }) {
  return (
    <div className="vrow" onClick={() => onClick(v)}>
      <div style={{ width: 64, height: 48, background: 'rgba(61,16,16,.9)', borderRadius: 3, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--rd)' }}>
        <div style={{ width: 28, height: 20, border: '1px solid rgba(255,69,69,.6)', background: 'rgba(255,69,69,.12)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
          <span style={{ fontFamily: 'Space Mono', fontSize: 12, color: 'var(--am)', fontWeight: 700 }}>{v.id}</span>
          <Badge status={v.status} />
        </div>
        <div style={{ fontSize: 13, color: 'var(--sc)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.35 }}>{v.address}</div>
        <div style={{ fontSize: 11, color: 'var(--mt)', lineHeight: 1.35 }}>{v.type}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 11, color: 'var(--mt)' }}>
            {v.ward_no || v.ward} · <span style={{ fontFamily: 'Space Mono' }}>{v.confidence}%</span> conf.
          </span>
          <span style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--mt)' }}>{timeAgo(v.detected_date)}</span>
        </div>
      </div>
      <span style={{ color: 'var(--mt)', fontSize: 16, alignSelf: 'center' }}>→</span>
    </div>
  );
}
