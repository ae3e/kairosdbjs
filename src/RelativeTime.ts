import { TimeUnit } from "./TimeUnit.js";

export class RelativeTime {
  value: number;
  unit: TimeUnit;

  constructor(value: number, unit: TimeUnit) {
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
