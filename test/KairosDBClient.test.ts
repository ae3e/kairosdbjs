import { test } from "node:test";
import assert from "node:assert/strict";
import {
  KairosDBClient,
  KairosDBClientError,
  KairosDBTimeoutError,
  QueryBuilder,
  QueryTagBuilder,
  MetricBuilder
} from "../src/index.js";
import type { RawQueryPayload } from "../src/index.js";

interface Call {
  url: string;
  init: RequestInit;
}

function mockFetch(
  respond: (call: Call) => Response | Promise<Response> = () =>
    new Response("{}", { status: 200 })
) {
  const calls: Call[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    const call = { url: String(url), init };
    calls.push(call);
    return respond(call);
  }) as unknown as typeof fetch;
  return { calls, impl };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

test("uses /api/v1 by default and strips trailing slashes from baseUrl", async () => {
  const { calls, impl } = mockFetch(() => json({ results: ["a"] }));
  const client = new KairosDBClient("http://localhost:8080//", { fetch: impl });
  assert.deepEqual(await client.getMetricNames(), ["a"]);
  assert.equal(calls[0].url, "http://localhost:8080/api/v1/metricnames");
});

test("apiPath is used for every endpoint", async () => {
  const { calls, impl } = mockFetch((c) =>
    c.url.endsWith("/health/check") ? new Response("204") : json({ results: [] })
  );
  const client = new KairosDBClient("http://localhost:8080", {
    fetch: impl,
    apiPath: "/proxy/api/v1"
  });
  await client.pushMetrics(MetricBuilder.getInstance());
  await client.query(QueryBuilder.getInstance().setStart(1000));
  await client.queryTags(QueryTagBuilder.getInstance().setStart(1000));
  await client.getMetricNames();
  await client.getTagNames();
  await client.getTagValues("host");
  await client.getTagValues();
  await client.deleteMetric("my metric");
  await client.delete(QueryBuilder.getInstance().setStart(1000));
  await client.getStatus();
  await client.getStatusCheck();
  await client.getVersion();

  const base = "http://localhost:8080/proxy/api/v1";
  assert.deepEqual(
    calls.map((c) => `${c.init.method} ${c.url}`),
    [
      `POST ${base}/datapoints`,
      `POST ${base}/datapoints/query`,
      `POST ${base}/datapoints/query/tags`,
      `GET ${base}/metricnames`,
      `GET ${base}/tagnames`,
      `GET ${base}/tagvalues?name=host`,
      `GET ${base}/tagvalues`,
      `DELETE ${base}/metric/my%20metric`,
      `POST ${base}/datapoints/delete`,
      `GET ${base}/health/status`,
      `GET ${base}/health/check`,
      `GET ${base}/version`
    ]
  );
});

test("apiPath is normalized (leading and trailing slashes)", async () => {
  for (const apiPath of ["proxy/v1", "/proxy/v1/", "/proxy/v1//"]) {
    const { calls, impl } = mockFetch();
    const client = new KairosDBClient("http://localhost:8080", { fetch: impl, apiPath });
    await client.getStatus();
    assert.equal(calls[0].url, "http://localhost:8080/proxy/v1/health/status");
  }
});

test("sends default headers, Accept and Content-Type", async () => {
  const { calls, impl } = mockFetch();
  const client = new KairosDBClient("http://localhost:8080", {
    fetch: impl,
    headers: { Authorization: "Bearer <token>" }
  });
  await client.getStatus();
  await client.queryRaw({ start_relative: { value: 1, unit: "hours" }, metrics: [{ name: "m" }] });

  assert.deepEqual(calls[0].init.headers, {
    Authorization: "Bearer <token>",
    Accept: "application/json"
  });
  assert.deepEqual(calls[1].init.headers, {
    Authorization: "Bearer <token>",
    Accept: "application/json",
    "Content-Type": "application/json"
  });
});

test("throws KairosDBClientError with status, statusText and body on HTTP errors", async () => {
  const { impl } = mockFetch(
    () => new Response("boom", { status: 503, statusText: "Service Unavailable" })
  );
  const client = new KairosDBClient("http://localhost:8080", { fetch: impl });
  await assert.rejects(client.getStatus(), (error: unknown) => {
    assert.ok(error instanceof KairosDBClientError);
    assert.equal(error.status, 503);
    assert.equal(error.statusText, "Service Unavailable");
    assert.equal(error.body, "boom");
    assert.match(error.message, /503: boom/);
    return true;
  });
});

test("returns the raw text when the response body is not valid JSON", async () => {
  const { impl } = mockFetch(() => new Response("not json", { status: 200 }));
  const client = new KairosDBClient("http://localhost:8080", { fetch: impl });
  assert.equal(await client.getStatus(), "not json");
});

test("throws a clear error when no fetch is available", () => {
  const original = globalThis.fetch;
  // @ts-expect-error simulate an environment without fetch
  delete globalThis.fetch;
  try {
    assert.throws(() => new KairosDBClient("http://localhost:8080"), /fetch/);
  } finally {
    globalThis.fetch = original;
  }
});

test("throws KairosDBTimeoutError when the timeout elapses", async () => {
  const { impl } = mockFetch(
    ({ init }) =>
      new Promise<Response>((_, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      })
  );
  const client = new KairosDBClient("http://localhost:8080", { fetch: impl, timeout: 20 });
  await assert.rejects(client.getStatus(), (error: unknown) => {
    assert.ok(error instanceof KairosDBTimeoutError);
    assert.equal(error.timeoutMs, 20);
    return true;
  });
});

test("timeout also applies to fetch implementations that ignore the signal", async () => {
  const { impl } = mockFetch(() => new Promise<Response>(() => undefined));
  const client = new KairosDBClient("http://localhost:8080", { fetch: impl, timeout: 20 });
  await assert.rejects(client.getStatus(), KairosDBTimeoutError);
});

test("a caller signal aborts the request without a timeout error", async () => {
  const { impl } = mockFetch(
    ({ init }) =>
      new Promise<Response>((_, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      })
  );
  const client = new KairosDBClient("http://localhost:8080", { fetch: impl, timeout: 5000 });
  const controller = new AbortController();
  const pending = client.getStatus({ signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (error: unknown) => {
    assert.ok(!(error instanceof KairosDBTimeoutError));
    assert.equal((error as Error).name, "AbortError");
    return true;
  });
});

test("an already-aborted signal rejects", async () => {
  const { calls, impl } = mockFetch();
  const client = new KairosDBClient("http://localhost:8080", { fetch: impl });
  await assert.rejects(client.getStatus({ signal: AbortSignal.abort() }));
  assert.equal(calls[0]?.init.signal?.aborted, true);
});

test("queryRaw sends the payload untouched (jsrange, percentile, first)", async () => {
  const payload: RawQueryPayload = {
    start_absolute: 1700000000000,
    end_absolute: 1700003600000,
    cache_time: 30,
    metrics: [
      {
        name: "my.metric",
        tags: { host: ["server1"] },
        group_by: [{ name: "tag", tags: ["host"] }],
        aggregators: [
          {
            name: "jsrange",
            sampling: { value: 1, unit: "minutes" },
            align_sampling: true,
            script: "function(r){ return r; }"
          },
          { name: "percentile", percentile: 0.9, sampling: { value: 1, unit: "hours" } },
          { name: "first", align_start_time: true, sampling: { value: 5, unit: "minutes" } }
        ]
      }
    ]
  };
  const response = {
    queries: [
      {
        sample_size: 1,
        results: [{ name: "my.metric", tags: { host: ["server1"] }, values: [[1700000000000, 42]] }]
      }
    ]
  };
  const { calls, impl } = mockFetch(() => json(response));
  const client = new KairosDBClient("http://localhost:8080", { fetch: impl });

  const result = await client.queryRaw(payload);

  assert.equal(calls[0].url, "http://localhost:8080/api/v1/datapoints/query");
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body as string), payload);
  assert.equal(calls[0].init.body, JSON.stringify(payload));
  assert.deepEqual(result, response);
  assert.equal(result.queries[0].results[0].values[0][1], 42);
});

test("queryRaw sends a string payload verbatim", async () => {
  const { calls, impl } = mockFetch();
  const client = new KairosDBClient("http://localhost:8080", { fetch: impl });
  const raw = '{"metrics":[{"name":"m"}],"start_relative":{"value":1,"unit":"days"}}';
  await client.queryRaw(raw);
  assert.equal(calls[0].init.body, raw);
});
