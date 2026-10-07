import { MetricBuilder } from "./MetricBuilder.js";
import { QueryBuilder } from "./QueryBuilder.js";
import type { QueryPayload } from "./QueryBuilder.js";
import { QueryTagBuilder } from "./QueryTagBuilder.js";
import type { QueryResponse, QueryTagsResponse, RawQueryPayload } from "./types.js";

export interface KairosDBClientOptions {
  headers?: Record<string, string>;
  /** Prefix of every API endpoint, without trailing slash. Defaults to "/api/v1". */
  apiPath?: string;
  /** Custom fetch implementation. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Request timeout in milliseconds. No timeout by default. */
  timeout?: number;
}

/** Per-call options accepted by every request method. */
export interface RequestInitOptions {
  signal?: AbortSignal;
}

interface RequestOptions extends RequestInitOptions {
  body?: unknown;
  accept?: string | null;
}

export interface HealthStatus {
  [key: string]: unknown;
}

export interface VersionResponse {
  version?: string;
  [key: string]: unknown;
}

interface ResultsResponse {
  results?: string[];
}

export class KairosDBClientError extends Error {
  status: number;
  body: string;
  statusText: string;

  constructor(message: string, status: number, body: string, statusText = "") {
    super(message);
    this.name = "KairosDBClientError";
    this.status = status;
    this.body = body;
    this.statusText = statusText;
  }
}

export class KairosDBTimeoutError extends Error {
  timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`KairosDB request timed out after ${timeoutMs} ms`);
    this.name = "KairosDBTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export class KairosDBClient {
  baseUrl: string;
  apiPath: string;
  fetchImpl: typeof fetch;
  defaultHeaders: Record<string, string>;
  timeout?: number;

  constructor(baseUrl: string, options: KairosDBClientOptions = {}) {
    if (!baseUrl) {
      throw new Error("baseUrl is required");
    }
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    const apiPath = (options.apiPath ?? "/api/v1").replace(/\/+$/, "");
    this.apiPath = apiPath && !apiPath.startsWith("/") ? `/${apiPath}` : apiPath;
    if (options.fetch) {
      this.fetchImpl = options.fetch;
    } else if (typeof fetch !== "undefined") {
      this.fetchImpl = fetch.bind(globalThis);
    } else {
      throw new Error(
        "Global fetch is not available in this environment; pass a fetch implementation with the `fetch` option."
      );
    }
    this.defaultHeaders = options.headers || {};
    this.timeout = options.timeout;
  }

  private async _request<T = unknown>(
    method: string,
    path: string,
    { body, accept = "application/json", signal }: RequestOptions = {}
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...this.defaultHeaders
    };
    if (accept) {
      headers["Accept"] = accept;
    }
    let payload: BodyInit | undefined;
    if (body !== undefined && body !== null) {
      headers["Content-Type"] = "application/json";
      payload = typeof body === "string" ? body : JSON.stringify(body);
    }

    const controller = new AbortController();
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onAbort = () => controller.abort(signal?.reason);
    if (signal) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    }
    if (this.timeout !== undefined && this.timeout > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, this.timeout);
    }
    // Rejects as soon as the controller aborts, even if the fetch
    // implementation does not honor the signal.
    const aborted = new Promise<never>((_, reject) => {
      if (controller.signal.aborted) {
        reject(controller.signal.reason);
        return;
      }
      controller.signal.addEventListener(
        "abort",
        () => reject(controller.signal.reason),
        { once: true }
      );
    });
    aborted.catch(() => undefined);

    let response: Response;
    let text: string;
    try {
      const run = async () => {
        const res = await this.fetchImpl(this.baseUrl + path, {
          method,
          headers,
          body: payload,
          signal: controller.signal
        });
        return { res, text: await res.text() };
      };
      ({ res: response, text } = await Promise.race([run(), aborted]));
    } catch (error) {
      if (timedOut) {
        throw new KairosDBTimeoutError(this.timeout as number);
      }
      throw error;
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      signal?.removeEventListener("abort", onAbort);
    }

    if (!response.ok) {
      throw new KairosDBClientError(
        `KairosDB HTTP ${response.status}: ${text || "<empty body>"}`,
        response.status,
        text,
        response.statusText
      );
    }

    if (!text) {
      return null as T;
    }

    if (accept === "application/json") {
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    }
    return text as unknown as T;
  }

  private _url(path: string): string {
    return this.apiPath + path;
  }

  async pushMetrics(
    metricBuilder: MetricBuilder,
    options: RequestInitOptions = {}
  ): Promise<void> {
    const payload =
      metricBuilder && typeof metricBuilder.build === "function"
        ? metricBuilder.build()
        : metricBuilder;
    await this._request("POST", this._url("/datapoints"), { ...options, body: payload });
  }

  async query(
    queryBuilder: QueryBuilder,
    options: RequestInitOptions = {}
  ): Promise<QueryResponse> {
    const payload =
      queryBuilder && typeof queryBuilder.build === "function"
        ? queryBuilder.build()
        : queryBuilder;
    return this._request<QueryResponse>("POST", this._url("/datapoints/query"), {
      ...options,
      body: payload
    });
  }

  /**
   * Sends a plain JSON query payload as-is: no builder, no validation and no
   * rewriting, so any KairosDB query feature can be used.
   */
  async queryRaw(
    payload: RawQueryPayload | QueryPayload | string,
    options: RequestInitOptions = {}
  ): Promise<QueryResponse> {
    return this._request<QueryResponse>("POST", this._url("/datapoints/query"), {
      ...options,
      body: payload
    });
  }

  async queryTags(
    queryTagBuilder: QueryTagBuilder,
    options: RequestInitOptions = {}
  ): Promise<QueryTagsResponse> {
    const payload =
      queryTagBuilder && typeof queryTagBuilder.build === "function"
        ? queryTagBuilder.build()
        : queryTagBuilder;
    return this._request<QueryTagsResponse>("POST", this._url("/datapoints/query/tags"), {
      ...options,
      body: payload
    });
  }

  async getMetricNames(options: RequestInitOptions = {}): Promise<string[]> {
    const data = await this._request<ResultsResponse>("GET", this._url("/metricnames"), options);
    return data?.results ?? [];
  }

  async getTagNames(options: RequestInitOptions = {}): Promise<string[]> {
    const data = await this._request<ResultsResponse>("GET", this._url("/tagnames"), options);
    return data?.results ?? [];
  }

  async getTagValues(name?: string, options: RequestInitOptions = {}): Promise<string[]> {
    const path = name
      ? this._url(`/tagvalues?name=${encodeURIComponent(name)}`)
      : this._url("/tagvalues");
    const data = await this._request<ResultsResponse>("GET", path, options);
    return data?.results ?? [];
  }

  async deleteMetric(name: string, options: RequestInitOptions = {}): Promise<void> {
    if (!name) {
      throw new Error("Metric name is required");
    }
    await this._request("DELETE", this._url(`/metric/${encodeURIComponent(name)}`), options);
  }

  async delete(queryBuilder: QueryBuilder, options: RequestInitOptions = {}): Promise<void> {
    const payload =
      queryBuilder && typeof queryBuilder.build === "function"
        ? queryBuilder.build()
        : queryBuilder;
    await this._request("POST", this._url("/datapoints/delete"), { ...options, body: payload });
  }

  async getStatus(options: RequestInitOptions = {}): Promise<HealthStatus> {
    return this._request<HealthStatus>("GET", this._url("/health/status"), options);
  }

  async getStatusCheck(options: RequestInitOptions = {}): Promise<number> {
    const result = await this._request<string>("GET", this._url("/health/check"), {
      ...options,
      accept: "text/plain"
    });
    const code = Number(result);
    return Number.isNaN(code) ? 204 : code;
  }

  async getVersion(options: RequestInitOptions = {}): Promise<string | VersionResponse> {
    const versionObj = await this._request<VersionResponse>(
      "GET",
      this._url("/version"),
      options
    );
    if (versionObj && typeof versionObj.version === "string") {
      return versionObj.version;
    }
    return versionObj;
  }
}
