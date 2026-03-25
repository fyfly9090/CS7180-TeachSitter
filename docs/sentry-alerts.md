# Sentry Alert Rules — TeachSitter

Configure these alerts in the Sentry dashboard under **Alerts → Create Alert Rule**.

---

## 1. Error Spike Alert

| Setting | Value |
|---|---|
| **Type** | Issue alert |
| **Condition** | When the number of events in an issue is more than `10` in `5 minutes` |
| **Action** | Send a notification (email / Slack) |

---

## 2. API Latency Alert — General Routes (p95 > 500ms)

| Setting | Value |
|---|---|
| **Type** | Metric alert — Transaction duration |
| **Metric** | `p95(transaction.duration)` |
| **Filter** | `transaction:api/*` (exclude `/api/match`) |
| **Critical threshold** | `> 500ms` |
| **Warning threshold** | `> 300ms` |
| **Time window** | 5 minutes |

---

## 3. API Latency Alert — `/api/match` (p95 > 1000ms)

| Setting | Value |
|---|---|
| **Type** | Metric alert — Transaction duration |
| **Metric** | `p95(transaction.duration)` |
| **Filter** | `transaction:/api/match` |
| **Critical threshold** | `> 1000ms` |
| **Warning threshold** | `> 700ms` |
| **Time window** | 5 minutes |

---

## Notes

- All thresholds are sourced from `CLAUDE.md` monitoring requirements.
- Performance transactions are auto-captured by `withSentryConfig` in `next.config.ts` (`tracesSampleRate: 1.0`).
- Only 5xx errors and unknown errors are sent to Sentry (see `lib/errors.ts`). 4xx client errors are intentionally excluded.
