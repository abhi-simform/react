# Lighthouse note (admin)

An internal tool: the budget is relaxed, the numbers are recorded. Lighthouse 12, desktop preset, against the production image (`docker run -p 3100:8080 shopsphere-admin`), `/login` (the only page reachable without a session; the authenticated pages cannot be audited by plain Lighthouse):

| Performance | Accessibility | Best practices | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| 100 | 100 | 96 | 205 ms | 205 ms | 0 ms | 0 |

Dashboard weight: the Recharts chunk is a separate lazy chunk (~113 kB gzip), loaded only when the dashboard opens. Not measured: authenticated pages' Lighthouse scores, mobile preset.
