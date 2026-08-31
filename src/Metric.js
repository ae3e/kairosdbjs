export class Metric {
  constructor(name, registeredType) {
    if (!name) {
      throw new Error("Metric name cannot be null or empty");
    }
    this.name = name;
    this.tags = {};
    this.type = registeredType;
    this.ttl = 0;
    this.datapoints = [];
  }

  addTag(name, value) {
    if (!name || !value) {
      throw new Error("Tag name and value cannot be null or empty");
    }
    this.tags[name] = value;
    return this;
  }

  addTags(tags) {
    if (!tags || typeof tags !== "object") {
      throw new Error("tags must be an object");
    }
    Object.assign(this.tags, tags);
    return this;
  }

  addDataPoint(timestamp, value) {
    if (value === undefined || value === null) {
      throw new Error("Data point value cannot be null");
    }

    if (typeof timestamp === "number" && value !== undefined) {
      this.datapoints.push([timestamp, value]);
    } else {
      this.datapoints.push([Date.now(), timestamp]);
    }
    return this;
  }

  addTtl(ttl) {
    if (typeof ttl !== "number" || ttl < 0) {
      throw new Error("ttl must be greater than or equal to zero");
    }
    this.ttl = ttl;
    return this;
  }
}

