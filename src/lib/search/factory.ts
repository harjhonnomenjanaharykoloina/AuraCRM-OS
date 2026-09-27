import { SearchProvider } from "./interfaces";
import { PostgresqlSearchProvider } from "./postgresql";

let provider: SearchProvider | null = null;

export function getSearchProvider(): SearchProvider {
  if (provider) return provider;

  const searchProvider = (process.env.SEARCH_PROVIDER ?? "postgresql").toLowerCase();

  switch (searchProvider) {
    case "postgresql":
      provider = new PostgresqlSearchProvider();
      break;
    case "elasticsearch":
      throw new Error("Elasticsearch search provider not yet implemented. Set SEARCH_PROVIDER=postgresql");
    case "meilisearch":
      throw new Error("Meilisearch search provider not yet implemented. Set SEARCH_PROVIDER=postgresql");
    default:
      provider = new PostgresqlSearchProvider();
  }

  return provider;
}

export function resetSearchProvider(): void {
  provider = null;
}
