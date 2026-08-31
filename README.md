# KairosDB JS Client

Minimalist TypeScript client for KairosDB, inspired by the official Java client
[`kairosdb/kairosdb-client`](https://github.com/kairosdb/kairosdb-client).

## Installation

This package is published to **GitHub Packages**, not the public npm registry.
Add the following to your project's `.npmrc` so npm resolves the `@ae3e` scope
from GitHub Packages (a [personal access token](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-with-a-personal-access-token)
with `read:packages` scope is required):

```
@ae3e:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @ae3e/kairosdb-js-client
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

Publishing to GitHub Packages is automated by
[`.github/workflows/publish.yml`](.github/workflows/publish.yml):

1. Bump the `version` field in `package.json`.
2. Commit, then create and push a matching tag, e.g. for version `0.2.0`:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
3. The workflow type-checks, builds (ESM + CJS), verifies the tag matches
   `package.json`'s version, and publishes to GitHub Packages using the
   repository's built-in `GITHUB_TOKEN` — no extra secret needed.

## Quick Usage

```ts
import {
  KairosDBClient,
  MetricBuilder,
  QueryBuilder,
  QueryTagBuilder,
  TimeUnit
} from "@ae3e/kairosdb-js-client";

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
