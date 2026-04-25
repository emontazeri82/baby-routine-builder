export { detectDeviation } from "./deviation";
export type {
  DeviationSeverity,
  DeviationResult,
  DeviationInput,
} from "./deviation";

export { detectTrend } from "./trend";
export type { TrendDirection, TrendResult, TrendInput } from "./trend";

export { detectMissed } from "./missed";
export type {
  MissedSeverity,
  MissedResult,
  MissedInput,
} from "./missed";

export { detectConsistency } from "./consistency";
export type {
  ConsistencyLevel,
  ConsistencyResult,
  ConsistencyInput,
} from "./consistency";

export { buildRecommendations } from "./recommendations";
export type { Recommendation, RecommendationInput } from "./recommendations";
