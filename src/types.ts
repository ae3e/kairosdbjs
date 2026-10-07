export interface QueryResult {
  name: string;
  tags?: Record<string, string[]>;
  group_by?: unknown[];
  values: [number, unknown][];
  [key: string]: unknown;
}

export interface QueryResponse {
  queries: {
    sample_size: number;
    results: QueryResult[];
    [key: string]: unknown;
  }[];
}

export interface QueryTagsResult {
  name: string;
  tags: Record<string, string[]>;
  [key: string]: unknown;
}

export interface QueryTagsResponse {
  queries: {
    sample_size?: number;
    results: QueryTagsResult[];
    [key: string]: unknown;
  }[];
}

/**
 * Plain JSON query payload, sent as-is by `KairosDBClient.queryRaw`.
 * Unlike `QueryPayload`, metrics are plain objects (not `QueryMetric` instances).
 */
export interface RawQueryPayload {
  start_absolute?: number;
  end_absolute?: number;
  start_relative?: { value: number; unit: string };
  end_relative?: { value: number; unit: string };
  cache_time?: number;
  time_zone?: string;
  metrics: {
    name: string;
    tags?: Record<string, string[]>;
    group_by?: { name: string; [key: string]: unknown }[];
    aggregators?: { name: string; [key: string]: unknown }[];
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
}
