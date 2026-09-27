export const SEARCH_CONFIG = {
  provider: (process.env.SEARCH_PROVIDER ?? "postgresql") as "postgresql" | "elasticsearch" | "meilisearch",
  elasticsearchUrl: process.env.ELASTICSEARCH_URL,
  enableParallelLikeSearch: true,
} as const;
