
export interface DeliveryDataRow {
  id?: number;
  report_date: string;
  file_key: string;
  cole: string;
  colf: string;
  cold: string;
  colg: string;
  valueh: number;
  valuei: number;
  valuek: number;
  valuem: number;
  valueo: number;
  colq: number;
  colr: number;
  cols: number;
  colt: number;
}

export interface AggregatedSums {
  sumH: number;
  sumI: number;
  sumK: number;
  sumM: number;
  sumO: number;
  sumQ: number;
  sumS: number;
}

export interface SummaryMetrics {
  H: number;
  I: number;
  K: number;
  M: number;
  O: number;
  Q: number;
  S: number;
  successRate: number;
}

export interface ViewProps {
  active: boolean;
}

export interface ComparisonDiff {
  value?: number;
  percent?: number;
  diff: number;
  direction: "up" | "down" | "neutral" | "no-data";
}

export type SortKey =
  | "successRate"
  | "callSuccessRate"
  | "sumH"
  | "sumM"
  | "sumO"
  | "sumK"
  | "sumI";

export type SortDirection = "asc" | "desc";

export type ProvinceDefinition = {
  key: string;
  label: string;
  codes: Set<string>;
};

export type RegionConfig = {
  regionId: string;
  regionName: string;
  provinces: ProvinceDefinition[];
};
