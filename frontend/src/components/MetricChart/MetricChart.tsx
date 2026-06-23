import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card } from '../Card/Card';
import styles from './MetricChart.module.css';

interface DataPoint {
  time: string;
  value: number;
}

interface MetricChartProps {
  title: string;
  data: DataPoint[];
  color?: string;
  unit?: string;
  formatValue?: (v: number) => string;
}

const defaultFormatter = (v: number) => v.toString();

export function MetricChart({
  title,
  data,
  color = '#3b82f6',
  unit = '',
  formatValue = defaultFormatter,
}: MetricChartProps) {
  return (
    <Card variant="glass" padding="md" className={styles.chart}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {data.length > 0 && (
          <span className={styles.current}>
            {formatValue(data[data.length - 1].value)}
            <span className={styles.unit}>{unit}</span>
          </span>
        )}
      </div>
      <div className={styles.graph}>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
            <Tooltip
              contentStyle={{
                background: '#0f1529',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                color: '#f1f5f9',
              }}
              formatter={((value: number | string) => [formatValue(Number(value ?? 0)), title]) as any}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${title.replace(/\s+/g, '')})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
