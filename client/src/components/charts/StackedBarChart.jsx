import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltip } from './LineChart';

const PIE_C = ['#FF4545', '#F5A623', '#00C9A7', '#4A9EFF', '#A78BFA', '#4A5468'];
const KEYS = ['UF', 'NP', 'EP', 'CR', 'SV', 'IB'];

export default function StackedBarChartComponent({ data }) {
  return (
    <div style={{ width: '100%', height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 14, left: -16, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke="var(--bd)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: '#4A5468', fontSize: 10, fontFamily: 'Space Mono' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4A5468', fontSize: 10, fontFamily: 'Space Mono' }} width={34} />
          <Tooltip content={<ChartTooltip />} />
          {KEYS.map((key, i) => <Bar key={key} dataKey={key} stackId="a" fill={PIE_C[i]} maxBarSize={42} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { PIE_C };
