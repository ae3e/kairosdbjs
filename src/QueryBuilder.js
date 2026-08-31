import { AbstractQueryBuilder } from "./AbstractQueryBuilder.js";
import { QueryMetric } from "./QueryMetric.js";

export class QueryBuilder extends AbstractQueryBuilder {
  constructor() {
    super();
    this.cache_time = undefined;
    this.time_zone = undefined;
    this.metrics = [];
  }

  static getInstance() {
    return new QueryBuilder();
  }

  setCacheTime(cacheTime) {
    if (typeof cacheTime !== "number" || cacheTime <= 0) {
      throw new Error("Cache time must be greater than 0.");
    }
    this.cache_time = cacheTime;
    return this;
  }

  addMetric(name) {
    const metric = new QueryMetric(name);
    this.metrics.push(metric);
    return metric;
  }

  setTimeZone(tzId) {
    if (!tzId) {
      throw new Error("timezone cannot be null");
    }
    this.time_zone = tzId;
    return this;
  }

  build() {
    const timeRange = this._buildTimeRange();
    return {
      ...timeRange,
      cache_time: this.cache_time,
      time_zone: this.time_zone,
      metrics: this.metrics
    };
  }
}

