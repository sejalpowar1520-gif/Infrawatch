import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0F1117', border: '1px solid #1E2533', borderRadius: 4, padding: '8px 12px', fontFamily: 'Space Mono', fontSize: 11 }}>
      {label && <div style={{ color: 'var(--tx)', marginBottom: 4 }}>{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color || 'var(--sc)' }}>{entry.value}</div>
      ))}
    </div>
  );
}

export default function LineChartComponent({ data, color = '#F5A623', h = 180 }) {
  return (
    <div style={{ width: '100%', height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 14, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--bd)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: '#4A5468', fontSize: 10, fontFamily: 'Space Mono' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4A5468', fontSize: 10, fontFamily: 'Space Mono' }} width={34} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="v" stroke={color} fill={`url(#grad-${color})`} strokeWidth={2.5} dot={{ r: 3.5, stroke: '#080A0D', strokeWidth: 1.5, fill: color }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export { ChartTooltip };
