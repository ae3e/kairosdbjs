import { Metric } from "./Metric.js";

export class MetricBuilder {
  constructor() {
    this.metrics = [];
    this.compressionEnabled = false;
  }

  static getInstance() {
    return new MetricBuilder();
  }

  addMetric(metricName, registeredType) {
    const metric = new Metric(metricName, registeredType);
    this.metrics.push(metric);
    return metric;
  }

  getMetrics() {
    return this.metrics;
  }

  setCompression(enabled) {
    this.compressionEnabled = !!enabled;
    return this;
  }

  isCompressionEnabled() {
    return this.compressionEnabled;
  }

  build() {
    this.metrics.forEach((metric) => {
      if (!metric.tags || Object.keys(metric.tags).length === 0) {
        throw new Error(`${metric.name} must contain at least one tag.`);
      }
    });
    return this.metrics;
  }
}

