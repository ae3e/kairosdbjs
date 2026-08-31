import { MetricBuilder } from "./MetricBuilder.js";
import { QueryBuilder } from "./QueryBuilder.js";
import { QueryTagBuilder } from "./QueryTagBuilder.js";

export interface KairosDBClientOptions {
  headers?: Record<string, string>;
}

interface RequestOptions {
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

interface TagListResponse {
  results?: string[];
}

export class KairosDBClientError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class KairosDBClient {
  baseUrl: string;
  fetchImpl: typeof fetch;
  defaultHeaders: Record<string, string>;

  constructor(baseUrl: string, options: KairosDBClientOptions = {}) {
    if (!baseUrl) {
      throw new Error("baseUrl is required");
    }
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    if (typeof fetch === "undefined") {
      throw new Error("Global fetch is not available in this environment.");
    }
    this.fetchImpl = fetch;
    this.defaultHeaders = options.headers || {};
  }

  private async _request<T = unknown>(
    method: string,
    path: string,
    { body, accept = "application/json" }: RequestOptions = {}
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

    const response = await this.fetchImpl(this.baseUrl + path, {
      method,
      headers,
      body: payload
    });

    const text = await response.text();
    if (!response.ok) {
      throw new KairosDBClientError(
        `KairosDB HTTP ${response.status}: ${text || "<empty body>"}`,
        response.status,
        text
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

  async pushMetrics(metricBuilder: MetricBuilder): Promise<void> {
    const payload =
      metricBuilder && typeof metricBuilder.build === "function"
        ? metricBuilder.build()
        : metricBuilder;
    await this._request("POST", "/api/v1/datapoints", { body: payload });
  }

  async query(queryBuilder: QueryBuilder): Promise<unknown> {
    const payload =
      queryBuilder && typeof queryBuilder.build === "function"
        ? queryBuilder.build()
        : queryBuilder;
    return this._request("POST", "/api/v1/datapoints/query", { body: payload });
  }

  async queryTags(queryTagBuilder: QueryTagBuilder): Promise<unknown> {
    const payload =
      queryTagBuilder && typeof queryTagBuilder.build === "function"
        ? queryTagBuilder.build()
        : queryTagBuilder;
    return this._request("POST", "/api/v1/datapoints/query/tags", {
      body: payload
    });
  }

  async getMetricNames(): Promise<string[]> {
    return this._request<string[]>("GET", "/api/v1/metricnames");
  }

  async getTagNames(): Promise<string[]> {
    const data = await this._request<TagListResponse>("GET", "/api/v1/tagnames");
    return data?.results ?? [];
  }

  async getTagValues(name?: string): Promise<string[]> {
    const path = name
      ? `/api/v1/tagvalues?name=${encodeURIComponent(name)}`
      : "/api/v1/tagvalues";
    const data = await this._request<TagListResponse>("GET", path);
    return data?.results ?? [];
  }

  async deleteMetric(name: string): Promise<void> {
    if (!name) {
      throw new Error("Metric name is required");
    }
    await this._request("DELETE", `/api/v1/metric/${encodeURIComponent(name)}`);
  }

  async delete(queryBuilder: QueryBuilder): Promise<void> {
    const payload =
      queryBuilder && typeof queryBuilder.build === "function"
        ? queryBuilder.build()
        : queryBuilder;
    await this._request("POST", "/api/v1/datapoints/delete", { body: payload });
  }

  async getStatus(): Promise<HealthStatus> {
    return this._request<HealthStatus>("GET", "/api/v1/health/status");
  }

  async getStatusCheck(): Promise<number> {
    const result = await this._request<string>("GET", "/api/v1/health/check", {
      accept: "text/plain"
    });
    const code = Number(result);
    return Number.isNaN(code) ? 204 : code;
  }

  async getVersion(): Promise<string | VersionResponse> {
    const versionObj = await this._request<VersionResponse>("GET", "/api/v1/version");
    if (versionObj && typeof versionObj.version === "string") {
      return versionObj.version;
    }
    return versionObj;
  }
}
