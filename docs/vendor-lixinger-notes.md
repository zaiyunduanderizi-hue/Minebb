# Lixinger OpenAPI – Working Notes

## Base configuration
- **Base URL**: `https://open.lixinger.com/api/` (see `lixinger_openapi/query.py`).
- **HTTP method**: all documented endpoints use `POST` with a JSON body.
- **Authentication**: supply the personal access token inside the JSON payload under the `token` key. Requests are sent with `Content-Type: application/json`.

## Response envelope
- Responses consistently return a JSON object with `code`, `msg`, and `data` keys (validated in the upstream wrapper tests).
- `code === 0` indicates success. Non‑zero codes carry error context in `msg` and may include more fields.
- Timestamp fields observed in sample payloads are ISO‑8601 strings with an explicit offset (e.g. `2024-01-02T00:00:00+08:00`).

## Market data field conventions
- **K-line (candles)**: rows provide `date`/`time` (string timestamp) along with OHLC values named `open`, `high`, `low`, and `close`. Volume is exposed as `volume`, and some payloads also include turnover figures such as `turnover` or `amount`.
- **Quote snapshots**: payloads expose `price` (last trade), optional absolute change (`change`, `chg`) and percentage change (`changePct`, `chgPct`). The snapshot timestamp appears as `time`, `timestamp`, or an ISO string.

## Error & rate limiting semantics
- HTTP 401 responses (or `code` starting with `401`) indicate authentication problems such as missing/expired tokens.
- HTTP 429 responses (or `code` starting with `429`) represent rate limiting. The service may include a `Retry-After` header or TTL hints in the JSON payload. The adapter will apply exponential backoff (1s, 2s, 4s, 8s, capped at 30s) and forward the final TTL to the caller.
- Network issues should surface as `NETWORK`, while client-side aborts map to `TIMEOUT`.

## Priority endpoints for adapter implementation
These are the first endpoints we will cover in the Electron adapter. Paths are relative to the base URL above.

| Endpoint | Purpose | Required params |
| --- | --- | --- |
| `POST /a/stock/kline` | Fetch OHLCV K-line series for equities | `token`, `stockCode` (or `stockCodes` array), `market`, `period` (`day`/`week`/`month`), optional `startDate`, `endDate` (`YYYY-MM-DD`) |
| `POST /a/stock/quote` | Retrieve the latest quote snapshot | `token`, `stockCode`, `market` |
| `POST /a/stock/search` (secondary) | Symbol search helper | `token`, `keyword`, optional `market` |

## References consulted
- `lixinger_openapi/query.py` – confirms base URL, POST usage, and token placement.
- `lixinger_openapi/test/query_test.py` – demonstrates the response envelope and ISO timestamps.
