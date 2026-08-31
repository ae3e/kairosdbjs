import { RelativeTime } from "./RelativeTime.js";
import { TimeUnit } from "./TimeUnit.js";

export interface TimeRange {
  start_absolute?: number;
  end_absolute?: number;
  start_relative?: RelativeTime;
  end_relative?: RelativeTime;
}

export abstract class AbstractQueryBuilder {
  start_absolute?: number;
  end_absolute?: number;
  start_relative?: RelativeTime;
  end_relative?: RelativeTime;

  setStart(absolute: number | Date): this;
  setStart(duration: number, unit: TimeUnit): this;
  setStart(startOrDuration: number | Date, unit?: TimeUnit): this {
    if (startOrDuration instanceof Date || (typeof startOrDuration === "number" && !unit)) {
      if (this.start_relative) {
        throw new Error("Both relative and absolute start times cannot be set.");
      }
      const millis = startOrDuration instanceof Date ? startOrDuration.getTime() : startOrDuration;
      this.start_absolute = millis;
      return this;
    }

    if (typeof startOrDuration === "number" && unit) {
      if (this.start_absolute) {
        throw new Error("Both relative and absolute start times cannot be set.");
      }
      this.start_relative = new RelativeTime(startOrDuration, unit);
      return this;
    }

    throw new Error("Invalid arguments for setStart");
  }

  setEnd(absolute: number | Date): this;
  setEnd(duration: number, unit: TimeUnit): this;
  setEnd(endOrDuration: number | Date, unit?: TimeUnit): this {
    if (endOrDuration instanceof Date || (typeof endOrDuration === "number" && !unit)) {
      if (this.end_relative) {
        throw new Error("Both relative and absolute end times cannot be set.");
      }
      const millis = endOrDuration instanceof Date ? endOrDuration.getTime() : endOrDuration;
      this.end_absolute = millis;
      return this;
    }

    if (typeof endOrDuration === "number" && unit) {
      if (this.end_absolute) {
        throw new Error("Both relative and absolute end times cannot be set.");
      }
      this.end_relative = new RelativeTime(endOrDuration, unit);
      return this;
    }

    throw new Error("Invalid arguments for setEnd");
  }

  protected _buildTimeRange(): TimeRange {
    if (!this.start_absolute && !this.start_relative) {
      throw new Error("Start time is required (absolute or relative).");
    }
    const result: TimeRange = {};
    if (this.start_absolute !== undefined) {
      result.start_absolute = this.start_absolute;
    }
    if (this.end_absolute !== undefined) {
      result.end_absolute = this.end_absolute;
    }
    if (this.start_relative) {
      result.start_relative = this.start_relative;
    }
    if (this.end_relative) {
      result.end_relative = this.end_relative;
    }
    return result;
  }
}
