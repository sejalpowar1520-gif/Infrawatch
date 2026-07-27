const STATUS_COLORS = {
  'NEW': { bg: 'var(--amd)', c: 'var(--am)' },
  'UNDER REVIEW': { bg: 'var(--bld)', c: 'var(--bl)' },
  'NOTICE SENT': { bg: 'var(--pud)', c: 'var(--pu)' },
  'RESOLVED': { bg: 'var(--tld)', c: 'var(--tl)' },
  'DISMISSED': { bg: 'rgba(74,84,104,.2)', c: 'var(--mt)' },
};

export default function Badge({ status }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.DISMISSED;
  return (
    <span className="badge" style={{ background: colors.bg, color: colors.c }}>
      {status}
    </span>
  );
}
