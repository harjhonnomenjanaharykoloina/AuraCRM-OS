import { SearchResult, SearchOptions } from "./types";

export interface SearchProvider {
  name: string;
  search(opts: SearchOptions): Promise<SearchResult>;
  indexRecord(args: { recordId: number; organizationId: number; valueSearch: string; objectDefId: number }): Promise<void>;
  deleteRecordSearch(args: { recordId: number }): Promise<void>;
}
