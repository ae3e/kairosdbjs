export class QueryTagMetric {
  name: string;
  tags: Record<string, string[]>;

  constructor(name: string) {
    if (!name) {
      throw new Error("name cannot be null or empty");
    }
    this.name = name;
    this.tags = {};
  }

  addTags(tags: Record<string, string | string[]>): this {
    if (!tags || typeof tags !== "object") {
      throw new Error("tags must be an object");
    }
    for (const [key, value] of Object.entries(tags)) {
      this.addTag(key, value);
    }
    return this;
  }

  addTag(name: string, valueOrValues: string | string[]): this {
    if (!name) {
      throw new Error("name cannot be null or empty");
    }
    const values = Array.isArray(valueOrValues) ? valueOrValues : [valueOrValues];
    if (!values.length) {
      throw new Error("value must be provided");
    }
    if (!this.tags[name]) {
      this.tags[name] = [];
    }
    for (const v of values) {
      if (!v) {
        throw new Error("value cannot be null or empty");
      }
      this.tags[name].push(v);
    }
    return this;
  }
}
