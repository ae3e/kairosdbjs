export const TimeUnit = {
  MILLISECONDS: "MILLISECONDS",
  SECONDS: "SECONDS",
  MINUTES: "MINUTES",
  HOURS: "HOURS",
  DAYS: "DAYS",
  WEEKS: "WEEKS",
  MONTHS: "MONTHS",
  YEARS: "YEARS"
} as const;

export type TimeUnit = (typeof TimeUnit)[keyof typeof TimeUnit];
