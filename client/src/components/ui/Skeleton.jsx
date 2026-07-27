export default function ViewSkeleton() {
  return (
    <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      <div className="sk" style={{ height: 44, borderRadius: 6, width: '34%' }} />
      <div style={{ display: 'flex', gap: 10 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="sk" style={{ flex: 1, height: 92, borderRadius: 6 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, flex: 1 }}>
        <div className="sk" style={{ flex: '0 0 58%', borderRadius: 6 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <div className="sk" style={{ flex: 1, borderRadius: 6 }} />
          <div className="sk" style={{ flex: 1, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}
