import { SearchProvider } from "./interfaces";
import { SearchableRecord, SearchResult, SearchOptions } from "./types";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildRecordAccessSql } from "@/lib/record-access";

export const SEARCHABLE_NAME_FIELD_SQL = Prisma.sql`COALESCE(r."name", '')`;

export class PostgresqlSearchProvider implements SearchProvider {
  name = "postgresql";

  async search(opts: SearchOptions): Promise<SearchResult> {
    const { query, mode, objectFilter, page = 1, pageSize = 25, userId, organizationId, queueIds = [], userGroupId, allowedObjects } = opts;

    if (!query || query.trim().length === 0) {
      return { success: true, results: [], total: 0, page, pageSize, totalPages: 1 };
    }

    // Build tsquery — tokenize, lowercase, join with & (AND)
    const tokens = query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.replace(/[^a-z0-9]+/g, ""));
    const filteredTokens = tokens.filter(Boolean);
    if (filteredTokens.length === 0) {
      return { success: true, results: [], total: 0, page, pageSize, totalPages: 1 };
    }
    const tsQuery = filteredTokens.join(" & ");

    // Filter objects
    const candidateObjects = allowedObjects ?? [];
    const filteredObjects =
      objectFilter && objectFilter !== "all"
        ? candidateObjects.filter((o) => o.apiName === objectFilter)
        : candidateObjects;

    if (filteredObjects.length === 0) {
      return { success: true, results: [], total: 0, page, pageSize, totalPages: 1 };
    }

    const isFullMode = mode === "full";

    const allResults: SearchableRecord[] = [];

    for (const object of filteredObjects) {
      const accessFilter = object.access.canReadAll
        ? Prisma.sql``
        : buildRecordAccessSql(userId, organizationId, queueIds, userGroupId ? Number(userGroupId) : null);

      if (isFullMode) {
        const offset = (page - 1) * pageSize;
        const rows = await db.$queryRaw<
          { id: number; name: string | null; updatedAt: Date; rank: number }[]
        >(Prisma.sql`
          SELECT r.id, r.name, r."updatedAt",
            ts_rank_cd(r.search_vector, to_tsquery('english', ${tsQuery})) AS rank
          FROM "Record" r
          WHERE r."organizationId" = ${organizationId}
            AND r."objectDefId" = ${object.id}
            AND r."isDeleted" = false
            AND r.search_vector @@ to_tsquery('english', ${tsQuery})
            ${accessFilter}
          ORDER BY rank DESC, r."updatedAt" DESC
          LIMIT ${pageSize} OFFSET ${offset};
        `);

        allResults.push(
          ...rows.map(
            (row): SearchableRecord => ({
              id: row.id,
              name: row.name,
              updatedAt: new Date(row.updatedAt),
              objectId: object.id,
              objectApiName: object.apiName,
              objectLabel: object.label,
              rank: Number(row.rank),
            })
          )
        );
      } else {
        const rows = await db.$queryRaw<
          { id: number; name: string | null; updatedAt: Date; rank: number }[]
        >(Prisma.sql`
          SELECT r.id, r.name, r."updatedAt",
            ts_rank_cd(r.search_vector, to_tsquery('english', ${tsQuery})) AS rank
          FROM "Record" r
          WHERE r."organizationId" = ${organizationId}
            AND r."objectDefId" = ${object.id}
            AND r."isDeleted" = false
            AND r.search_vector @@ to_tsquery('english', ${tsQuery})
            ${accessFilter}
          ORDER BY rank DESC, r."updatedAt" DESC
          LIMIT 30;
        `);

        allResults.push(
          ...rows.map(
            (row): SearchableRecord => ({
              id: row.id,
              name: row.name,
              updatedAt: new Date(row.updatedAt),
              objectId: object.id,
              objectApiName: object.apiName,
              objectLabel: object.label,
              rank: Number(row.rank),
            })
          )
        );
      }
    }

    allResults.sort(
      (a, b) => b.rank - a.rank || b.updatedAt.getTime() - a.updatedAt.getTime()
    );

    if (isFullMode) {
      const total = allResults.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const startIndex = (page - 1) * pageSize;
      const paged = allResults.slice(startIndex, startIndex + pageSize);
      return { success: true, results: paged, total, page, pageSize, totalPages };
    }

    return { success: true, results: allResults.slice(0, 30), total: allResults.length };
  }

  async indexRecord(args: { recordId: number; organizationId: number; valueSearch: string; objectDefId: number }): Promise<void> {
    if (!args.valueSearch) return;
    await db.$executeRaw(Prisma.sql`
      UPDATE "Record"
      SET "search_vector" = to_tsvector('english', ${args.valueSearch})
      WHERE "id" = ${args.recordId}
        AND "organizationId" = ${args.organizationId}
        AND "objectDefId" = ${args.objectDefId};
    `);
  }

  async deleteRecordSearch(args: { recordId: number }): Promise<void> {
    await db.$executeRaw(Prisma.sql`
      UPDATE "Record"
      SET "search_vector" = NULL
      WHERE "id" = ${args.recordId};
    `);
  }
}
