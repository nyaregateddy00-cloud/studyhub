import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axisProps = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function ChartTooltip({
  active,
  payload,
  label,
  unit,
  name,
}: {
  active?: boolean;
  payload?: { value: number; payload?: Record<string, unknown> }[];
  label?: string | number;
  unit: string;
  name: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  const caption = point.payload?.caption as string | undefined;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-popover-foreground">{caption ?? label}</p>
      <p className="mt-0.5 text-muted-foreground">
        {name}:{" "}
        <span className="font-medium text-foreground">
          {point.value}
          {unit}
        </span>
      </p>
    </div>
  );
}

export function WeeklyHoursChart({
  data,
}: {
  data: { day: string; hours: number; caption?: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="day" {...axisProps} />
        <YAxis {...axisProps} width={36} />
        <Tooltip
          cursor={{ stroke: "var(--color-border)" }}
          content={<ChartTooltip unit=" h" name="Studied" />}
        />
        <Area
          type="monotone"
          dataKey="hours"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#hoursFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function QuizPerformanceChart({
  data,
}: {
  data: { label: string; score: number; caption?: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis domain={[0, 100]} {...axisProps} width={36} />
        <Tooltip
          cursor={{ fill: "var(--color-muted)", opacity: 0.35 }}
          content={<ChartTooltip unit="%" name="Score" />}
        />
        <Bar dataKey="score" fill="var(--color-accent)" radius={[6, 6, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  );
}