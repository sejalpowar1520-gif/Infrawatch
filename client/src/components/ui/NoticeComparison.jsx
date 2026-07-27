export default function NoticeComparison({ comparison, isLoading, error, onClose }) {
  if (isLoading) {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="slb">NOTICE COMPARISON</div>
          {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--mt)' }}>×</button>}
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid var(--bd)', borderTop: '2px solid var(--am)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 8 }}>Comparing notices...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="slb">NOTICE COMPARISON</div>
          {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--mt)' }}>×</button>}
        </div>
        <div style={{ padding: '10px 12px', background: 'var(--rdd)', border: '1px solid var(--rd)', borderRadius: 4, fontSize: 11, color: 'var(--rd)' }}>
          ⚠️ {error}
        </div>
      </div>
    );
  }

  if (!comparison) return null;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="slb">NOTICE COMPARISON</div>
        {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--mt)' }}>×</button>}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--bd)', borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: 'var(--mt)', marginBottom: 4 }}>TEMPLATE NOTICE</div>
          <div style={{ display: 'flex', gap: 8, fontSize: 10, fontFamily: 'Space Mono' }}>
            <div>
              <div style={{ color: 'var(--mt)', fontSize: 8 }}>Length</div>
              <div style={{ color: 'var(--tx)', fontWeight: 600 }}>{comparison.templateLength} chars</div>
            </div>
            <div>
              <div style={{ color: 'var(--mt)', fontSize: 8 }}>Sections</div>
              <div style={{ color: 'var(--tx)', fontWeight: 600 }}>{comparison.templateSections}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '10px 12px', background: 'var(--ev)', border: '1px solid var(--am)', borderRadius: 4 }}>
          <div style={{ fontSize: 9, color: 'var(--am)', marginBottom: 4 }}>AI NOTICE</div>
          <div style={{ display: 'flex', gap: 8, fontSize: 10, fontFamily: 'Space Mono' }}>
            <div>
              <div style={{ color: 'var(--mt)', fontSize: 8 }}>Length</div>
              <div style={{ color: 'var(--am)', fontWeight: 600 }}>{comparison.aiLength} chars</div>
            </div>
            <div>
              <div style={{ color: 'var(--mt)', fontSize: 8 }}>Sections</div>
              <div style={{ color: 'var(--am)', fontWeight: 600 }}>{comparison.aiSections}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--mt)', marginBottom: 6, fontFamily: 'Space Mono', fontWeight: 600 }}>TEMPLATE</div>
          <div
            style={{
              fontFamily: 'Space Mono',
              fontSize: 9,
              color: 'var(--sc)',
              lineHeight: 1.4,
              background: 'rgba(8,10,13,.4)',
              padding: '10px 12px',
              borderRadius: 3,
              border: '1px solid var(--bd)',
              maxHeight: 250,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {comparison.templateNotice}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 10, color: 'var(--am)', marginBottom: 6, fontFamily: 'Space Mono', fontWeight: 600 }}>AI ENHANCED</div>
          <div
            style={{
              fontFamily: 'Space Mono',
              fontSize: 9,
              color: 'var(--am)',
              lineHeight: 1.4,
              background: 'rgba(255, 107, 53, 0.08)',
              padding: '10px 12px',
              borderRadius: 3,
              border: '1px solid var(--am)',
              maxHeight: 250,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {comparison.aiNotice}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div style={{ padding: '10px 12px', background: 'var(--ev)', borderRadius: 3, border: '1px solid var(--bd)', fontSize: 10, color: 'var(--mt)' }}>
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--tx)' }}>💡 Insights</div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 9 }}>
          <li>AI notice is {comparison.aiLength > comparison.templateLength ? `${Math.round(((comparison.aiLength - comparison.templateLength) / comparison.templateLength) * 100)}% longer` : `${Math.round(((comparison.templateLength - comparison.aiLength) / comparison.templateLength) * 100)}% shorter`} with more context</li>
          <li>AI provides {comparison.aiSections > comparison.templateSections ? 'more' : 'similar'} structured sections for clarity</li>
          <li>AI language is contextual to violation type and regulatory framework</li>
        </ul>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
