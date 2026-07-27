/**
 * Reusable empty/zero state component.
 *
 * Usage:
 *   <EmptyState
 *     icon="📭"
 *     title="No active cases"
 *     description="No violations match your current filters."
 *     ctaLabel="Run AI City Scan"
 *     onCta={() => ...}
 *   />
 */
export default function EmptyState({ icon = '📭', title, description, ctaLabel, onCta, compact = false }) {
  return (
    <div className="empty-state" style={compact ? { padding: '20px 12px' } : undefined}>
      <div className="icon">{icon}</div>
      {title && <div className="title">{title}</div>}
      {description && <div className="desc">{description}</div>}
      {ctaLabel && onCta && (
        <button className="cta" onClick={onCta}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
