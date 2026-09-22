const FORMULA_PREFIX_PATTERN = /^[\t ]*[=+\-@]/;

export function sanitizeCsvFormula(value: string): string {
    if (FORMULA_PREFIX_PATTERN.test(value)) {
        return `'${value}`;
    }

    return value;
}

export function escapeCsv(value: string): string {
    if (value.includes('"')) {
        value = value.replace(/"/g, '""');
    }

    if (value.includes(",") || value.includes("\n") || value.includes("\r")) {
        return `"${value}"`;
    }

    return value;
}

export function formatCsvCell(value: string): string {
    return escapeCsv(sanitizeCsvFormula(value));
}

export interface CsvField {
    apiName: string;
    label: string;
    type: string;
    picklistOptions?: Array<{ id: number; label: string; isActive?: boolean } | null>;
}

export function resolveCsvCellValue(
    field: CsvField,
    rawValue: unknown,
    lookupResolutions?: Record<string, Record<string, { name: string } | undefined>>,
): string {
    if (rawValue == null) {
        return "";
    }

    if (field.type === "Lookup") {
        const name = lookupResolutions?.[field.apiName]?.[String(rawValue)]?.name;
        return name ?? String(rawValue);
    }

    if (field.type === "Picklist") {
        const id = Number(rawValue);
        const options = field.picklistOptions ?? [];
        for (const option of options) {
            if (option?.id === id) {
                return option.label;
            }
        }
        return rawValue !== null ? String(rawValue) : "";
    }

    if (field.type === "Date") {
        return new Date(rawValue as string).toISOString();
    }

    return String(rawValue);
}

export function buildCsvFromRecords(
    fields: CsvField[],
    records: Record<string, unknown>[],
    lookupResolutions?: Record<string, Record<string, { name: string } | undefined>>,
): string {
    const header = fields.map((field) => formatCsvCell(field.label ?? field.apiName)).join(",");

    if (!records.length) {
        return header;
    }

    const rows = records.map((record) =>
        fields.map((field) =>
            formatCsvCell(resolveCsvCellValue(field, record[field.apiName], lookupResolutions)),
        ).join(","),
    );

    return [header, ...rows].join("\n");
}
