/**
 * Site-wide footer — project metadata + SDG badges + quick links.
 * Sits at the bottom of the main content area (outside the sidebar).
 */
export default function Footer({ onNav }) {
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        borderTop: '1px solid var(--bd)',
        background: 'var(--sf)',
        padding: '16px 22px',
        marginTop: 20,
        fontSize: 11,
        color: 'var(--mt)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      {/* Left: project tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'var(--am)', fontWeight: 700, letterSpacing: '0.08em' }}>
            INFRAWATCH
          </div>
          <div style={{ fontSize: 10, marginTop: 2 }}>Built for Google Solution Challenge 2026 · <em>Rapid Crisis Response · Open Innovation</em></div>
        </div>

        {/* SDG badges */}
        <div style={{ display: 'flex', gap: 6 }}>
          <SDGChip num="11" label="Sustainable Cities" color="#F99D26" onClick={() => onNav && onNav('sdg')} />
          <SDGChip num="16" label="Justice & Institutions" color="#00689D" onClick={() => onNav && onNav('sdg')} />
        </div>
      </div>

      {/* Right: quick links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <FooterLink onClick={() => onNav && onNav('sdg')}>SDG Alignment</FooterLink>
        <FooterLink href="https://github.com/LordDevdeep/Infrawatch" external>GitHub</FooterLink>
        <FooterLink href="https://infrawatch-backend-odou.onrender.com/health" external>API Health</FooterLink>
        <span style={{ fontSize: 10, color: 'var(--bd)' }}>© {year} INFRAWATCH · MIT</span>
      </div>
    </footer>
  );
}

function SDGChip({ num, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      title={`UN SDG ${num}: ${label} — click to view alignment`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        border: `1px solid ${color}66`,
        borderRadius: 4,
        padding: '4px 8px',
        cursor: 'pointer',
        color: 'var(--sc)',
        fontSize: 10,
        fontFamily: 'Space Mono',
        letterSpacing: '0.05em',
        transition: 'all 120ms',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = color + '22'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{
        width: 18,
        height: 18,
        borderRadius: 3,
        background: color,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 10,
      }}>{num}</span>
      <span>SDG {num}</span>
    </button>
  );
}

function FooterLink({ children, href, external, onClick }) {
  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        style={{ color: 'var(--sc)', textDecoration: 'none', fontSize: 11 }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--am)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sc)'; }}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--sc)',
        fontSize: 11,
        cursor: 'pointer',
        padding: 0,
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--am)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sc)'; }}
    >
      {children}
    </button>
  );
}
