# KairosDB JS Client

Minimalist TypeScript client for KairosDB, inspired by the official Java client
[`kairosdb/kairosdb-client`](https://github.com/kairosdb/kairosdb-client).

## Installation

```bash
npm install kairosdbjs
```

## Node.js and browser support

The client only relies on the standard `fetch` API and plain JavaScript — no
Node-only built-ins. It works out of the box:

- In **Node.js 18+**, which ships a global `fetch`.
- In the **browser**, via any bundler (Vite, webpack, esbuild, Rollup...)
  that consumes the published ESM build.

The package ships both an ESM build (`dist/esm`, used by `import`/bundlers)
and a CommonJS build (`dist/cjs`, used by `require`), so it works whether
your project uses `"type": "module"` or not.

## Development

```bash
npm install              # installs dependencies and builds dist/ via the prepare script
npm run build             # compile TypeScript to dist/esm and dist/cjs
npm run typecheck         # type-check src/ and examples/ without emitting
npm run example:basic     # run examples/basic.ts against a local KairosDB instance
npm run example:hourly    # run examples/hourlyAverage.ts
```

## Publishing a new version

Publishing to npm is automated by
[`.github/workflows/publish.yml`](.github/workflows/publish.yml):

1. Bump the `version` field in `package.json`.
2. Commit, then create and push a matching tag, e.g. for version `0.2.0`:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
3. The workflow type-checks, builds (ESM + CJS), verifies the tag matches
   `package.json`'s version, and publishes to npm using the repository's
   `NPM_TOKEN` secret. That token must be a
   [granular access token](https://docs.npmjs.com/creating-and-viewing-access-tokens)
   with read/write access to the package and "bypass two-factor
   authentication for publishing" enabled, since automated CI publishes
   can't respond to an OTP prompt.

## Quick Usage

```ts
import {
  KairosDBClient,
  MetricBuilder,
  QueryBuilder,
  QueryTagBuilder,
  TimeUnit
} from "kairosdbjs";

const client = new KairosDBClient("http://localhost:8080");

// Sending metrics
const metricBuilder = MetricBuilder.getInstance();
metricBuilder
  .addMetric("metric1")
  .addTag("host", "server1")
  .addTag("customer", "Acme")
  .addDataPoint(Date.now(), 10)
  .addDataPoint(Date.now(), 30);

await client.pushMetrics(metricBuilder);

// Querying data points
const queryBuilder = QueryBuilder.getInstance();
queryBuilder
  .setStart(2, TimeUnit.MONTHS)
  .setEnd(1, TimeUnit.MONTHS)
  .addMetric("metric1")
  .addAggregator({
    name: "avg",
    sampling: { value: 5, unit: TimeUnit.MINUTES }
  });

const response = await client.query(queryBuilder);
console.log(response);

// Querying tags
const tagBuilder = QueryTagBuilder.getInstance();
tagBuilder.setStart(2, TimeUnit.MONTHS).addMetric("metric1");
const tagResponse = await client.queryTags(tagBuilder);
console.log(tagResponse);

// Metric names
const metricNames = await client.getMetricNames();
console.log(metricNames);

// Tag names and values
const tagNames = await client.getTagNames();
const tagValues = await client.getTagValues("host");
console.log(tagNames, tagValues);
```

## Client options

```ts
const client = new KairosDBClient("http://localhost:8080", {
  apiPath: "/proxy/api/v1", // default: "/api/v1"
  headers: { Authorization: "Bearer <token>" },
  timeout: 10_000, // milliseconds, no timeout by default
  fetch: myFetch // default: global fetch
});
```

- **`apiPath`** — prefix used to build every endpoint (`datapoints`,
  `datapoints/query`, `metricnames`, `health/status`, ...). Useful when
  KairosDB is exposed behind a reverse proxy or gateway. Leading and trailing
  slashes are normalized.
- **`headers`** — sent with every request. This is the way to authenticate,
  e.g. `Authorization: "Bearer <token>"` or `Authorization: "Basic <base64>"`.
- **`fetch`** — custom `fetch` implementation (proxy agent, instrumentation,
  tests, environments without a global `fetch`).
- **`timeout`** — rejects with `KairosDBTimeoutError` when a request (including
  reading the response body) takes longer than the given delay.

Every request method also accepts a trailing `{ signal }` argument to cancel a
single call with an `AbortSignal`. A cancelled call rejects with the signal's
abort error (an `AbortError` by default), not with `KairosDBTimeoutError`.

```ts
const controller = new AbortController();
const names = client.getMetricNames({ signal: controller.signal });
controller.abort();
```

HTTP errors reject with `KairosDBClientError`, which exposes `status`,
`statusText` and the raw response `body`.

## Raw queries

`queryRaw` sends a plain JSON payload as-is, without going through
`QueryBuilder` and without any validation or rewriting. Use it for query
features the builders do not cover.

```ts
import type { QueryResponse } from "kairosdbjs";

const response: QueryResponse = await client.queryRaw({
  start_relative: { value: 1, unit: "hours" },
  cache_time: 30,
  metrics: [
    {
      name: "my.metric",
      tags: { host: ["server1"] },
      group_by: [{ name: "tag", tags: ["host"] }],
      aggregators: [
        { name: "percentile", percentile: 0.9, sampling: { value: 5, unit: "minutes" } }
      ]
    }
  ]
});

for (const query of response.queries) {
  for (const result of query.results) {
    console.log(result.name, result.values);
  }
}
```

`query()` and `queryTags()` are typed with `QueryResponse` and
`QueryTagsResponse` as well.

## Tests

```bash
npm test
```

## Main Differences from the Java Client

- Promise/`async`/`await`-oriented API.
- Builders (`MetricBuilder`, `QueryBuilder`, `QueryTagBuilder`) produce
  native JSON objects directly (no Gson).
- Aggregators and groupers are represented as plain JavaScript objects;
  you just need to follow the JSON structure expected by KairosDB.
- Written in TypeScript; type declarations are bundled with the package.

This project covers the main operations of the Java client (pushing metrics,
querying data points and tags, metric names, status, version). Advanced
features (rollups, custom types, etc.) can be added on the same basis if
needed.
