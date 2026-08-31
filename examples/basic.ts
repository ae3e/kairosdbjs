import {
  KairosDBClient,
  MetricBuilder,
  QueryBuilder,
  QueryTagBuilder,
  TimeUnit
} from "../src/index.js";

async function run(): Promise<void> {
  // Adapt the URL to your KairosDB instance
  const client = new KairosDBClient("http://localhost:8080");

  console.log("=== Sending metrics ===");
  const metricBuilder = MetricBuilder.getInstance();
  metricBuilder
    .addMetric("js_metric_example")
    .addTag("host", "server1")
    .addTag("env", "dev")
    .addDataPoint(Date.now(), 42)
    .addDataPoint(Date.now(), 100);

  await client.pushMetrics(metricBuilder);
  console.log("Metrics sent.");

  console.log("\n=== Querying data points ===");
  const queryBuilder = QueryBuilder.getInstance();
  queryBuilder
    .setStart(5, TimeUnit.MINUTES)
    .addMetric("js_metric_example");

  const queryResponse = await client.query(queryBuilder);
  console.log("Query response:", JSON.stringify(queryResponse, null, 2));

  console.log("\n=== Querying tags ===");
  const tagBuilder = QueryTagBuilder.getInstance();
  tagBuilder.setStart(5, TimeUnit.MINUTES).addMetric("js_metric_example");

  const tagResponse = await client.queryTags(tagBuilder);
  console.log("QueryTags response:", JSON.stringify(tagResponse, null, 2));

  console.log("\n=== Metric names ===");
  const metricNames = await client.getMetricNames();
  console.log("Metric names:", JSON.stringify(metricNames, null, 2));

  console.log("\n=== Status and version ===");
  const status = await client.getStatus();
  const version = await client.getVersion();
  console.log("Status:", JSON.stringify(status, null, 2));
  console.log("Version:", version);
}

run().catch((err) => {
  console.error("Error while running the example:", err);
  process.exitCode = 1;
});
