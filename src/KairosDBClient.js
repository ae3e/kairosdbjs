export class KairosDBClient {
  constructor(baseUrl, options = {}) {
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

  async _request(method, path, { body, accept = "application/json" } = {}) {
    const headers = {
      ...this.defaultHeaders
    };
    if (accept) {
      headers["Accept"] = accept;
    }
    let payload = body;
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
      const error = new Error(
        `KairosDB HTTP ${response.status}: ${text || "<empty body>"}`
      );
      error.status = response.status;
      error.body = text;
      throw error;
    }

    if (!text) {
      return null;
    }

    if (accept === "application/json") {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return text;
  }

  async pushMetrics(metricBuilder) {
    const payload =
      metricBuilder && typeof metricBuilder.build === "function"
        ? metricBuilder.build()
        : metricBuilder;
    await this._request("POST", "/api/v1/datapoints", { body: payload });
  }

  async query(queryBuilder) {
    const payload =
      queryBuilder && typeof queryBuilder.build === "function"
        ? queryBuilder.build()
        : queryBuilder;
    return this._request("POST", "/api/v1/datapoints/query", { body: payload });
  }

  async queryTags(queryTagBuilder) {
    const payload =
      queryTagBuilder && typeof queryTagBuilder.build === "function"
        ? queryTagBuilder.build()
        : queryTagBuilder;
    return this._request("POST", "/api/v1/datapoints/query/tags", {
      body: payload
    });
  }

  async getMetricNames() {
    return this._request("GET", "/api/v1/metricnames");
  }

  async deleteMetric(name) {
    if (!name) {
      throw new Error("Metric name is required");
    }
    await this._request("DELETE", `/api/v1/metric/${encodeURIComponent(name)}`);
  }

  async delete(queryBuilder) {
    const payload =
      queryBuilder && typeof queryBuilder.build === "function"
        ? queryBuilder.build()
        : queryBuilder;
    await this._request("POST", "/api/v1/datapoints/delete", { body: payload });
  }

  async getStatus() {
    return this._request("GET", "/api/v1/health/status");
  }

  async getStatusCheck() {
    const result = await this._request("GET", "/api/v1/health/check", {
      accept: "text/plain"
    });
    const code = Number(result);
    return Number.isNaN(code) ? 204 : code;
  }

  async getVersion() {
    const versionObj = await this._request("GET", "/api/v1/version");
    if (versionObj && typeof versionObj.version === "string") {
      return versionObj.version;
    }
    return versionObj;
  }
}
