export default function AINoticeCard({ notice, isLoading, error, onGenerate, onClose }) {
  const providerLabel = notice?.provider ? notice.provider.toUpperCase() : 'AI';
  const modelLabel = notice?.model || 'Default model';

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="slb" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          AI NOTICE
          <span
            style={{
              fontSize: 9,
              background: 'var(--am)',
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 3,
              fontFamily: 'Space Mono',
            }}
          >
            BETA
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--mt)' }}
          >
            x
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: '10px 12px',
            background: 'var(--rdd)',
            border: '1px solid var(--rd)',
            borderRadius: 4,
            marginBottom: 10,
            fontSize: 11,
            color: 'var(--rd)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Error generating notice</div>
          <div>{error}</div>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              width: 20,
              height: 20,
              border: '2px solid var(--bd)',
              borderTop: '2px solid var(--am)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div style={{ fontSize: 11, color: 'var(--mt)', marginTop: 8 }}>Generating AI notice...</div>
        </div>
      ) : notice ? (
        <div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--mt)',
              marginBottom: 8,
              padding: '8px 10px',
              background: 'var(--ev)',
              borderRadius: 3,
              fontFamily: 'Space Mono',
            }}
          >
            Generated using {providerLabel} ({modelLabel}) |{' '}
            {new Date(notice.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
          </div>
          <div
            style={{
              fontFamily: 'Space Mono',
              fontSize: 10,
              color: 'var(--sc)',
              lineHeight: 1.6,
              background: 'rgba(8,10,13,.4)',
              padding: '12px 14px',
              borderRadius: 4,
              border: '1px solid var(--bd)',
              maxHeight: 300,
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              marginBottom: 10,
            }}
          >
            {notice.content}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn bp"
              style={{ flex: 1, fontSize: 11 }}
              onClick={() => navigator.clipboard?.writeText(notice.content)}
            >
              Copy Notice
            </button>
            <button
              className="btn bs"
              style={{ flex: 1, fontSize: 11 }}
              onClick={() => {
                const blob = new Blob([notice.content], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ai-notice-${new Date().getTime()}.txt`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
            >
              Download
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 11, color: 'var(--mt)', marginBottom: 10, lineHeight: 1.5 }}>
            Generate a contextual, legally grounded enforcement notice using AI. This enhances the default
            template with relevant context and stronger language.
          </div>
          <button
            className="btn am"
            style={{
              width: '100%',
              fontSize: 12,
              fontWeight: 600,
              justifyContent: 'center',
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'default' : 'pointer',
            }}
            onClick={onGenerate}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate AI Notice'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .btn.am {
          background: linear-gradient(135deg, var(--am) 0%, var(--rd) 100%);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 8px 12px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 200ms;
        }
        .btn.am:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
        }
      `}</style>
    </div>
  );
}
