export interface SearchableRecord {
  id: number;
  name: string | null;
  updatedAt: Date;
  objectId: number;
  objectApiName: string;
  objectLabel: string;
  rank: number;
}

export interface SearchResult {
  success: boolean;
  results: SearchableRecord[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  error?: string;
}

export interface SearchableObjectDef {
  id: number;
  apiName: string;
  label: string;
  access: { canReadAll: boolean };
}

export interface SearchOptions {
  query: string;
  objectFilter?: string;
  mode?: "exact" | "starts" | "contains" | "full";
  page?: number;
  pageSize?: number;
  userId: number;
  organizationId: number;
  queueIds?: number[];
  userGroupId?: string | null;
  allowedObjects?: SearchableObjectDef[];
}
