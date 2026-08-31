import { AbstractQueryBuilder, TimeRange } from "./AbstractQueryBuilder.js";
import { QueryMetric } from "./QueryMetric.js";

export interface QueryPayload extends TimeRange {
  cache_time?: number;
  time_zone?: string;
  metrics: QueryMetric[];
}

export class QueryBuilder extends AbstractQueryBuilder {
  cache_time?: number;
  time_zone?: string;
  metrics: QueryMetric[];

  constructor() {
    super();
    this.cache_time = undefined;
    this.time_zone = undefined;
    this.metrics = [];
  }

  static getInstance(): QueryBuilder {
    return new QueryBuilder();
  }

  setCacheTime(cacheTime: number): this {
    if (typeof cacheTime !== "number" || cacheTime <= 0) {
      throw new Error("Cache time must be greater than 0.");
    }
    this.cache_time = cacheTime;
    return this;
  }

  addMetric(name: string): QueryMetric {
    const metric = new QueryMetric(name);
    this.metrics.push(metric);
    return metric;
  }

  setTimeZone(tzId: string): this {
    if (!tzId) {
      throw new Error("timezone cannot be null");
    }
    this.time_zone = tzId;
    return this;
  }

  build(): QueryPayload {
    const timeRange = this._buildTimeRange();
    return {
      ...timeRange,
      cache_time: this.cache_time,
      time_zone: this.time_zone,
      metrics: this.metrics
    };
  }
}
