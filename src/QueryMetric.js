export class QueryMetric {
  constructor(name) {
    if (!name) {
      throw new Error("Metric name cannot be null or empty.");
    }
    this.name = name;
    this.tags = {};
    this.group_by = [];
    this.aggregators = [];
    this.limit = undefined;
    this.order = undefined;
    this.exclude_tags = false;
  }

  addTags(tags) {
    if (!tags || typeof tags !== "object") {
      throw new Error("tags must be an object");
    }
    for (const [key, value] of Object.entries(tags)) {
      this.addTag(key, value);
    }
    return this;
  }

  addTag(name, valueOrValues) {
    if (!name) {
      throw new Error("Tag name cannot be null or empty");
    }
    const values = Array.isArray(valueOrValues) ? valueOrValues : [valueOrValues];
    if (!this.tags[name]) {
      this.tags[name] = [];
    }
    for (const v of values) {
      if (!v) {
        throw new Error("Tag value cannot be null or empty");
      }
      this.tags[name].push(v);
    }
    return this;
  }

  addAggregator(aggregator) {
    if (!aggregator) {
      throw new Error("aggregator cannot be null");
    }
    this.aggregators.push(aggregator);
    return this;
  }

  addGrouper(grouper) {
    if (!grouper) {
      throw new Error("grouper cannot be null");
    }
    this.group_by.push(grouper);
    return this;
  }

  setLimit(limit) {
    if (typeof limit !== "number" || limit <= 0) {
      throw new Error("limit must be greater than 0");
    }
    this.limit = limit;
    return this;
  }

  setOrder(order) {
    if (order !== "asc" && order !== "desc") {
      throw new Error("order must be 'asc' or 'desc'");
    }
    this.order = order;
    return this;
  }

  setExcludeTags(exclude) {
    this.exclude_tags = !!exclude;
    return this;
  }
}

