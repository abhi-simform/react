import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { formatRupees } from "@/lib/money"
import { formatDay, formatRupeesCompact } from "./format"
import type {
  CategoryShare,
  Funnel,
  RevenuePoint,
  StatusCount,
  TopProduct,
} from "./api"

// Okabe-Ito: a palette that stays distinguishable for the common kinds of colour blindness. Series
// are ALSO told apart by label/position (legend, data labels, the table alternative), never by colour alone.
export const PALETTE = [
  "#0072B2",
  "#E69F00",
  "#009E73",
  "#D55E00",
  "#CC79A7",
  "#56B4E9",
  "#F0E442",
  "#6b7280",
]

// Animations are OFF: a dashboard refetches every couple of minutes, and re-drawing the chart each time
// would be motion without information (and it respects prefers-reduced-motion by construction).
const still = { isAnimationActive: false } as const

const tip = {
  contentStyle: { borderRadius: 8, fontSize: 12 },
  // Tooltip values in INR with the Indian grouping, like everywhere else in the console.
} as const

export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart
        data={points}
        margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        accessibilityLayer
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          minTickGap={24}
          fontSize={12}
        />
        <YAxis tickFormatter={formatRupeesCompact} width={64} fontSize={12} />
        <Tooltip
          {...tip}
          labelFormatter={(d) => formatDay(String(d))}
          formatter={(v, name) => [
            name === "revenue" ? formatRupees(Number(v)) : String(v),
            name === "revenue" ? "Revenue" : "Orders",
          ]}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={PALETTE[0]}
          strokeWidth={2}
          dot={false}
          {...still}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function StatusDonut({ data }: { data: StatusCount[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart accessibilityLayer>
        <Pie
          data={data}
          dataKey="count"
          nameKey="status"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          {...still}
        >
          {data.map((d, i) => (
            <Cell key={d.status} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          {...tip}
          formatter={(v, _n, item) => [
            `${String(v)} orders (${formatRupees((item.payload as StatusCount).amount)})`,
            String((item.payload as StatusCount).status).replaceAll("_", " "),
          ]}
        />
        <Legend formatter={(v) => String(v).replaceAll("_", " ")} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function TopProductsChart({ data }: { data: TopProduct[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 16 }}
        accessibilityLayer
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={formatRupeesCompact}
          fontSize={12}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          fontSize={11}
          tickFormatter={(n: string) =>
            n.length > 20 ? `${n.slice(0, 19)}…` : n
          }
        />
        <Tooltip
          {...tip}
          formatter={(v) => [formatRupees(Number(v)), "Revenue"]}
        />
        <Bar dataKey="revenue" fill={PALETTE[2]} {...still} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CategoryShareChart({ data }: { data: CategoryShare[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 8, right: 16 }} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          fontSize={11}
          interval={0}
          tickFormatter={(n: string) =>
            n.length > 10 ? `${n.slice(0, 9)}…` : n
          }
        />
        <YAxis
          tickFormatter={(v) => `${String(v)}%`}
          width={44}
          fontSize={12}
        />
        <Tooltip
          {...tip}
          formatter={(v, _n, item) => [
            `${String(v)}% (${formatRupees((item.payload as CategoryShare).revenue)})`,
            "Share",
          ]}
        />
        <Bar dataKey="sharePct" fill={PALETTE[1]} {...still} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function FunnelChart({ steps }: { steps: Funnel["steps"] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={steps}
        layout="vertical"
        margin={{ left: 8, right: 24 }}
        accessibilityLayer
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" allowDecimals={false} fontSize={12} />
        <YAxis type="category" dataKey="label" width={130} fontSize={12} />
        <Tooltip {...tip} formatter={(v) => [String(v), "Shoppers"]} />
        <Bar
          dataKey="count"
          fill={PALETTE[0]}
          label={{ position: "right", fontSize: 12 }}
          {...still}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
