export type MetricValue = number | string | boolean;
export type DataPoint = [timestamp: number, value: MetricValue];

export class Metric {
  name: string;
  tags: Record<string, string>;
  type?: string;
  ttl: number;
  datapoints: DataPoint[];

  constructor(name: string, registeredType?: string) {
    if (!name) {
      throw new Error("Metric name cannot be null or empty");
    }
    this.name = name;
    this.tags = {};
    this.type = registeredType;
    this.ttl = 0;
    this.datapoints = [];
  }

  addTag(name: string, value: string): this {
    if (!name || !value) {
      throw new Error("Tag name and value cannot be null or empty");
    }
    this.tags[name] = value;
    return this;
  }

  addTags(tags: Record<string, string>): this {
    if (!tags || typeof tags !== "object") {
      throw new Error("tags must be an object");
    }
    Object.assign(this.tags, tags);
    return this;
  }

  addDataPoint(timestamp: number, value: MetricValue): this {
    if (value === undefined || value === null) {
      throw new Error("Data point value cannot be null");
    }
    this.datapoints.push([timestamp, value]);
    return this;
  }

  addTtl(ttl: number): this {
    if (typeof ttl !== "number" || ttl < 0) {
      throw new Error("ttl must be greater than or equal to zero");
    }
    this.ttl = ttl;
    return this;
  }
}
