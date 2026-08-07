import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Recharts is heavy, so every analytics chart lives in this single module and
 * is loaded lazily by the analytics route instead of shipping in the main
 * bundle.
 */

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-popover)",
  color: "var(--color-popover-foreground)",
  fontSize: 12,
} as const;

export function MinutesTrendChart({
  data,
}: {
  data: { date: string; current: number; previous: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="date" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="current"
          name="This period"
          stroke="var(--color-primary)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="previous"
          name="Previous period"
          stroke="var(--color-muted-foreground)"
          strokeDasharray="4 4"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SubjectMinutesChart({ data }: { data: { subject: string; minutes: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="subject" fontSize={11} />
        <YAxis fontSize={11} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="minutes" name="Minutes" fill="var(--color-success)" radius={6} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function QuizAccuracyChart({ data }: { data: { date: string; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis dataKey="date" fontSize={11} />
        <YAxis domain={[0, 100]} fontSize={11} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="score"
          name="Accuracy %"
          stroke="var(--color-primary)"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
