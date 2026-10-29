import { createFileRoute } from "@tanstack/react-router"
import { queryOptions, useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import * as api from "@/features/system/api"
import { requirePermission } from "@/lib/auth/guards"
import { formatDateTime } from "@/lib/format"
import { qk } from "@/lib/queryKeys"

// Health is only useful when it is current: a short staleTime and a 15 s poll (paused in background tabs).
const healthOptions = () =>
  queryOptions({
    queryKey: qk.system.health(),
    queryFn: ({ signal }) => api.getHealth(signal),
    staleTime: 5_000,
    refetchInterval: 15_000,
  })
const vitalsOptions = () =>
  queryOptions({
    queryKey: [...qk.system.health(), "vitals"],
    queryFn: ({ signal }) => api.getVitals(signal),
    staleTime: 60_000,
  })

export const Route = createFileRoute("/_authed/system")({
  staticData: { crumb: "System health" },
  beforeLoad: ({ context }) => requirePermission(context.user, "system:view"),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(healthOptions())
  },
  component: SystemPage,
})

const duration = (s: number) =>
  s < 3600
    ? `${Math.floor(s / 60)} min`
    : `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min`

// Web Vitals thresholds ("good" cut-offs): LCP 2500 ms, INP 200 ms, CLS 0.1, FCP 1800 ms, TTFB 800 ms.
const GOOD: Record<string, number> = {
  LCP: 2500,
  INP: 200,
  CLS: 0.1,
  FCP: 1800,
  TTFB: 800,
}

function SystemPage() {
  const health = useQuery(healthOptions())
  const vitals = useQuery(vitalsOptions())
  const h = health.data
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">
          System health{" "}
          {h ? (
            <Badge variant={h.status === "ok" ? "default" : "destructive"}>
              {h.status}
            </Badge>
          ) : null}
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void health.refetch()}
          disabled={health.isFetching}
        >
          Check now
        </Button>
      </div>
      {health.error && !h ? (
        <p role="alert">
          {health.error.message}. If the API itself is down this page cannot say
          more.
        </p>
      ) : null}
      {h ? (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Checked {formatDateTime(h.checkedAt)}. Refreshes every 15 seconds.
          </p>
          <Table>
            <caption className="sr-only">Dependency checks</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Dependency</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Detail</TableHead>
                <TableHead>Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {h.checks.map((c) => (
                <TableRow key={c.name}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === "ok"
                          ? "default"
                          : c.status === "down"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.detail}</TableCell>
                  <TableCell>
                    {c.latencyMs !== undefined ? `${c.latencyMs} ms` : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <dl className="grid max-w-xl grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt>API version</dt>
            <dd>
              {h.process.version} ({h.process.env})
            </dd>
            <dt>Node</dt>
            <dd>{h.process.node}</dd>
            <dt>Uptime</dt>
            <dd>{duration(h.process.uptimeSeconds)}</dd>
            <dt>Memory</dt>
            <dd>
              {h.process.rssMb} MB resident, {h.process.heapUsedMb} MB heap
            </dd>
            <dt>Cache</dt>
            <dd>
              {h.cache.enabled
                ? `${h.cache.hits} hits, ${h.cache.misses} misses`
                : "disabled"}
            </dd>
          </dl>
        </>
      ) : health.isPending ? (
        <p aria-busy>Checking...</p>
      ) : null}

      <section aria-labelledby="vitals">
        <h2 id="vitals" className="mb-2 font-medium">
          Storefront Web Vitals (p75, last 7 days)
        </h2>
        {vitals.error ? <p role="alert">{vitals.error.message}</p> : null}
        {vitals.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No samples yet.</p>
        ) : null}
        {vitals.data && vitals.data.length > 0 ? (
          <Table>
            <caption className="sr-only">Web Vitals p75 per page</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead>Page</TableHead>
                <TableHead>p75</TableHead>
                <TableHead>Samples</TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vitals.data.map((v) => (
                <TableRow key={`${v.name}${v.path}`}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell className="font-mono text-xs">{v.path}</TableCell>
                  <TableCell>
                    {v.name === "CLS"
                      ? v.p75.toFixed(3)
                      : `${Math.round(v.p75)} ms`}
                  </TableCell>
                  <TableCell>{v.samples}</TableCell>
                  <TableCell>
                    {v.p75 <= (GOOD[v.name] ?? Infinity)
                      ? "good"
                      : "needs work"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </section>
    </section>
  )
}
