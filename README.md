# KairosDB JS Client

Minimalist JavaScript client for KairosDB, inspired by the official Java client
[`kairosdb/kairosdb-client`](https://github.com/kairosdb/kairosdb-client).

## Installation

```bash
npm install kairosdb-js-client
```

## Quick Usage

```js
import {
  KairosDBClient,
  MetricBuilder,
  QueryBuilder,
  QueryTagBuilder,
  TimeUnit
} from "kairosdb-js-client";

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
```

## Main Differences from the Java Client

- Promise/`async`/`await`-oriented API.
- Builders (`MetricBuilder`, `QueryBuilder`, `QueryTagBuilder`) produce
  native JSON objects directly (no Gson).
- Aggregators and groupers are represented as plain JavaScript objects;
  you just need to follow the JSON structure expected by KairosDB.

This project covers the main operations of the Java client (pushing metrics,
querying data points and tags, metric names, status, version). Advanced
features (rollups, custom types, etc.) can be added on the same basis if
needed.
