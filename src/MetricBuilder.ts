import { Metric } from "./Metric.js";

export class MetricBuilder {
  metrics: Metric[];
  compressionEnabled: boolean;

  constructor() {
    this.metrics = [];
    this.compressionEnabled = false;
  }

  static getInstance(): MetricBuilder {
    return new MetricBuilder();
  }

  addMetric(metricName: string, registeredType?: string): Metric {
    const metric = new Metric(metricName, registeredType);
    this.metrics.push(metric);
    return metric;
  }

  getMetrics(): Metric[] {
    return this.metrics;
  }

  setCompression(enabled: boolean): this {
    this.compressionEnabled = !!enabled;
    return this;
  }

  isCompressionEnabled(): boolean {
    return this.compressionEnabled;
  }

  build(): Metric[] {
    this.metrics.forEach((metric) => {
      if (!metric.tags || Object.keys(metric.tags).length === 0) {
        throw new Error(`${metric.name} must contain at least one tag.`);
      }
    });
    return this.metrics;
  }
}
