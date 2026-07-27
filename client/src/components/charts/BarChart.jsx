import { BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './LineChart';

export default function BarChartComponent({ data, color = '#4A9EFF', h = 140, label = 'c' }) {
  return (
    <div style={{ width: '100%', height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: 10, right: 14, left: -16, bottom: 0 }} barCategoryGap="34%">
          <CartesianGrid stroke="var(--bd)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={(d) => d.r || d.m || d.label} axisLine={false} tickLine={false} tick={{ fill: '#4A5468', fontSize: 10, fontFamily: 'Space Mono' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4A5468', fontSize: 10, fontFamily: 'Space Mono' }} width={34} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey={label} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}
