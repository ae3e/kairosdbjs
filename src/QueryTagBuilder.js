import { AbstractQueryBuilder } from "./AbstractQueryBuilder.js";
import { QueryTagMetric } from "./QueryTagMetric.js";

export class QueryTagBuilder extends AbstractQueryBuilder {
  constructor() {
    super();
    this.metrics = [];
  }

  static getInstance() {
    return new QueryTagBuilder();
  }

  addMetric(name) {
    const metric = new QueryTagMetric(name);
    this.metrics.push(metric);
    return metric;
  }

  build() {
    const timeRange = this._buildTimeRange();
    return {
      ...timeRange,
      metrics: this.metrics
    };
  }
}

