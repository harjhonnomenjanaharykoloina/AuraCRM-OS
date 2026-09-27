"use server";

import { getRecords } from "./record-actions";
import { buildCsvFromRecords, type CsvField } from "@/lib/csv";

export async function exportRecords(objectApiName: string, listViewId?: number) {
    try {
        const { data, meta } = await getRecords(
            objectApiName,
            1,
            10000,
            undefined,
            "desc",
            listViewId,
            { all: true }
        );

        const fields = (meta.objectDef?.fields ?? []) as CsvField[];
        const csv = buildCsvFromRecords(fields, data, meta.lookupResolutions);

        return {
            success: true,
            csv,
            filename: `${objectApiName}.csv`,
            contentType: "text/csv; charset=utf-8",
        };
    } catch (error: any) {
        return { success: false, error: error?.message ?? "Export failed" };
    }
}
