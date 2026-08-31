import { AbstractQueryBuilder, TimeRange } from "./AbstractQueryBuilder.js";
import { QueryTagMetric } from "./QueryTagMetric.js";

export interface QueryTagPayload extends TimeRange {
  metrics: QueryTagMetric[];
}

export class QueryTagBuilder extends AbstractQueryBuilder {
  metrics: QueryTagMetric[];

  constructor() {
    super();
    this.metrics = [];
  }

  static getInstance(): QueryTagBuilder {
    return new QueryTagBuilder();
  }

  addMetric(name: string): QueryTagMetric {
    const metric = new QueryTagMetric(name);
    this.metrics.push(metric);
    return metric;
  }

  build(): QueryTagPayload {
    const timeRange = this._buildTimeRange();
    return {
      ...timeRange,
      metrics: this.metrics
    };
  }
}
