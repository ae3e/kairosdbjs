import {
  KairosDBClient,
  QueryBuilder,
  TimeUnit
} from "../src/index.js";

async function run() {
  // Adapt the URL to your KairosDB instance
  const client = new KairosDBClient("http://localhost:8080");

  console.log("=== Query: hourly averages for sensor_temperature_01 (last 24h) ===");

  const queryBuilder = QueryBuilder.getInstance();

  // Last 24 hours, aggregated in 1-hour steps
  queryBuilder
    .setStart(24, TimeUnit.HOURS)
    .addMetric("sensor_temperature_01")
    .addAggregator({
      name: "avg",
      sampling: {
        value: 1,
        unit: TimeUnit.HOURS
      }
    });

  const response = await client.query(queryBuilder);
  console.log(JSON.stringify(response, null, 2));
}

run().catch((err) => {
  console.error("Error while running the query:", err);
  process.exitCode = 1;
});
