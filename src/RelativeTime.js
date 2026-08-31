export class RelativeTime {
  constructor(value, unit) {
    if (typeof value !== "number" || value <= 0) {
      throw new Error("RelativeTime.value must be a positive number");
    }
    if (!unit) {
      throw new Error("RelativeTime.unit is required");
    }
    this.value = value;
    this.unit = unit;
  }
}

