"use server";

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getSearchProvider } from "./factory";

export async function syncRecordSearchVector(recordId: number): Promise<void> {
  // Get all searchable field data for this record and concatenate valueSearch values
  const fields = await db.fieldData.findMany({
    where: { recordId, fieldDef: { type: { in: ["Text", "Email", "Phone", "Url", "AutoNumber"] } } },
    select: { valueSearch: true, fieldDef: { select: { type: true } } },
  });

  const provider = getSearchProvider();

  // Also include record.name
  const record = await db.record.findUnique({
    where: { id: recordId },
    select: { name: true, organizationId: true, objectDefId: true },
  });

  if (!record) return;

  const name = record.name ?? "";
  const fieldValues = fields.map((f) => f.valueSearch ?? "").filter(Boolean);
  const combined = [name, ...fieldValues].join(" ").trim();

  if (combined.length === 0) {
    await provider.deleteRecordSearch({ recordId });
  } else {
    await provider.indexRecord({
      recordId,
      organizationId: record.organizationId,
      valueSearch: combined,
      objectDefId: record.objectDefId,
    });
  }
}

export async function syncAllRecordSearchVectorsBatch(organizationId: number, limit = 1000): Promise<{ processed: number }> {
  let processed = 0;

  const recordIds = await db.$queryRaw<{ id: number }[]>(Prisma.sql`
    SELECT id FROM "Record"
    WHERE "organizationId" = ${organizationId}
      AND "isDeleted" = false
      AND "search_vector" IS NULL
    LIMIT ${limit};
  `);

  for (const { id } of recordIds) {
    await syncRecordSearchVector(id);
    processed++;
  }

  return { processed };
}
