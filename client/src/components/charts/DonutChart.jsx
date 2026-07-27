import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './LineChart';

export default function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.v, 0);
  return (
    <div style={{ width: 160, height: 160, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={1} dataKey="v" stroke="#080A0D" strokeWidth={2}>
            {data.map((entry, i) => <Cell key={i} fill={entry.c} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" fill="var(--tx)" fontFamily="Space Mono" fontSize={18} fontWeight={700}>{total}</text>
          <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" fill="var(--mt)" fontFamily="DM Sans" fontSize={9}>total</text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
